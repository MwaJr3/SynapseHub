"""System tray controller and cross-platform desktop notification helper."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

from .logger import get_logger

logger = get_logger("tray")


def send_desktop_notification(
    title: str,
    message: str,
    tray_controller: "SystemTrayController | None" = None,
    enabled: bool = True,
) -> bool:
    """Dispatch a desktop notification via Qt System Tray or plyer fallback."""
    if not enabled:
        return False

    if tray_controller is not None and tray_controller.show_tray_message(title, message):
        return True

    try:
        from plyer import notification

        notification.notify(
            title=title,
            message=message[:240],
            app_name="VDownloader OS",
            timeout=5,
        )
        return True
    except Exception as exc:
        logger.debug("Desktop notification fallback skipped: %s", exc)
        return False


class SystemTrayController:
    """Manages PyQt6 QSystemTrayIcon, context menu, and minimize-to-tray behavior."""

    def __init__(
        self,
        parent_window: Any,
        on_toggle_window: Callable[[], None],
        on_check_updates: Callable[[], None],
        on_exit_app: Callable[[], None],
        on_show_mini_taskbar: Callable[[], None] | None = None,
        icon_path: Path | None = None,
    ) -> None:
        self._window = parent_window
        self._on_toggle = on_toggle_window
        self._on_updates = on_check_updates
        self._on_exit = on_exit_app
        self._on_mini = on_show_mini_taskbar
        self._icon_path = icon_path
        self.tray_icon: Any = None
        self._available = False
        self._setup_tray()

    def _build_icon(self) -> Any:
        from PyQt6.QtCore import Qt
        from PyQt6.QtGui import QColor, QIcon, QLinearGradient, QPainter, QPixmap

        if self._icon_path and self._icon_path.is_file():
            loaded = QIcon(str(self._icon_path))
            if not loaded.isNull():
                return loaded

        pixmap = QPixmap(64, 64)
        pixmap.fill(Qt.GlobalColor.transparent)
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        bg_grad = QLinearGradient(0, 0, 64, 64)
        bg_grad.setColorAt(0.0, QColor("#0E141B"))
        bg_grad.setColorAt(1.0, QColor("#18251C"))
        painter.setBrush(bg_grad)
        painter.setPen(QColor("#B8FF3B"))
        painter.drawRoundedRect(4, 4, 56, 56, 16, 16)

        orb_grad = QLinearGradient(16, 16, 48, 48)
        orb_grad.setColorAt(0.0, QColor("#C6FF33"))
        orb_grad.setColorAt(0.55, QColor("#10B981"))
        orb_grad.setColorAt(1.0, QColor("#06B6D4"))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(orb_grad)
        painter.drawEllipse(16, 16, 32, 32)

        painter.setBrush(QColor("#0B0F14"))
        painter.drawEllipse(25, 25, 14, 14)
        painter.end()
        return QIcon(pixmap)

    def _setup_tray(self) -> None:
        try:
            from PyQt6.QtGui import QAction
            from PyQt6.QtWidgets import QMenu, QSystemTrayIcon

            if not QSystemTrayIcon.isSystemTrayAvailable():
                logger.info("OS system tray is not reported available on this display.")
                return

            self.tray_icon = QSystemTrayIcon(self._build_icon(), self._window)
            self.tray_icon.setToolTip("VDownloader OS — Video Downloader & Transcript Suite")

            menu = QMenu()
            toggle_action = QAction("Show / Hide Main Window", menu)
            toggle_action.triggered.connect(self._on_toggle)
            menu.addAction(toggle_action)

            if self._on_mini is not None:
                mini_action = QAction("Preview Floating Mini-Taskbar", menu)
                mini_action.triggered.connect(self._on_mini)
                menu.addAction(mini_action)

            menu.addSeparator()

            update_action = QAction("Check for Updates", menu)
            update_action.triggered.connect(self._on_updates)
            menu.addAction(update_action)

            menu.addSeparator()

            exit_action = QAction("Exit", menu)
            exit_action.triggered.connect(self._on_exit)
            menu.addAction(exit_action)

            self.tray_icon.setContextMenu(menu)
            self.tray_icon.activated.connect(self._handle_activation)
            self.tray_icon.show()
            self._available = True
            logger.info("System tray icon initialized.")
        except Exception as exc:
            logger.warning("Could not initialize QSystemTrayIcon: %s", exc)
            self._available = False

    def _handle_activation(self, reason: Any) -> None:
        try:
            from PyQt6.QtWidgets import QSystemTrayIcon

            if reason in (
                QSystemTrayIcon.ActivationReason.Trigger,
                QSystemTrayIcon.ActivationReason.DoubleClick,
            ):
                self._on_toggle()
        except Exception:
            self._on_toggle()

    @property
    def is_available(self) -> bool:
        return self._available

    def show_tray_message(self, title: str, message: str, duration_ms: int = 4500) -> bool:
        if not self._available or self.tray_icon is None:
            return False
        try:
            from PyQt6.QtWidgets import QSystemTrayIcon

            self.tray_icon.showMessage(
                title,
                message,
                QSystemTrayIcon.MessageIcon.Information,
                duration_ms,
            )
            return True
        except Exception as exc:
            logger.debug("Tray bubble message failed: %s", exc)
            return False

    def shutdown(self) -> None:
        if self.tray_icon is not None:
            try:
                self.tray_icon.hide()
            except Exception:
                pass
