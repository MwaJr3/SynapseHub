"""Main InsightOS-styled PyQt6 desktop window for VDownloader OS."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yt_dlp
from PyQt6.QtCore import Qt, QThread, pyqtSignal
from PyQt6.QtGui import QCloseEvent, QIcon, QKeySequence, QShortcut
from PyQt6.QtWidgets import (
    QApplication,
    QCheckBox,
    QComboBox,
    QFileDialog,
    QFrame,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPlainTextEdit,
    QProgressBar,
    QPushButton,
    QStackedWidget,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from ..core.clipboard_monitor import ClipboardMonitor
from ..core.downloader import (
    DownloadOptions,
    DownloadQueueManager,
    DownloadTask,
    FormatChoice,
    VideoDownloader,
    VideoMetadata,
)
from ..core.telemetry import TelemetryStore
from ..core.url_handler import PlatformInfo, URLHandler
from ..server.websocket_server import BrowserEvent, ExtensionWebSocketServer
from ..utils.config import AppConfig, ConfigManager
from ..utils.logger import AppLogger, LogEntry, get_logger
from ..utils.system_tray import SystemTrayController, send_desktop_notification
from .dashboards_tab import AdaptedTelemetryView, AnalyticalBoardView
from .mini_taskbar import MiniTaskbarWindow
from .settings_dialog import SettingsDialog
from .theme import ThemeManager
from .transcript_tab import TranscriptTab

logger = get_logger("gui")


class InfoFetchWorker(QThread):
    """Background worker retrieving video metadata, resolutions, and subtitle tracks."""

    succeeded = pyqtSignal(object)  # VideoMetadata
    failed = pyqtSignal(str)

    def __init__(self, url: str, ffmpeg_path: str | None = None) -> None:
        super().__init__()
        self._url = url
        self._ffmpeg_path = ffmpeg_path

    def run(self) -> None:
        try:
            downloader = VideoDownloader(ffmpeg_path=self._ffmpeg_path)
            meta = downloader.fetch_info(self._url)
            self.succeeded.emit(meta)
        except Exception as exc:
            self.failed.emit(str(exc))


class MainWindow(QMainWindow):
    """Primary desktop application window combining downloader, transcripts, and dashboards."""

    browserEventReceived = pyqtSignal(object)  # BrowserEvent
    clipboardUrlDetected = pyqtSignal(str, object)  # (url, PlatformInfo)
    taskUpdatedSignal = pyqtSignal(object)  # DownloadTask
    taskFinishedSignal = pyqtSignal(object, bool)  # (DownloadTask, succeeded)
    logEntryReceived = pyqtSignal(object)  # LogEntry

    def __init__(
        self,
        config_manager: ConfigManager,
        telemetry: TelemetryStore,
        ws_server: ExtensionWebSocketServer | None = None,
    ) -> None:
        super().__init__()
        self._config = config_manager
        self._telemetry = telemetry
        self._ws_server = ws_server
        self._force_quit = False
        self._resources_dir = Path(__file__).resolve().parent / "resources"
        self._current_metadata: VideoMetadata | None = None
        self._info_worker: InfoFetchWorker | None = None
        self._task_row_map: dict[str, int] = {}

        self.setWindowTitle("VDownloader OS — Video Downloader, Transcripts & Analytical Board")
        self.resize(1340, 860)
        icon_file = self._resources_dir / "app_icon.png"
        if icon_file.is_file():
            self.setWindowIcon(QIcon(str(icon_file)))

        # Queue manager & background monitors
        self.queue_manager = DownloadQueueManager(
            config_manager=self._config,
            telemetry=self._telemetry,
            on_task_finished=lambda task, ok: self.taskFinishedSignal.emit(task, ok),
        )
        self.queue_manager.subscribe(lambda task: self.taskUpdatedSignal.emit(task))

        self.mini_taskbar = MiniTaskbarWindow(
            timeout_seconds=self._config.config.mini_taskbar_timeout_sec,
            resources_dir=self._resources_dir,
        )
        self.mini_taskbar.downloadRequested.connect(self._accept_mini_taskbar_download)

        self.clipboard_monitor = ClipboardMonitor(
            on_video_url_detected=lambda u, p: self.clipboardUrlDetected.emit(u, p),
            poll_interval_sec=self._config.config.clipboard_poll_interval_ms / 1000.0,
            enabled=self._config.config.clipboard_monitor_enabled,
        )

        self._build_layout()
        self._apply_theme(self._config.config.theme_mode)

        # Wire cross-thread signals
        self.browserEventReceived.connect(self._on_browser_video_event)
        self.clipboardUrlDetected.connect(self._on_clipboard_video_url)
        self.taskUpdatedSignal.connect(self._on_task_updated)
        self.taskFinishedSignal.connect(self._on_task_finished)
        self.logEntryReceived.connect(self._append_log_entry)

        AppLogger.instance().ring_handler.subscribe(lambda e: self.logEntryReceived.emit(e))
        self._config.subscribe(self._on_config_changed)

        # System Tray
        self.tray = SystemTrayController(
            parent_window=self,
            on_toggle_window=self.toggle_visibility,
            on_check_updates=self.check_for_updates,
            on_exit_app=self.quit_application,
            on_show_mini_taskbar=self._demo_mini_taskbar,
            icon_path=icon_file,
        )

        # Shortcut: Ctrl+Space / Meta+Space focuses quick URL bar
        shortcut = QShortcut(QKeySequence("Ctrl+Space"), self)
        shortcut.activated.connect(self.global_search_input.setFocus)

        self.clipboard_monitor.start()
        self._populate_initial_logs()
        logger.info("MainWindow initialized and ready.")

    def _build_layout(self) -> None:
        central = QWidget(self)
        self.setCentralWidget(central)
        main_hbox = QHBoxLayout(central)
        main_hbox.setContentsMargins(0, 0, 0, 0)
        main_hbox.setSpacing(0)

        # 1. Left Sidebar (InsightOS design)
        sidebar = QFrame()
        sidebar.setObjectName("SidebarFrame")
        sidebar.setFixedWidth(236)
        sb_lay = QVBoxLayout(sidebar)
        sb_lay.setContentsMargins(16, 20, 16, 18)
        sb_lay.setSpacing(6)

        brand = QLabel("◉  VDownloader OS")
        brand.setStyleSheet("font-size: 17px; font-weight: 800; padding: 4px 6px 14px 6px;")
        sb_lay.addWidget(brand)

        sec_main = QLabel("MAIN WORKSPACE")
        sec_main.setStyleSheet("color: #64748B; font-size: 10px; font-weight: 700; padding-left: 8px;")
        sb_lay.addWidget(sec_main)

        self._nav_buttons: list[QPushButton] = []
        nav_items = [
            ("📊  Analytical Board", 0),
            ("⬇  Video Downloader", 1),
            ("📝  Transcript Studio", 2),
            ("📈  Live Metrics", 3),
            ("🌐  Sources & Channels", 4),
            ("🛡  Engine Health", 5),
            ("⚡  UI & Bridge Perf", 6),
            ("🚀  Live Changelog", 7),
            ("📋  Operation Logs", 8),
        ]
        for label, page_idx in nav_items:
            btn = QPushButton(label)
            btn.setObjectName("NavButton")
            btn.setCursor(Qt.CursorShape.PointingHandCursor)
            btn.clicked.connect(lambda _checked=False, idx=page_idx: self.switch_page(idx))
            sb_lay.addWidget(btn)
            self._nav_buttons.append(btn)

        sb_lay.addStretch(1)

        sec_other = QLabel("SYSTEM")
        sec_other.setStyleSheet("color: #64748B; font-size: 10px; font-weight: 700; padding-left: 8px;")
        sb_lay.addWidget(sec_other)

        settings_btn = QPushButton("⚙  Settings")
        settings_btn.setObjectName("NavButton")
        settings_btn.clicked.connect(self.open_settings_dialog)
        sb_lay.addWidget(settings_btn)

        tray_btn = QPushButton("↘  Minimize to Tray")
        tray_btn.setObjectName("NavButton")
        tray_btn.clicked.connect(self.hide)
        sb_lay.addWidget(tray_btn)

        main_hbox.addWidget(sidebar)

        # 2. Right Workspace Area (Top Header + Stacked Pages)
        right_wrap = QWidget()
        right_lay = QVBoxLayout(right_wrap)
        right_lay.setContentsMargins(22, 16, 22, 18)
        right_lay.setSpacing(14)

        # Top Header Bar
        top_bar = QHBoxLayout()
        top_bar.setSpacing(10)

        self.global_search_input = QLineEdit()
        self.global_search_input.setPlaceholderText(
            "Paste video URL anywhere or press Enter to inspect...  (Ctrl+Space)"
        )
        self.global_search_input.returnPressed.connect(self._handle_global_url_enter)
        top_bar.addWidget(self.global_search_input, stretch=1)

        ws_port = self._ws_server.port if self._ws_server else self._config.config.websocket_port
        self.bridge_pill = QLabel(f"● Bridge ws://127.0.0.1:{ws_port}")
        self.bridge_pill.setStyleSheet(
            "color: #10B981; font-size: 11px; font-weight: 700; padding: 6px 12px; "
            "border: 1px solid rgba(16,185,129,0.35); border-radius: 999px;"
        )
        top_bar.addWidget(self.bridge_pill)

        mini_demo_btn = QPushButton("🪟 Preview Mini-Taskbar")
        mini_demo_btn.clicked.connect(self._demo_mini_taskbar)
        top_bar.addWidget(mini_demo_btn)

        self.theme_toggle_btn = QPushButton("🌙 / ☀ Theme")
        self.theme_toggle_btn.clicked.connect(self._cycle_theme)
        top_bar.addWidget(self.theme_toggle_btn)

        right_lay.addLayout(top_bar)

        # Stacked Pages
        self.stack = QStackedWidget()

        self.analytical_board = AnalyticalBoardView(self._telemetry)
        self.analytical_board.quickInspectRequested.connect(self._jump_to_downloader_with_url)
        self.analytical_board.quickTranscriptRequested.connect(self._jump_to_transcript_with_url)
        self.stack.addWidget(self.analytical_board)  # 0

        self.downloader_page = self._build_downloader_page()
        self.stack.addWidget(self.downloader_page)  # 1

        self.transcript_tab = TranscriptTab(self._config, telemetry=self._telemetry)
        self.transcript_tab.transcriptExtracted.connect(lambda _r: self._refresh_all_dashboards())
        self.stack.addWidget(self.transcript_tab)  # 2

        self.live_metrics_view = AdaptedTelemetryView("live_metrics", self._telemetry)
        self.stack.addWidget(self.live_metrics_view)  # 3

        self.sources_hub_view = AdaptedTelemetryView("sources_hub", self._telemetry)
        self.stack.addWidget(self.sources_hub_view)  # 4

        self.engine_health_view = AdaptedTelemetryView("engine_health", self._telemetry)
        self.stack.addWidget(self.engine_health_view)  # 5

        self.ui_perf_view = AdaptedTelemetryView("ui_performance", self._telemetry)
        self.stack.addWidget(self.ui_perf_view)  # 6

        self.changelog_view = AdaptedTelemetryView(
            "changelog", self._telemetry, on_check_updates=self.check_for_updates
        )
        self.stack.addWidget(self.changelog_view)  # 7

        self.logs_page = self._build_logs_page()
        self.stack.addWidget(self.logs_page)  # 8

        right_lay.addWidget(self.stack, stretch=1)
        main_hbox.addWidget(right_wrap, stretch=1)

        self.switch_page(0)

    def _build_downloader_page(self) -> QWidget:
        page = QWidget()
        lay = QVBoxLayout(page)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.setSpacing(14)

        # 1. URL + Platform Detection + Format & Subtitle Options Card
        ctrl_card = QFrame()
        ctrl_card.setObjectName("CardSurface")
        c_lay = QVBoxLayout(ctrl_card)
        c_lay.setContentsMargins(18, 16, 18, 16)
        c_lay.setSpacing(12)

        hdr_row = QHBoxLayout()
        hdr_lbl = QLabel("Universal Stream Downloader (144p – 8K & Lossless Audio)")
        hdr_lbl.setStyleSheet("font-size: 16px; font-weight: 700;")
        hdr_row.addWidget(hdr_lbl)
        hdr_row.addStretch(1)

        self.platform_detect_lbl = QLabel("Platform: Auto-detect ready")
        self.platform_detect_lbl.setStyleSheet(
            "font-size: 12px; font-weight: 700; color: #C6FF33; padding: 4px 10px; "
            "background: #141E18; border-radius: 999px;"
        )
        hdr_row.addWidget(self.platform_detect_lbl)
        c_lay.addLayout(hdr_row)

        url_row = QHBoxLayout()
        url_row.setSpacing(10)
        self.dl_url_input = QLineEdit()
        self.dl_url_input.setPlaceholderText(
            "Paste YouTube, Facebook, TikTok, Crunchyroll, HiAnime, Twitch, or X video URL..."
        )
        self.dl_url_input.textChanged.connect(self._on_dl_url_edited)
        self.dl_url_input.returnPressed.connect(self.fetch_stream_info)
        url_row.addWidget(self.dl_url_input, stretch=1)

        self.fetch_info_btn = QPushButton("🔍 Fetch Info")
        self.fetch_info_btn.clicked.connect(self.fetch_stream_info)
        url_row.addWidget(self.fetch_info_btn)

        self.quick_transcript_jump_btn = QPushButton("📝 Transcript")
        self.quick_transcript_jump_btn.clicked.connect(
            lambda: self._jump_to_transcript_with_url(self.dl_url_input.text().strip())
        )
        url_row.addWidget(self.quick_transcript_jump_btn)
        c_lay.addLayout(url_row)

        self.stream_summary_lbl = QLabel(
            "Tip: Click 'Fetch Info' to inspect exact resolutions, FPS, codecs, and subtitle languages, "
            "or click 'Download Now' directly."
        )
        self.stream_summary_lbl.setWordWrap(True)
        self.stream_summary_lbl.setStyleSheet("color: #94A3B8; font-size: 12px;")
        c_lay.addWidget(self.stream_summary_lbl)

        # Format + Subtitle Lang Row
        fmt_row = QHBoxLayout()
        fmt_row.setSpacing(10)
        fmt_row.addWidget(QLabel("Format / Quality:"))

        self.format_combo = QComboBox()
        self._populate_default_formats()
        fmt_row.addWidget(self.format_combo, stretch=2)

        fmt_row.addWidget(QLabel("Subtitle Lang:"))
        self.dl_sub_lang_combo = QComboBox()
        self.dl_sub_lang_combo.setEditable(True)
        for code in ("en", "es", "fr", "de", "ja", "ko", "pt", "zh", "ar"):
            self.dl_sub_lang_combo.addItem(code)
        self.dl_sub_lang_combo.setCurrentText(self._config.config.default_subtitle_lang)
        fmt_row.addWidget(self.dl_sub_lang_combo)
        c_lay.addLayout(fmt_row)

        # Subtitle Checkboxes Row
        subs_row = QHBoxLayout()
        subs_row.setSpacing(16)
        cfg = self._config.config

        self.embed_subs_chk = QCheckBox("Embed subtitles (soft track)")
        self.embed_subs_chk.setChecked(cfg.embed_subtitles_default)
        subs_row.addWidget(self.embed_subs_chk)

        self.hardcode_subs_chk = QCheckBox("Burn / Hardcode subtitles (FFmpeg)")
        self.hardcode_subs_chk.setChecked(cfg.hardcode_subtitles_default)
        subs_row.addWidget(self.hardcode_subs_chk)

        self.separate_subs_chk = QCheckBox("Save separate .srt file")
        self.separate_subs_chk.setChecked(cfg.save_separate_subtitles_default)
        subs_row.addWidget(self.separate_subs_chk)

        self.auto_subs_dl_chk = QCheckBox("Include auto-generated captions")
        self.auto_subs_dl_chk.setChecked(cfg.auto_subtitles_default)
        subs_row.addWidget(self.auto_subs_dl_chk)
        subs_row.addStretch(1)
        c_lay.addLayout(subs_row)

        # Output Folder + Start Download Row
        out_row = QHBoxLayout()
        out_row.setSpacing(10)
        out_row.addWidget(QLabel("Output Folder:"))

        self.out_dir_input = QLineEdit(cfg.download_dir)
        out_row.addWidget(self.out_dir_input, stretch=1)

        choose_dir_btn = QPushButton("Folder...")
        choose_dir_btn.clicked.connect(self._choose_output_dir)
        out_row.addWidget(choose_dir_btn)

        self.start_download_btn = QPushButton("⬇ Download Now")
        self.start_download_btn.setObjectName("PrimaryButton")
        self.start_download_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.start_download_btn.clicked.connect(self.enqueue_current_download)
        out_row.addWidget(self.start_download_btn)

        c_lay.addLayout(out_row)
        lay.addWidget(ctrl_card)

        # 2. Multi-Download Queue Card
        q_card = QFrame()
        q_card.setObjectName("CardSurface")
        q_lay = QVBoxLayout(q_card)
        q_lay.setContentsMargins(18, 16, 18, 16)
        q_lay.setSpacing(10)

        q_hdr = QLabel("Active & Completed Download Queue")
        q_hdr.setStyleSheet("font-size: 14px; font-weight: 700;")
        q_lay.addWidget(q_hdr)

        self.queue_table = QTableWidget(0, 7)
        self.queue_table.setHorizontalHeaderLabels(
            ["Title", "Source", "Quality", "Progress", "Speed", "ETA", "Status / Action"]
        )
        self.queue_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        self.queue_table.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeMode.Fixed)
        self.queue_table.setColumnWidth(3, 180)
        for col in (1, 2, 4, 5, 6):
            self.queue_table.horizontalHeader().setSectionResizeMode(
                col, QHeaderView.ResizeMode.ResizeToContents
            )
        self.queue_table.verticalHeader().setVisible(False)
        q_lay.addWidget(self.queue_table, stretch=1)

        lay.addWidget(q_card, stretch=1)
        return page

    def _build_logs_page(self) -> QWidget:
        page = QFrame()
        page.setObjectName("CardSurface")
        lay = QVBoxLayout(page)
        lay.setContentsMargins(18, 16, 18, 16)
        lay.setSpacing(10)

        top = QHBoxLayout()
        lbl = QLabel("Application & Engine Operation Logs")
        lbl.setStyleSheet("font-size: 16px; font-weight: 700;")
        top.addWidget(lbl)
        top.addStretch(1)

        self.log_level_combo = QComboBox()
        for lv in ("ALL", "INFO", "WARNING", "ERROR"):
            self.log_level_combo.addItem(lv, lv)
        self.log_level_combo.currentIndexChanged.connect(self._populate_initial_logs)
        top.addWidget(self.log_level_combo)

        clear_btn = QPushButton("Clear View")
        clear_btn.clicked.connect(lambda: self.logs_editor.clear())
        top.addWidget(clear_btn)
        lay.addLayout(top)

        log_path_lbl = QLabel(f"Log file: {AppLogger.instance().log_file}")
        log_path_lbl.setStyleSheet("color: #64748B; font-size: 11px;")
        lay.addWidget(log_path_lbl)

        self.logs_editor = QPlainTextEdit()
        self.logs_editor.setReadOnly(True)
        self.logs_editor.setStyleSheet(
            "font-family: 'JetBrains Mono', 'Consolas', monospace; font-size: 12px;"
        )
        lay.addWidget(self.logs_editor, stretch=1)
        return page

    def _populate_default_formats(self) -> None:
        self.format_combo.clear()
        presets = [
            FormatChoice("best", "Best Available (Up to 8K Video + Audio)", "bestvideo+bestaudio/best", "mp4", "Best", 9999, 60, "auto", "auto"),
            FormatChoice("4320p", "8K UHD (4320p MP4/MKV)", "bestvideo[height<=4320]+bestaudio/best[height<=4320]", "mkv", "4320p", 4320, 60, "av1/vp9", "opus"),
            FormatChoice("2160p", "4K UHD (2160p MP4)", "bestvideo[height<=2160]+bestaudio/best[height<=2160]", "mp4", "2160p", 2160, 60, "vp9/h264", "aac"),
            FormatChoice("1440p", "2K QHD (1440p MP4)", "bestvideo[height<=1440]+bestaudio/best[height<=1440]", "mp4", "1440p", 1440, 60, "vp9/h264", "aac"),
            FormatChoice("1080p", "Full HD (1080p MP4)", "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]", "mp4", "1080p", 1080, 60, "h264", "aac"),
            FormatChoice("720p", "HD (720p MP4)", "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]", "mp4", "720p", 720, 30, "h264", "aac"),
            FormatChoice("480p", "SD (480p MP4)", "bestvideo[height<=480]+bestaudio/best[height<=480]", "mp4", "480p", 480, 30, "h264", "aac"),
            FormatChoice("360p", "Data Saver (360p MP4)", "bestvideo[height<=360]+bestaudio/best[height<=360]", "mp4", "360p", 360, 30, "h264", "aac"),
            FormatChoice("144p", "Ultra Low (144p MP4)", "bestvideo[height<=144]+bestaudio/best[height<=144]", "mp4", "144p", 144, 30, "h264", "aac"),
            FormatChoice("audio_mp3", "Audio Only — MP3 (320 kbps)", "bestaudio/best", "mp3", "Audio MP3", 0, 0, "none", "mp3", audio_only="mp3"),
            FormatChoice("audio_m4a", "Audio Only — M4A (AAC)", "bestaudio[ext=m4a]/bestaudio/best", "m4a", "Audio M4A", 0, 0, "none", "m4a", audio_only="m4a"),
        ]
        for choice in presets:
            self.format_combo.addItem(choice.label, choice)

    def switch_page(self, index: int) -> None:
        self.stack.setCurrentIndex(index)
        for i, btn in enumerate(self._nav_buttons):
            btn.setProperty("active", "true" if i == index else "false")
            btn.style().unpolish(btn)
            btn.style().polish(btn)
        self._refresh_all_dashboards()

    def _refresh_all_dashboards(self) -> None:
        active_cnt = sum(
            1
            for t in self.queue_manager.list_tasks()
            if t.progress.status in {"queued", "downloading", "postprocessing", "retrying"}
        )
        self.analytical_board.refresh_metrics(active_queue_count=active_cnt)
        self.live_metrics_view.refresh_metrics(active_queue_count=active_cnt)
        self.sources_hub_view.refresh_metrics(active_queue_count=active_cnt)
        self.engine_health_view.refresh_metrics(active_queue_count=active_cnt)
        self.ui_perf_view.refresh_metrics(active_queue_count=active_cnt)
        self.changelog_view.refresh_metrics(active_queue_count=active_cnt)

    def _on_dl_url_edited(self, text: str) -> None:
        info = URLHandler.detect_platform(text)
        if not text.strip():
            self.platform_detect_lbl.setText("Platform: Auto-detect ready")
        elif info.is_supported:
            self.platform_detect_lbl.setText(f"● Source: {info.display_name}")
        else:
            self.platform_detect_lbl.setText("⚠ Unsupported / Malformed URL")

    def _handle_global_url_enter(self) -> None:
        url = self.global_search_input.text().strip()
        if url:
            self._jump_to_downloader_with_url(url)

    def _jump_to_downloader_with_url(self, url: str) -> None:
        if not url:
            return
        self.switch_page(1)
        self.dl_url_input.setText(url)
        self.fetch_stream_info()

    def _jump_to_transcript_with_url(self, url: str) -> None:
        self.switch_page(2)
        if url:
            self.transcript_tab.set_url_and_extract(url)

    def fetch_stream_info(self) -> None:
        url = self.dl_url_input.text().strip()
        if not URLHandler.is_valid_http_url(url):
            QMessageBox.warning(self, "Invalid URL", "Please enter a valid HTTP/HTTPS stream URL.")
            return

        if self._info_worker is not None and self._info_worker.isRunning():
            return

        self.fetch_info_btn.setEnabled(False)
        self.fetch_info_btn.setText("Fetching...")
        self.stream_summary_lbl.setText("Querying yt-dlp stream manifest & subtitle tracks...")

        self._info_worker = InfoFetchWorker(url, ffmpeg_path=self._config.get_ffmpeg_executable())
        self._info_worker.succeeded.connect(self._on_info_fetched)
        self._info_worker.failed.connect(self._on_info_failed)
        self._info_worker.start()

    def _on_info_fetched(self, meta: VideoMetadata) -> None:
        self._current_metadata = meta
        self.fetch_info_btn.setEnabled(True)
        self.fetch_info_btn.setText("🔍 Fetch Info")

        self.format_combo.clear()
        for choice in meta.formats:
            self.format_combo.addItem(choice.label, choice)

        all_subs = sorted(set(meta.manual_subtitles + meta.auto_subtitles))
        if all_subs:
            current_lang = self.dl_sub_lang_combo.currentText()
            self.dl_sub_lang_combo.clear()
            for code in all_subs[:30]:
                self.dl_sub_lang_combo.addItem(code)
            if current_lang in all_subs:
                self.dl_sub_lang_combo.setCurrentText(current_lang)

        self.stream_summary_lbl.setText(
            f"✓ {meta.title}  •  Uploader: {meta.uploader}  •  "
            f"Formats: {len(meta.formats)}  •  Manual Subs: {len(meta.manual_subtitles)}  •  "
            f"Auto Captions: {len(meta.auto_subtitles)}  ({meta.fetch_elapsed_sec:.2f}s)"
        )
        self._telemetry.record_latency("metadata_fetch", meta.fetch_elapsed_sec)
        self._refresh_all_dashboards()

    def _on_info_failed(self, err_msg: str) -> None:
        self.fetch_info_btn.setEnabled(True)
        self.fetch_info_btn.setText("🔍 Fetch Info")
        self.stream_summary_lbl.setText(f"⚠ {err_msg}")
        QMessageBox.warning(self, "Stream Info Error", err_msg)

    def _choose_output_dir(self) -> None:
        chosen = QFileDialog.getExistingDirectory(
            self, "Select Output Directory", self.out_dir_input.text()
        )
        if chosen:
            self.out_dir_input.setText(chosen)

    def enqueue_current_download(self) -> None:
        url = self.dl_url_input.text().strip()
        if not URLHandler.is_valid_http_url(url):
            QMessageBox.warning(self, "Invalid URL", "Please enter a valid video URL to download.")
            return

        choice = self.format_combo.currentData()
        fmt_choice = choice if isinstance(choice, FormatChoice) else None
        title_hint = (
            self._current_metadata.title
            if (self._current_metadata and self._current_metadata.url == URLHandler.normalize_url(url))
            else ""
        )

        opts = DownloadOptions(
            url=URLHandler.normalize_url(url),
            output_dir=self.out_dir_input.text().strip() or self._config.config.download_dir,
            format_choice=fmt_choice,
            audio_only=fmt_choice.audio_only if fmt_choice else "",
            subtitle_lang=self.dl_sub_lang_combo.currentText().strip() or "en",
            embed_subtitles=self.embed_subs_chk.isChecked(),
            hardcode_subtitles=self.hardcode_subs_chk.isChecked(),
            save_separate_subtitles=self.separate_subs_chk.isChecked(),
            include_auto_subtitles=self.auto_subs_dl_chk.isChecked(),
            title_hint=title_hint,
        )
        self.queue_manager.enqueue(opts)

    def _on_task_updated(self, task: DownloadTask) -> None:
        row = self._task_row_map.get(task.task_id)
        if row is None:
            row = self.queue_table.rowCount()
            self.queue_table.insertRow(row)
            self._task_row_map[task.task_id] = row
            pbar = QProgressBar()
            pbar.setRange(0, 100)
            self.queue_table.setCellWidget(row, 3, pbar)

            cancel_btn = QPushButton("Cancel")
            cancel_btn.clicked.connect(
                lambda _checked=False, tid=task.task_id: self.queue_manager.cancel(tid)
            )
            self.queue_table.setCellWidget(row, 6, cancel_btn)

        self.queue_table.setItem(row, 0, QTableWidgetItem(task.title))
        self.queue_table.setItem(row, 1, QTableWidgetItem(task.platform_name))
        self.queue_table.setItem(row, 2, QTableWidgetItem(task.resolution_label))

        pbar_widget = self.queue_table.cellWidget(row, 3)
        if isinstance(pbar_widget, QProgressBar):
            pbar_widget.setValue(int(round(task.progress.percent)))

        self.queue_table.setItem(row, 4, QTableWidgetItem(task.progress.speed_human))
        self.queue_table.setItem(row, 5, QTableWidgetItem(task.progress.eta_human))

        if task.progress.status in {"completed", "failed", "cancelled"}:
            self.queue_table.removeCellWidget(row, 6)
            self.queue_table.setItem(row, 6, QTableWidgetItem(task.progress.message))

    def _on_task_finished(self, task: DownloadTask, succeeded: bool) -> None:
        self._refresh_all_dashboards()
        cfg = self._config.config
        if succeeded:
            send_desktop_notification(
                "Download Complete",
                f"{task.title} ({task.resolution_label})",
                tray_controller=self.tray,
                enabled=cfg.desktop_notifications_enabled,
            )
        else:
            send_desktop_notification(
                "Download Failed",
                f"{task.title}: {task.progress.error}",
                tray_controller=self.tray,
                enabled=cfg.desktop_notifications_enabled,
            )

    def _on_browser_video_event(self, event: BrowserEvent) -> None:
        self.clipboard_monitor.mark_seen(event.url)
        if event.trigger in {"hover_button", "popup_manual"}:
            self._accept_mini_taskbar_download(event.url, event.title)
            return
        if self._config.config.mini_taskbar_enabled:
            self.mini_taskbar.popup_for_video(
                url=event.url,
                title=event.title,
                thumbnail_url=event.thumbnail_url,
                platform=event.platform,
            )

    def _on_clipboard_video_url(self, url: str, platform: PlatformInfo) -> None:
        cfg = self._config.config
        send_desktop_notification(
            f"{platform.display_name} Link Copied",
            f"Detected stream URL: {url[:80]}",
            tray_controller=self.tray,
            enabled=cfg.desktop_notifications_enabled,
        )
        if cfg.mini_taskbar_enabled:
            self.mini_taskbar.popup_for_video(
                url=url,
                title=f"Clipboard {platform.display_name} Video Ready",
                platform=platform,
            )

    def _accept_mini_taskbar_download(self, url: str, _title: str) -> None:
        self.showNormal()
        self.raise_()
        self.activateWindow()
        self._jump_to_downloader_with_url(url)

    def _demo_mini_taskbar(self) -> None:
        sample_url = (
            self.dl_url_input.text().strip()
            or "https://www.youtube.com/watch?v=aqz-KE-bpKQ"
        )
        platform = URLHandler.detect_platform(sample_url)
        self.mini_taskbar.popup_for_video(
            url=sample_url,
            title="Big Buck Bunny 60fps 4K — IDM Floating Mini-Taskbar Preview",
            platform=platform,
        )

    def open_settings_dialog(self) -> None:
        dlg = SettingsDialog(self._config, parent=self)
        dlg.exec()

    def _on_config_changed(self, cfg: AppConfig) -> None:
        self._apply_theme(cfg.theme_mode)
        self.out_dir_input.setText(cfg.download_dir)
        self.mini_taskbar.set_timeout_seconds(cfg.mini_taskbar_timeout_sec)
        self.clipboard_monitor.enabled = cfg.clipboard_monitor_enabled

    def _cycle_theme(self) -> None:
        cur = self._config.config.theme_mode
        nxt = "light" if cur == "dark" else ("system" if cur == "light" else "dark")
        self._config.update(theme_mode=nxt)

    def _apply_theme(self, mode: str) -> None:
        app = QApplication.instance()
        if isinstance(app, QApplication):
            app.setStyleSheet(ThemeManager.build_stylesheet(mode))
        self.theme_toggle_btn.setText(f"Theme: {mode.title()}")

    def _populate_initial_logs(self) -> None:
        lv = str(self.log_level_combo.currentData() or "ALL")
        entries = AppLogger.instance().ring_handler.get_recent(limit=300, level_filter=lv)
        self.logs_editor.setPlainText("\n".join(e.format_line() for e in entries))

    def _append_log_entry(self, entry: LogEntry) -> None:
        lv = str(self.log_level_combo.currentData() or "ALL")
        if lv != "ALL" and entry.level != lv:
            return
        self.logs_editor.appendPlainText(entry.format_line())

    def toggle_visibility(self) -> None:
        if self.isVisible() and not self.isMinimized():
            self.hide()
        else:
            self.showNormal()
            self.raise_()
            self.activateWindow()

    def check_for_updates(self) -> None:
        QMessageBox.information(
            self,
            "VDownloader OS Updates",
            f"VDownloader OS v2.4.0 is up to date.\n"
            f"Active yt-dlp engine: v{yt_dlp.version.__version__}",
        )

    def quit_application(self) -> None:
        self._force_quit = True
        self.mini_taskbar.dismiss_panel()
        self.clipboard_monitor.stop()
        self.queue_manager.shutdown()
        self.tray.shutdown()
        if self._ws_server is not None:
            self._ws_server.stop()
        app = QApplication.instance()
        if app is not None:
            app.quit()

    def closeEvent(self, event: QCloseEvent) -> None:
        if (
            not self._force_quit
            and self._config.config.minimize_to_tray_on_close
            and self.tray.is_available
        ):
            event.ignore()
            self.hide()
            self.tray.show_tray_message(
                "VDownloader OS Still Active",
                "Minimized to system tray — browser mini-taskbar & clipboard watch remain active.",
            )
            return
        self.quit_application()
        event.accept()
