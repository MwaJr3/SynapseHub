"""IDM-style frameless always-on-top floating mini-taskbar near the system clock."""

from __future__ import annotations

import threading
import urllib.request
from pathlib import Path

from PyQt6.QtCore import QRectF, Qt, QTimer, pyqtSignal
from PyQt6.QtGui import QColor, QGuiApplication, QLinearGradient, QPainter, QPainterPath, QPen, QPixmap
from PyQt6.QtWidgets import (
    QHBoxLayout,
    QLabel,
    QProgressBar,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from ..core.url_handler import PlatformInfo, URLHandler


class MiniTaskbarWindow(QWidget):
    """Floating non-focus-stealing bottom-right download prompt (IDM style)."""

    downloadRequested = pyqtSignal(str, str)  # (url, title)
    thumbnailLoaded = pyqtSignal(bytes)

    PANEL_WIDTH = 384
    PANEL_HEIGHT = 138

    def __init__(self, timeout_seconds: int = 15, resources_dir: Path | None = None) -> None:
        super().__init__(None)
        self._timeout_sec = max(5, timeout_seconds)
        self._remaining_ms = self._timeout_sec * 1000
        self._hovered = False
        self._current_url = ""
        self._current_title = ""
        self._resources_dir = resources_dir or (Path(__file__).resolve().parent / "resources")

        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.Tool
            | Qt.WindowType.WindowDoesNotAcceptFocus
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating, True)
        self.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        self.setFixedSize(self.PANEL_WIDTH, self.PANEL_HEIGHT)

        self._build_ui()

        self._tick_timer = QTimer(self)
        self._tick_timer.setInterval(100)
        self._tick_timer.timeout.connect(self._on_tick)
        self.thumbnailLoaded.connect(self._apply_thumbnail_bytes)

    def _build_ui(self) -> None:
        outer = QVBoxLayout(self)
        outer.setContentsMargins(16, 14, 16, 12)
        outer.setSpacing(8)

        # Header row: Platform badge + live indicator
        top_row = QHBoxLayout()
        top_row.setSpacing(8)

        self.platform_badge = QLabel("● YouTube Stream Detected")
        self.platform_badge.setStyleSheet(
            "color: #C6FF33; font-size: 11px; font-weight: 700; background: transparent;"
        )
        top_row.addWidget(self.platform_badge)
        top_row.addStretch(1)

        self.timer_label = QLabel("15s")
        self.timer_label.setStyleSheet(
            "color: #94A3B8; font-size: 11px; font-weight: 600; background: transparent;"
        )
        top_row.addWidget(self.timer_label)
        outer.addLayout(top_row)

        # Middle row: Thumbnail + Title + Action buttons
        body_row = QHBoxLayout()
        body_row.setSpacing(12)

        self.thumb_label = QLabel()
        self.thumb_label.setFixedSize(96, 56)
        self.thumb_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.thumb_label.setStyleSheet(
            "background-color: #16202B; border: 1px solid #263547; border-radius: 8px; "
            "color: #C6FF33; font-size: 18px; font-weight: 700;"
        )
        self.thumb_label.setText("▶")
        body_row.addWidget(self.thumb_label)

        right_col = QVBoxLayout()
        right_col.setSpacing(8)

        self.title_label = QLabel("Stream Ready to Download")
        self.title_label.setWordWrap(True)
        self.title_label.setMaximumHeight(36)
        self.title_label.setStyleSheet(
            "color: #F8FAFC; font-size: 12px; font-weight: 600; background: transparent;"
        )
        right_col.addWidget(self.title_label)

        btn_row = QHBoxLayout()
        btn_row.setSpacing(8)

        self.download_btn = QPushButton("⬇ Download")
        self.download_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.download_btn.setStyleSheet(
            "QPushButton { background-color: #C6FF33; color: #0B0F14; border: none; "
            "border-radius: 8px; padding: 5px 14px; font-size: 12px; font-weight: 700; }"
            "QPushButton:hover { background-color: #DCFF78; }"
        )
        self.download_btn.clicked.connect(self._handle_download_clicked)
        btn_row.addWidget(self.download_btn)

        self.dismiss_btn = QPushButton("Dismiss")
        self.dismiss_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.dismiss_btn.setStyleSheet(
            "QPushButton { background-color: rgba(30, 41, 59, 0.85); color: #CBD5E1; "
            "border: 1px solid #334155; border-radius: 8px; padding: 5px 12px; "
            "font-size: 12px; font-weight: 600; }"
            "QPushButton:hover { border-color: #94A3B8; color: #FFFFFF; }"
        )
        self.dismiss_btn.clicked.connect(self.dismiss_panel)
        btn_row.addWidget(self.dismiss_btn)
        btn_row.addStretch(1)

        right_col.addLayout(btn_row)
        body_row.addLayout(right_col, stretch=1)
        outer.addLayout(body_row)

        # Countdown progress strip
        self.countdown_bar = QProgressBar()
        self.countdown_bar.setRange(0, 1000)
        self.countdown_bar.setValue(1000)
        self.countdown_bar.setTextVisible(False)
        self.countdown_bar.setFixedHeight(4)
        self.countdown_bar.setStyleSheet(
            "QProgressBar { background: rgba(255,255,255,0.08); border: none; border-radius: 2px; }"
            "QProgressBar::chunk { background: #10B981; border-radius: 2px; }"
        )
        outer.addWidget(self.countdown_bar)

    def set_timeout_seconds(self, seconds: int) -> None:
        self._timeout_sec = max(5, int(seconds))

    def popup_for_video(
        self,
        url: str,
        title: str = "",
        thumbnail_url: str = "",
        platform: PlatformInfo | None = None,
    ) -> None:
        """Display the floating mini-taskbar near the system tray without stealing focus."""
        resolved_platform = platform or URLHandler.detect_platform(url)
        self._current_url = url
        display_title = (title or f"{resolved_platform.display_name} Video").strip()
        if len(display_title) > 74:
            display_title = display_title[:71] + "..."
        self._current_title = display_title

        self.platform_badge.setText(f"● {resolved_platform.display_name} • Stream Detected")
        self.title_label.setText(display_title)
        self.thumb_label.setPixmap(QPixmap())
        self.thumb_label.setText("▶")

        self._remaining_ms = self._timeout_sec * 1000
        self.countdown_bar.setValue(1000)
        self.timer_label.setText(f"{self._timeout_sec}s")

        self._position_bottom_right()
        self.show()
        self.raise_()
        self._tick_timer.start()

        if thumbnail_url and thumbnail_url.startswith(("http://", "https://")):
            threading.Thread(
                target=self._fetch_thumbnail_worker,
                args=(thumbnail_url,),
                daemon=True,
            ).start()

    def _position_bottom_right(self) -> None:
        screen = QGuiApplication.primaryScreen()
        if screen is None:
            self.move(100, 100)
            return
        avail = screen.availableGeometry()
        margin_x = 18
        margin_y = 18
        x = avail.right() - self.width() - margin_x
        y = avail.bottom() - self.height() - margin_y
        self.move(max(avail.left(), x), max(avail.top(), y))

    def _fetch_thumbnail_worker(self, thumb_url: str) -> None:
        try:
            req = urllib.request.Request(
                thumb_url,
                headers={"User-Agent": "Mozilla/5.0 VDownloaderOS/2.4"},
            )
            with urllib.request.urlopen(req, timeout=3.5) as resp:
                raw_bytes = resp.read(512 * 1024)
            if raw_bytes:
                self.thumbnailLoaded.emit(raw_bytes)
        except Exception:
            pass

    def _apply_thumbnail_bytes(self, data: bytes) -> None:
        pix = QPixmap()
        if pix.loadFromData(data):
            scaled = pix.scaled(
                self.thumb_label.size(),
                Qt.AspectRatioMode.KeepAspectRatioByExpanding,
                Qt.TransformationMode.SmoothTransformation,
            )
            self.thumb_label.setText("")
            self.thumb_label.setPixmap(scaled)

    def _on_tick(self) -> None:
        if self._hovered:
            return
        self._remaining_ms -= 100
        if self._remaining_ms <= 0:
            self.dismiss_panel()
            return
        ratio = int((self._remaining_ms / (self._timeout_sec * 1000.0)) * 1000)
        self.countdown_bar.setValue(max(0, ratio))
        secs_left = max(1, (self._remaining_ms + 999) // 1000)
        self.timer_label.setText(f"{secs_left}s")

    def _handle_download_clicked(self) -> None:
        url = self._current_url
        title = self._current_title
        self.dismiss_panel()
        if url:
            self.downloadRequested.emit(url, title)

    def dismiss_panel(self) -> None:
        self._tick_timer.stop()
        self.hide()

    def enterEvent(self, event: object) -> None:
        self._hovered = True
        super().enterEvent(event)  # type: ignore[arg-type]

    def leaveEvent(self, event: object) -> None:
        self._hovered = False
        super().leaveEvent(event)  # type: ignore[arg-type]

    def paintEvent(self, _event: object) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        rect = QRectF(1.5, 1.5, self.width() - 3.0, self.height() - 3.0)
        path = QPainterPath()
        path.addRoundedRect(rect, 16.0, 16.0)

        grad = QLinearGradient(0, 0, self.width(), self.height())
        grad.setColorAt(0.0, QColor(11, 15, 20, 242))
        grad.setColorAt(1.0, QColor(18, 28, 24, 244))
        painter.fillPath(path, grad)

        pen = QPen(QColor(198, 255, 51, 155), 1.4)
        painter.setPen(pen)
        painter.drawPath(path)
        painter.end()
