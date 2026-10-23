"""PyQt6 desktop GUI package for VDownloader OS."""

from __future__ import annotations

from typing import Any

from .theme import ThemeManager, ThemePalette

__all__ = [
    "MainWindow",
    "MiniTaskbarWindow",
    "SettingsDialog",
    "ThemeManager",
    "ThemePalette",
    "TranscriptTab",
]


def __getattr__(name: str) -> Any:
    if name == "MainWindow":
        from .main_window import MainWindow

        return MainWindow
    if name == "MiniTaskbarWindow":
        from .mini_taskbar import MiniTaskbarWindow

        return MiniTaskbarWindow
    if name == "SettingsDialog":
        from .settings_dialog import SettingsDialog

        return SettingsDialog
    if name == "TranscriptTab":
        from .transcript_tab import TranscriptTab

        return TranscriptTab
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
