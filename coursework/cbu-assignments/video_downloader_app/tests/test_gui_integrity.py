"""Integrity tests for PyQt6 GUI modules, QSS themes, browser extensions, and PyInstaller build."""

from __future__ import annotations

import ast
import json
from pathlib import Path

from video_downloader_app.build import build_pyinstaller_args
from video_downloader_app.gui.theme import ThemeManager

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def test_theme_stylesheets_for_dark_and_light() -> None:
    dark_qss = ThemeManager.build_stylesheet("dark")
    light_qss = ThemeManager.build_stylesheet("light")
    assert "#0B0F14" in dark_qss
    assert "#F4F6F1" in light_qss
    assert "QMainWindow" in dark_qss
    assert "ObsidianHeroCard" in dark_qss


def test_all_python_modules_compile_cleanly() -> None:
    py_files = list(PROJECT_ROOT.rglob("*.py"))
    assert len(py_files) >= 18
    for path in py_files:
        source = path.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(path))
        assert tree is not None


def test_gui_expected_classes_present() -> None:
    expected = {
        "gui/main_window.py": {"MainWindow", "InfoFetchWorker"},
        "gui/mini_taskbar.py": {"MiniTaskbarWindow"},
        "gui/transcript_tab.py": {"TranscriptTab", "TranscriptWorker"},
        "gui/settings_dialog.py": {"SettingsDialog"},
        "gui/dashboards_tab.py": {"AnalyticalBoardView", "AdaptedTelemetryView", "DonutChartWidget"},
    }
    for rel_path, class_names in expected.items():
        tree = ast.parse((PROJECT_ROOT / rel_path).read_text(encoding="utf-8"))
        defined = {node.name for node in ast.walk(tree) if isinstance(node, ast.ClassDef)}
        assert class_names.issubset(defined), f"Missing classes in {rel_path}: {class_names - defined}"


def test_chrome_mv3_and_firefox_mv2_manifests() -> None:
    chrome_dir = PROJECT_ROOT / "server" / "extension" / "chrome"
    firefox_dir = PROJECT_ROOT / "server" / "extension" / "firefox"

    c_manifest = json.loads((chrome_dir / "manifest.json").read_text(encoding="utf-8"))
    assert c_manifest["manifest_version"] == 3
    assert (chrome_dir / c_manifest["background"]["service_worker"]).is_file()
    assert (chrome_dir / "content.js").is_file()
    assert (chrome_dir / "icons" / "icon128.png").is_file()

    f_manifest = json.loads((firefox_dir / "manifest.json").read_text(encoding="utf-8"))
    assert f_manifest["manifest_version"] == 2
    assert (firefox_dir / "background.js").is_file()
    assert (firefox_dir / "content.js").is_file()
    assert (firefox_dir / "icons" / "icon128.png").is_file()


def test_pyinstaller_builder_args() -> None:
    args = build_pyinstaller_args(PROJECT_ROOT)
    assert "--onefile" in args
    assert "--name=VDownloaderOS" in args
    assert any("yt_dlp" in a for a in args)
