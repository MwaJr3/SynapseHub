"""Dedicated Transcript Extraction Studio tab (youtubetotranscript.com workflow)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from PyQt6.QtCore import Qt, QThread, pyqtSignal
from PyQt6.QtGui import QGuiApplication
from PyQt6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QFileDialog,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPlainTextEdit,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from ..core.transcriptor import TranscriptExtractor, TranscriptResult
from ..utils.config import ConfigManager


class TranscriptWorker(QThread):
    """Background worker extracting VTT/SRT captions without downloading video."""

    succeeded = pyqtSignal(object)  # TranscriptResult
    failed = pyqtSignal(str)

    def __init__(
        self,
        url: str,
        lang: str,
        include_auto: bool,
        ffmpeg_path: str | None = None,
    ) -> None:
        super().__init__()
        self._url = url
        self._lang = lang
        self._include_auto = include_auto
        self._ffmpeg_path = ffmpeg_path

    def run(self) -> None:
        try:
            extractor = TranscriptExtractor(ffmpeg_path=self._ffmpeg_path)
            result = extractor.extract_transcript(
                url=self._url,
                preferred_lang=self._lang,
                include_auto_subs=self._include_auto,
            )
            self.succeeded.emit(result)
        except Exception as exc:
            self.failed.emit(str(exc))


class TranscriptTab(QWidget):
    """Scrollable transcript viewer with Copy Plain, Copy w/ Timestamps, and .txt/.srt export."""

    transcriptExtracted = pyqtSignal(object)  # TranscriptResult

    def __init__(
        self,
        config_manager: ConfigManager,
        telemetry: Any = None,
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        self._config = config_manager
        self._telemetry = telemetry
        self._worker: TranscriptWorker | None = None
        self._current_result: TranscriptResult | None = None
        self._build_ui()

    def _build_ui(self) -> None:
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(14)

        # Input Card
        top_card = QFrame()
        top_card.setObjectName("CardSurface")
        top_layout = QVBoxLayout(top_card)
        top_layout.setContentsMargins(18, 16, 18, 16)
        top_layout.setSpacing(12)

        header_lbl = QLabel("Instant Transcript & Subtitle Extractor")
        header_lbl.setStyleSheet("font-size: 16px; font-weight: 700;")
        top_layout.addWidget(header_lbl)

        sub_lbl = QLabel(
            "Extracts manual or auto-generated captions directly via yt-dlp (--skip-download) "
            "and deduplicates rolling WebVTT/SRT lines into clean timestamped text."
        )
        sub_lbl.setWordWrap(True)
        sub_lbl.setStyleSheet("color: #64748B; font-size: 12px;")
        top_layout.addWidget(sub_lbl)

        url_row = QHBoxLayout()
        url_row.setSpacing(10)

        self.url_input = QLineEdit()
        self.url_input.setPlaceholderText(
            "Paste YouTube, Facebook, TikTok, or Anime stream URL for transcript extraction..."
        )
        self.url_input.returnPressed.connect(self.start_extraction)
        url_row.addWidget(self.url_input, stretch=1)

        self.lang_combo = QComboBox()
        for code, label in [
            ("en", "English (en)"),
            ("es", "Spanish (es)"),
            ("fr", "French (fr)"),
            ("de", "German (de)"),
            ("ja", "Japanese (ja)"),
            ("ko", "Korean (ko)"),
            ("pt", "Portuguese (pt)"),
            ("zh", "Chinese (zh)"),
            ("ar", "Arabic (ar)"),
        ]:
            self.lang_combo.addItem(label, code)
        default_lang = self._config.config.default_subtitle_lang
        idx = self.lang_combo.findData(default_lang)
        if idx >= 0:
            self.lang_combo.setCurrentIndex(idx)
        url_row.addWidget(self.lang_combo)

        self.auto_sub_chk = QCheckBox("Auto-generated captions")
        self.auto_sub_chk.setChecked(True)
        url_row.addWidget(self.auto_sub_chk)

        self.extract_btn = QPushButton("Extract Transcript")
        self.extract_btn.setObjectName("PrimaryButton")
        self.extract_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.extract_btn.clicked.connect(self.start_extraction)
        url_row.addWidget(self.extract_btn)

        top_layout.addLayout(url_row)
        root.addWidget(top_card)

        # Viewer Card
        viewer_card = QFrame()
        viewer_card.setObjectName("CardSurface")
        viewer_layout = QVBoxLayout(viewer_card)
        viewer_layout.setContentsMargins(18, 16, 18, 16)
        viewer_layout.setSpacing(10)

        meta_row = QHBoxLayout()
        self.meta_status = QLabel("Ready — paste any supported video link above.")
        self.meta_status.setStyleSheet("font-weight: 600; font-size: 12px; color: #10B981;")
        meta_row.addWidget(self.meta_status, stretch=1)

        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("Filter transcript lines...")
        self.search_input.setMaximumWidth(240)
        self.search_input.textChanged.connect(self._refresh_text_display)
        meta_row.addWidget(self.search_input)

        self.show_timestamps_chk = QCheckBox("Show timestamps")
        self.show_timestamps_chk.setChecked(True)
        self.show_timestamps_chk.toggled.connect(self._refresh_text_display)
        meta_row.addWidget(self.show_timestamps_chk)

        viewer_layout.addLayout(meta_row)

        self.transcript_editor = QPlainTextEdit()
        self.transcript_editor.setReadOnly(True)
        self.transcript_editor.setPlaceholderText(
            "[00:00] Extracted transcript with clean timestamps will appear here..."
        )
        self.transcript_editor.setStyleSheet(
            "font-family: 'JetBrains Mono', 'Consolas', monospace; font-size: 13px; line-height: 1.5;"
        )
        viewer_layout.addWidget(self.transcript_editor, stretch=1)

        # Action toolbar
        actions_row = QHBoxLayout()
        actions_row.setSpacing(10)

        self.copy_plain_btn = QPushButton("Copy Plain Text")
        self.copy_plain_btn.clicked.connect(self.copy_plain_text)
        actions_row.addWidget(self.copy_plain_btn)

        self.copy_ts_btn = QPushButton("Copy with Timestamps")
        self.copy_ts_btn.setObjectName("PrimaryButton")
        self.copy_ts_btn.clicked.connect(self.copy_with_timestamps)
        actions_row.addWidget(self.copy_ts_btn)

        actions_row.addStretch(1)

        self.save_txt_btn = QPushButton("Save as .txt")
        self.save_txt_btn.clicked.connect(lambda: self.save_transcript("txt"))
        actions_row.addWidget(self.save_txt_btn)

        self.save_srt_btn = QPushButton("Save as .srt")
        self.save_srt_btn.clicked.connect(lambda: self.save_transcript("srt"))
        actions_row.addWidget(self.save_srt_btn)

        viewer_layout.addLayout(actions_row)
        root.addWidget(viewer_card, stretch=1)
        self._set_actions_enabled(False)

    def set_url_and_extract(self, url: str) -> None:
        self.url_input.setText(url)
        self.start_extraction()

    def _set_actions_enabled(self, enabled: bool) -> None:
        self.copy_plain_btn.setEnabled(enabled)
        self.copy_ts_btn.setEnabled(enabled)
        self.save_txt_btn.setEnabled(enabled)
        self.save_srt_btn.setEnabled(enabled)

    def start_extraction(self) -> None:
        url = self.url_input.text().strip()
        if not url:
            QMessageBox.warning(self, "Missing URL", "Please enter a video URL first.")
            return

        if self._worker is not None and self._worker.isRunning():
            return

        lang = str(self.lang_combo.currentData() or "en")
        include_auto = self.auto_sub_chk.isChecked()
        self.extract_btn.setEnabled(False)
        self.extract_btn.setText("Extracting...")
        self.meta_status.setText("Fetching captions via yt-dlp (no video download)...")

        self._worker = TranscriptWorker(
            url=url,
            lang=lang,
            include_auto=include_auto,
            ffmpeg_path=self._config.get_ffmpeg_executable(),
        )
        self._worker.succeeded.connect(self._on_extraction_succeeded)
        self._worker.failed.connect(self._on_extraction_failed)
        self._worker.start()

    def _on_extraction_succeeded(self, result: TranscriptResult) -> None:
        self._current_result = result
        self.extract_btn.setEnabled(True)
        self.extract_btn.setText("Extract Transcript")
        self._set_actions_enabled(True)

        caption_kind = "Auto-generated" if result.is_auto_generated else "Manual"
        word_count = sum(len(c.text.split()) for c in result.cues)
        self.meta_status.setText(
            f"✓ {result.video_title} • {len(result.cues)} cues ({word_count} words) • "
            f"{result.language.upper()} {caption_kind} ({result.fetch_elapsed_sec:.2f}s)"
        )
        self._refresh_text_display()

        if self._telemetry is not None:
            self._telemetry.record_transcript(
                url=result.url,
                title=result.video_title,
                language=result.language,
                is_auto=result.is_auto_generated,
                cue_count=len(result.cues),
                word_count=word_count,
                elapsed_sec=result.fetch_elapsed_sec,
            )
        self.transcriptExtracted.emit(result)

    def _on_extraction_failed(self, err_msg: str) -> None:
        self.extract_btn.setEnabled(True)
        self.extract_btn.setText("Extract Transcript")
        self.meta_status.setText(f"⚠ {err_msg}")
        QMessageBox.warning(self, "Transcript Unavailable", err_msg)

    def _refresh_text_display(self) -> None:
        if self._current_result is None:
            return
        query = self.search_input.text().strip().lower()
        with_ts = self.show_timestamps_chk.isChecked()
        lines: list[str] = []
        for cue in self._current_result.cues:
            if query and query not in cue.text.lower():
                continue
            lines.append(f"[{cue.display_timestamp}] {cue.text}" if with_ts else cue.text)
        self.transcript_editor.setPlainText("\n".join(lines))

    def _copy_text(self, text: str, label: str) -> None:
        clipboard = QGuiApplication.clipboard()
        if clipboard is not None:
            clipboard.setText(text)
        try:
            import pyperclip

            pyperclip.copy(text)
        except Exception:
            pass
        self.meta_status.setText(f"✓ Copied {label} ({len(text):,} characters) to clipboard!")

    def copy_plain_text(self) -> None:
        if self._current_result is None:
            return
        self._copy_text(self._current_result.to_plain_text(), "plain text")

    def copy_with_timestamps(self) -> None:
        if self._current_result is None:
            return
        self._copy_text(self._current_result.to_timestamped_text(), "timestamped transcript")

    def save_transcript(self, ext: str) -> None:
        if self._current_result is None:
            return
        safe_stem = "".join(
            ch if ch.isalnum() or ch in (" ", "-", "_") else "_"
            for ch in self._current_result.video_title
        ).strip()[:80] or "transcript"
        default_dir = Path(self._config.config.download_dir)
        suggested = str(default_dir / f"{safe_stem}.{ext}")
        filter_spec = "SubRip Subtitles (*.srt)" if ext == "srt" else "Text Document (*.txt)"
        chosen, _ = QFileDialog.getSaveFileName(self, "Save Transcript", suggested, filter_spec)
        if not chosen:
            return
        mode = (
            "srt"
            if ext == "srt"
            else ("txt_timestamps" if self.show_timestamps_chk.isChecked() else "plain")
        )
        saved = self._current_result.save_to_file(chosen, mode=mode)
        self.meta_status.setText(f"✓ Saved transcript to {saved}")
