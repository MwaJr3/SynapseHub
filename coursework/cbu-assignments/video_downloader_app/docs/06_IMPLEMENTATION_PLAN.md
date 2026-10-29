# #6 Implementation Plan Document

## 1. Overview
This document breaks down the architecture and delivery of **VDownloader OS** into six structured implementation phases with clear deliverables and verification milestones.

## 2. Goals
Deliver a modular, test-verified desktop software suite where core media engines, subtitle/transcript parsers, browser WebSocket integration, PyQt6 desktop dashboards, and PyInstaller packaging are cleanly decoupled and maintainable.

## 3. Implementation Phases

| Phase | What Gets Built | Key Deliverables | Status |
| :--- | :--- | :--- | :--- |
| **1. Foundation & Config** | Persistent JSON configuration, automatic FFmpeg resolution (`imageio-ffmpeg` + PATH), rotating logger, and icon assets. | `utils/config.py`, `utils/logger.py`, `gui/resources/*.svg` | Completed |
| **2. Core Media Engine** | URL validator & platform detector, `yt-dlp` Python API downloader with retry & FFmpeg subtitle burn, VTT/SRT deduplicating parser, clipboard monitor, and SQLite telemetry. | `core/url_handler.py`, `core/downloader.py`, `core/transcriptor.py`, `core/clipboard_monitor.py`, `core/telemetry.py` | Completed |
| **3. Browser Bridge & Extensions** | Local `websockets` server + Chrome/Edge Manifest V3 & Firefox Manifest V2 extensions with IDM-style player hover button. | `server/websocket_server.py`, `server/extension/chrome/*`, `server/extension/firefox/*` | Completed |
| **4. Desktop GUI & Adapted Dashboards** | Adaptive Light/Dark QSS theme, frameless `MiniTaskbarWindow`, `TranscriptTab`, `SettingsDialog`, `SystemTrayController`, and all 6 adapted analytical dashboards. | `gui/theme.py`, `gui/mini_taskbar.py`, `gui/transcript_tab.py`, `gui/dashboards_tab.py`, `gui/main_window.py` | Completed |
| **5. Live Web Dashboard Mirror** | `aiohttp` live dashboard & REST control server on `0.0.0.0:8080` for remote/headless preview parity. | `server/dashboard_web.py`, `server/web_ui_template.py`, `main.py` | Completed |
| **6. Testing & Executable Build** | Automated `pytest` suite covering URL detection, VTT deduplication, queue retries, WebSocket bridge, and PyInstaller packaging. | `tests/test_*.py`, `build.py`, `README.md` | Completed |

## 4. Verification Milestones
- **M1 — Zero-Friction FFmpeg**: Verified automatic binary provisioning via `imageio-ffmpeg` when system FFmpeg is absent.
- **M2 — Clean Transcripts**: Verified YouTube rolling 2-line WebVTT captions parse into clean, duplicate-free plain text, `[MM:SS]` text, and `.srt` files.
- **M3 — Non-Intrusive Mini-Taskbar**: Verified frameless bottom-right popup with `WA_ShowWithoutActivating` and 15-second hover-aware auto-dismiss.
- **M4 — Multi-Dashboard Telemetry**: Verified all 6 adapted dashboards (InsightOS Analytical Board, Live Metrics, Sources Hub, Engine Health, UI Performance, Live Changelog) backed by live SQLite data.
