#!/usr/bin/env python3
"""PyInstaller single-executable builder for VDownloader OS (Windows / macOS / Linux)."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


def build_pyinstaller_args(project_root: Path, console: bool = False) -> list[str]:
    """Construct platform-correct PyInstaller CLI arguments for single-file packaging."""
    sep = ";" if sys.platform.startswith("win") else ":"
    entry_script = project_root / "main.py"
    resources_dir = project_root / "gui" / "resources"
    docs_dir = project_root / "docs"
    ext_dir = project_root / "server" / "extension"
    icon_png = resources_dir / "app_icon.png"

    args = [
        str(entry_script),
        "--name=VDownloaderOS",
        "--onefile",
        "--clean",
        "--noconfirm",
        f"--paths={project_root.parent}",
        f"--add-data={resources_dir}{sep}video_downloader_app/gui/resources",
        f"--add-data={ext_dir}{sep}video_downloader_app/server/extension",
    ]
    if docs_dir.is_dir():
        args.append(f"--add-data={docs_dir}{sep}video_downloader_app/docs")

    if not console:
        args.append("--windowed")

    if icon_png.is_file():
        args.append(f"--icon={icon_png}")

    hidden_imports = [
        "yt_dlp",
        "websockets",
        "websockets.asyncio.server",
        "aiohttp",
        "webvtt",
        "pyperclip",
        "darkdetect",
        "plyer",
        "plyer.platforms.linux.notification",
        "plyer.platforms.win.notification",
        "plyer.platforms.macosx.notification",
        "imageio_ffmpeg",
        "PyQt6.QtCore",
        "PyQt6.QtGui",
        "PyQt6.QtWidgets",
    ]
    for mod in hidden_imports:
        args.append(f"--hidden-import={mod}")

    args.extend(["--collect-binaries=imageio_ffmpeg"])
    return args


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Package VDownloader OS into a single executable.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print and validate PyInstaller arguments without running compilation",
    )
    parser.add_argument(
        "--console",
        action="store_true",
        help="Keep console stdout attached (useful for debugging builds)",
    )
    parsed = parser.parse_args(argv)

    project_root = Path(__file__).resolve().parent
    os.chdir(project_root)
    pyinstaller_args = build_pyinstaller_args(project_root, console=parsed.console)

    print("PyInstaller target arguments:")
    for item in pyinstaller_args:
        print(f"  {item}")

    if parsed.dry_run:
        print("\nDry-run validation succeeded.")
        return 0

    import PyInstaller.__main__

    PyInstaller.__main__.run(pyinstaller_args)
    dist_bin = project_root / "dist" / (
        "VDownloaderOS.exe" if sys.platform.startswith("win") else "VDownloaderOS"
    )
    print(f"\nBuild complete! Executable written to: {dist_bin}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
