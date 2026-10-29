# #2 Technical Requirements Document (TRD)

## 1. Overview
This document outlines the tools, Python libraries, browser APIs, and packaging infrastructure used to build **VDownloader OS**. It ensures alignment across the desktop GUI, media extraction engine, WebSocket bridge, and single-executable build pipeline.

## 2. Technical Goals
Build a fast, thread-safe, modular Python 3.10+ application where blocking network and FFmpeg post-processing tasks never freeze the UI thread, FFmpeg works out-of-the-box without manual setup friction, and local browser communication stays strictly isolated on `127.0.0.1`.

## 3. Technology Stack

| Area | Tool / Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime** | Python 3.10+ (`3.11` tested) | Modern type-annotated core with `dataclasses`, `asyncio`, and `ThreadPoolExecutor`. |
| **Desktop GUI** | `PyQt6==6.11.0` | Native cross-platform main window, custom `QPainter` telemetry charts, frameless `MiniTaskbarWindow`, and `QSystemTrayIcon`. |
| **Media Engine** | `yt-dlp==2026.10.21` (Python API) | Direct `yt_dlp.YoutubeDL` integration with custom `progress_hooks` and `postprocessor_hooks` across 1,800+ extractors. |
| **FFmpeg Pipeline** | System `ffmpeg` + `imageio-ffmpeg==0.6.0` | Automatic binary resolution (`resolve_ffmpeg_path`) providing a bundled FFmpeg v7.0.2 executable when system FFmpeg is absent. |
| **Transcript Parser** | `webvtt-py==0.5.1` + Regex Cleaner | Parses `.vtt` and `.srt` files, strips `<c>` word timing tags, and eliminates YouTube rolling-line duplicates. |
| **Extension Bridge** | `websockets==17.3` | Dedicated `asyncio` server on `ws://127.0.0.1:8765` bridging Manifest V3 (Chrome/Edge) and Manifest V2 (Firefox) extensions. |
| **Live Web Control** | `aiohttp==3.14.5` | Serves the live browser-accessible InsightOS & Founder Stack dashboard mirror on `0.0.0.0:8080` for cloud/remote environments. |
| **OS Integration** | `pyperclip==1.11.0`, `darkdetect==0.8.0`, `plyer==2.1.0` | Clipboard fallback URL detection, OS dark/light mode detection, and native desktop notifications. |
| **Telemetry Store** | `sqlite3` (Stdlib) | Zero-configuration persistent analytical store (`telemetry.sqlite3`) powering all 6 dashboards. |
| **Packaging** | `pyinstaller==6.22.3` (`build.py`) | Compiles Python runtime, PyQt6 widgets, icons, extensions, and FFmpeg shim into a single standalone executable. |
