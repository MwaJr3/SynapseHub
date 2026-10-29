"""Settings & Configuration dialog for VDownloader OS."""

from __future__ import annotations

from PyQt6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QDialog,
    QFileDialog,
    QFormLayout,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QSpinBox,
    QVBoxLayout,
    QWidget,
)

from ..utils.config import ConfigManager, probe_ffmpeg_version


class SettingsDialog(QDialog):
    """Modal configuration dialog allowing users to tune downloads, theme, and WS bridge."""

    def __init__(self, config_manager: ConfigManager, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._config = config_manager
        self.setWindowTitle("VDownloader OS — Settings & Configuration")
        self.setMinimumWidth(560)
        self._build_ui()
        self._load_values()

    def _build_ui(self) -> None:
        root = QVBoxLayout(self)
        root.setContentsMargins(20, 20, 20, 20)
        root.setSpacing(14)

        title = QLabel("Preferences & Engine Settings")
        title.setStyleSheet("font-size: 18px; font-weight: 700;")
        root.addWidget(title)

        card = QFrame()
        card.setObjectName("CardSurface")
        form = QFormLayout(card)
        form.setContentsMargins(18, 18, 18, 18)
        form.setSpacing(12)

        # Output folder
        dir_row = QHBoxLayout()
        self.download_dir_edit = QLineEdit()
        dir_row.addWidget(self.download_dir_edit, stretch=1)
        browse_btn = QPushButton("Browse...")
        browse_btn.clicked.connect(self._browse_folder)
        dir_row.addWidget(browse_btn)
        form.addRow("Download Folder:", dir_row)

        # Default format
        self.format_combo = QComboBox()
        for val, label in [
            ("best", "Best Video + Audio (Automatic)"),
            ("ask", "Ask / Manual Format Selection Every Time"),
            ("2160p", "4K UHD (2160p MP4)"),
            ("1080p", "Full HD (1080p MP4)"),
            ("720p", "HD (720p MP4)"),
            ("audio_mp3", "Audio Only (MP3 320kbps)"),
            ("audio_m4a", "Audio Only (M4A AAC)"),
        ]:
            self.format_combo.addItem(label, val)
        form.addRow("Default Format:", self.format_combo)

        # Default subtitle language
        self.sub_lang_edit = QLineEdit()
        self.sub_lang_edit.setPlaceholderText("en, es, ja, fr...")
        form.addRow("Default Subtitle Language:", self.sub_lang_edit)

        # Theme selection
        self.theme_combo = QComboBox()
        self.theme_combo.addItem("System Default (Auto-Detect OS)", "system")
        self.theme_combo.addItem("Dark Obsidian + Neon Lime", "dark")
        self.theme_combo.addItem("Light InsightOS Crisp", "light")
        form.addRow("UI Theme:", self.theme_combo)

        # Mini-taskbar toggle & timeout
        self.mini_taskbar_chk = QCheckBox("Enable IDM-style floating mini-taskbar popup")
        form.addRow("Mini-Taskbar:", self.mini_taskbar_chk)

        self.mini_timeout_spin = QSpinBox()
        self.mini_timeout_spin.setRange(5, 120)
        self.mini_timeout_spin.setSuffix(" sec")
        form.addRow("Mini-Taskbar Auto-Dismiss:", self.mini_timeout_spin)

        # Clipboard fallback
        self.clipboard_chk = QCheckBox("Monitor clipboard for copied video URLs (extension fallback)")
        form.addRow("Clipboard Watcher:", self.clipboard_chk)

        # Minimize to tray
        self.tray_close_chk = QCheckBox("Minimize to system tray when closing main window")
        form.addRow("System Tray Behavior:", self.tray_close_chk)

        self.notify_chk = QCheckBox("Show desktop notifications on completion/failure")
        form.addRow("Desktop Alerts:", self.notify_chk)

        # WebSocket Port
        self.ws_port_spin = QSpinBox()
        self.ws_port_spin.setRange(1024, 65535)
        form.addRow("Browser Extension WS Port:", self.ws_port_spin)

        # Max retries
        self.retries_spin = QSpinBox()
        self.retries_spin.setRange(0, 10)
        form.addRow("Exponential Backoff Retries:", self.retries_spin)

        # FFmpeg override
        ffmpeg_info = probe_ffmpeg_version(self._config.get_ffmpeg_executable())
        self.ffmpeg_edit = QLineEdit()
        self.ffmpeg_edit.setPlaceholderText("Auto-detected via PATH / imageio-ffmpeg")
        form.addRow("Custom FFmpeg Binary (Optional):", self.ffmpeg_edit)

        ffmpeg_status = QLabel(
            f"Detected FFmpeg: {ffmpeg_info['version']} ({ffmpeg_info['source']})"
        )
        ffmpeg_status.setWordWrap(True)
        ffmpeg_status.setStyleSheet(
            f"font-size: 11px; color: {'#10B981' if ffmpeg_info['available'] else '#EF4444'};"
        )
        form.addRow("FFmpeg Engine Status:", ffmpeg_status)

        root.addWidget(card)

        btn_row = QHBoxLayout()
        btn_row.addStretch(1)
        cancel_btn = QPushButton("Cancel")
        cancel_btn.clicked.connect(self.reject)
        btn_row.addWidget(cancel_btn)

        save_btn = QPushButton("Save Settings")
        save_btn.setObjectName("PrimaryButton")
        save_btn.clicked.connect(self._save_and_accept)
        btn_row.addWidget(save_btn)
        root.addLayout(btn_row)

    def _load_values(self) -> None:
        cfg = self._config.config
        self.download_dir_edit.setText(cfg.download_dir)
        fmt_idx = self.format_combo.findData(cfg.default_format)
        if fmt_idx >= 0:
            self.format_combo.setCurrentIndex(fmt_idx)
        self.sub_lang_edit.setText(cfg.default_subtitle_lang)
        theme_idx = self.theme_combo.findData(cfg.theme_mode)
        if theme_idx >= 0:
            self.theme_combo.setCurrentIndex(theme_idx)
        self.mini_taskbar_chk.setChecked(cfg.mini_taskbar_enabled)
        self.mini_timeout_spin.setValue(cfg.mini_taskbar_timeout_sec)
        self.clipboard_chk.setChecked(cfg.clipboard_monitor_enabled)
        self.tray_close_chk.setChecked(cfg.minimize_to_tray_on_close)
        self.notify_chk.setChecked(cfg.desktop_notifications_enabled)
        self.ws_port_spin.setValue(cfg.websocket_port)
        self.retries_spin.setValue(cfg.max_retries)
        self.ffmpeg_edit.setText(cfg.ffmpeg_path)

    def _browse_folder(self) -> None:
        chosen = QFileDialog.getExistingDirectory(
            self,
            "Select Default Video Download Folder",
            self.download_dir_edit.text(),
        )
        if chosen:
            self.download_dir_edit.setText(chosen)

    def _save_and_accept(self) -> None:
        self._config.update(
            download_dir=self.download_dir_edit.text().strip(),
            default_format=str(self.format_combo.currentData() or "best"),
            default_subtitle_lang=self.sub_lang_edit.text().strip() or "en",
            theme_mode=str(self.theme_combo.currentData() or "system"),
            mini_taskbar_enabled=self.mini_taskbar_chk.isChecked(),
            mini_taskbar_timeout_sec=self.mini_timeout_spin.value(),
            clipboard_monitor_enabled=self.clipboard_chk.isChecked(),
            minimize_to_tray_on_close=self.tray_close_chk.isChecked(),
            desktop_notifications_enabled=self.notify_chk.isChecked(),
            websocket_port=self.ws_port_spin.value(),
            max_retries=self.retries_spin.value(),
            ffmpeg_path=self.ffmpeg_edit.text().strip(),
        )
        self.accept()
