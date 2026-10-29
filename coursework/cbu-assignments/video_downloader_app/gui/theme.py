"""Adaptive Dark/Light/System theme engine inspired by InsightOS and Founder Dashboards."""

from __future__ import annotations

from dataclasses import dataclass

try:
    import darkdetect
except Exception:  # pragma: no cover
    darkdetect = None  # type: ignore[assignment]


@dataclass(frozen=True)
class ThemePalette:
    """Semantic color tokens shared across QSS stylesheets and QPainter chart widgets."""

    name: str  # "dark" | "light"
    bg_canvas: str
    bg_sidebar: str
    bg_surface: str
    bg_surface_alt: str
    bg_obsidian_hero: str
    bg_lime_card: str
    text_primary: str
    text_secondary: str
    text_muted: str
    text_on_accent: str
    border_subtle: str
    accent_lime: str
    accent_emerald: str
    accent_amber: str
    accent_blue: str
    accent_coral: str
    accent_violet: str


DARK_PALETTE = ThemePalette(
    name="dark",
    bg_canvas="#0B0F14",
    bg_sidebar="#0F151D",
    bg_surface="#131B24",
    bg_surface_alt="#192330",
    bg_obsidian_hero="#080B0F",
    bg_lime_card="#1A2914",
    text_primary="#F8FAFC",
    text_secondary="#CBD5E1",
    text_muted="#64748B",
    text_on_accent="#0B0F14",
    border_subtle="#223042",
    accent_lime="#C6FF33",
    accent_emerald="#10B981",
    accent_amber="#F59E0B",
    accent_blue="#3B82F6",
    accent_coral="#EF4444",
    accent_violet="#6366F1",
)

LIGHT_PALETTE = ThemePalette(
    name="light",
    bg_canvas="#F4F6F1",
    bg_sidebar="#FFFFFF",
    bg_surface="#FFFFFF",
    bg_surface_alt="#EEF2EA",
    bg_obsidian_hero="#0E1311",
    bg_lime_card="#DCFF78",
    text_primary="#0F172A",
    text_secondary="#334155",
    text_muted="#64748B",
    text_on_accent="#0B0F14",
    border_subtle="#E2E8DF",
    accent_lime="#A3E635",
    accent_emerald="#059669",
    accent_amber="#D97706",
    accent_blue="#2563EB",
    accent_coral="#DC2626",
    accent_violet="#4F46E5",
)


class ThemeManager:
    """Resolves OS/manual theme mode and builds modern PyQt6 QSS stylesheets."""

    @staticmethod
    def detect_system_mode() -> str:
        """Return `'dark'` or `'light'` using `darkdetect` (defaults to `'dark'` on headless)."""
        if darkdetect is not None:
            try:
                is_dark = darkdetect.isDark()
                if is_dark is not None:
                    return "dark" if is_dark else "light"
            except Exception:
                pass
        return "dark"

    @classmethod
    def resolve_palette(cls, mode: str = "system") -> ThemePalette:
        normalized = (mode or "system").lower().strip()
        if normalized == "system":
            normalized = cls.detect_system_mode()
        return LIGHT_PALETTE if normalized == "light" else DARK_PALETTE

    @classmethod
    def build_stylesheet(cls, mode: str = "system") -> str:
        """Generate the complete application QSS stylesheet for PyQt6 widgets."""
        p = cls.resolve_palette(mode)
        return f"""
        QMainWindow, QDialog {{
            background-color: {p.bg_canvas};
            color: {p.text_primary};
            font-family: "Inter", "Segoe UI", "SF Pro Display", sans-serif;
            font-size: 13px;
        }}
        QWidget {{
            color: {p.text_primary};
            font-family: "Inter", "Segoe UI", sans-serif;
        }}
        QFrame#SidebarFrame {{
            background-color: {p.bg_sidebar};
            border-right: 1px solid {p.border_subtle};
        }}
        QFrame#CardSurface {{
            background-color: {p.bg_surface};
            border: 1px solid {p.border_subtle};
            border-radius: 16px;
        }}
        QFrame#ObsidianHeroCard {{
            background-color: {p.bg_obsidian_hero};
            border: 1px solid #263B24;
            border-radius: 20px;
        }}
        QFrame#LimeAnalysisCard {{
            background-color: {p.bg_lime_card};
            border: 1px solid {p.accent_lime};
            border-radius: 18px;
        }}
        QPushButton {{
            background-color: {p.bg_surface_alt};
            color: {p.text_primary};
            border: 1px solid {p.border_subtle};
            border-radius: 10px;
            padding: 8px 15px;
            font-weight: 600;
        }}
        QPushButton:hover {{
            border-color: {p.accent_lime};
        }}
        QPushButton#PrimaryButton {{
            background-color: {p.accent_lime};
            color: {p.text_on_accent};
            border: none;
            font-weight: 700;
        }}
        QPushButton#PrimaryButton:hover {{
            background-color: #D9FF66;
        }}
        QPushButton#NavButton {{
            text-align: left;
            padding: 10px 14px;
            border-radius: 12px;
            background-color: transparent;
            border: none;
            color: {p.text_secondary};
            font-weight: 600;
        }}
        QPushButton#NavButton:hover {{
            background-color: {p.bg_surface_alt};
            color: {p.text_primary};
        }}
        QPushButton#NavButton[active="true"] {{
            background-color: #111912;
            color: #FFFFFF;
            border: 1px solid {p.accent_lime};
        }}
        QLineEdit, QComboBox, QSpinBox, QPlainTextEdit, QTextEdit {{
            background-color: {p.bg_surface};
            color: {p.text_primary};
            border: 1px solid {p.border_subtle};
            border-radius: 10px;
            padding: 8px 12px;
            selection-background-color: {p.accent_emerald};
        }}
        QLineEdit:focus, QComboBox:focus, QPlainTextEdit:focus {{
            border: 1px solid {p.accent_lime};
        }}
        QProgressBar {{
            background-color: {p.bg_surface_alt};
            border: 1px solid {p.border_subtle};
            border-radius: 7px;
            text-align: center;
            height: 16px;
            font-size: 11px;
            font-weight: 700;
        }}
        QProgressBar::chunk {{
            background-color: {p.accent_emerald};
            border-radius: 6px;
        }}
        QTableWidget {{
            background-color: {p.bg_surface};
            alternate-background-color: {p.bg_surface_alt};
            border: 1px solid {p.border_subtle};
            border-radius: 14px;
            gridline-color: {p.border_subtle};
        }}
        QHeaderView::section {{
            background-color: {p.bg_surface_alt};
            color: {p.text_muted};
            padding: 8px 10px;
            border: none;
            border-bottom: 1px solid {p.border_subtle};
            font-weight: 700;
            font-size: 11px;
        }}
        QCheckBox {{
            spacing: 8px;
            color: {p.text_secondary};
        }}
        QScrollBar:vertical {{
            background: transparent;
            width: 8px;
            margin: 2px;
        }}
        QScrollBar::handle:vertical {{
            background: {p.border_subtle};
            border-radius: 4px;
            min-height: 24px;
        }}
        """
