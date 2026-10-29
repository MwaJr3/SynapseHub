# VDownloader OS — Universal Video Downloader, Transcript Studio & Analytical Suite

**VDownloader OS** (*InsightDL*) is a production-ready cross-platform desktop application built with **Python 3.10+**, **PyQt6**, **yt-dlp**, **FFmpeg**, and **WebSockets**. It downloads streams in any available resolution (**144p up to 8K UHD** plus lossless **MP3/M4A** audio), embeds soft or hardcoded subtitles, extracts clean timestamped transcripts without downloading video, and includes an **Internet Download Manager (IDM)–style floating mini-taskbar** integrated with companion **Chrome/Edge (Manifest V3)** and **Firefox (Manifest V2)** browser extensions.

---

## Adapted Dashboards & Engineering Blueprints

Every visual workspace and specification document in this project adapts the reference dashboards and engineering templates into a cohesive media-extraction observability platform:

1. **Analytical Media Board (*InsightOS Adaptation*)**
   - Dark obsidian **Smart Media & Transcript Distribution** hero card with glowing glassmorphic KPIs (*Total Media Saved*, *Extraction Success ROI*, *Parsed Transcript Cues*).
   - **Platform Analysis** multi-segment donut chart (*YouTube*, *TikTok & Facebook*, *Anime & Streaming*).
   - Neon-lime **Stream & Caption Analysis** card comparing HD completions, retried/failed tasks, and subtitle-enriched media.
   - **Pulse Stream AI** right-hand inspector with iridescent neon orb and one-click format/transcript actions.
   - **Recent Streams & Extraction Health** table featuring 10-segment neon green health bars (`▮▮▮▮▮▮▮▮▮▯`).
2. **Live Metrics Dashboard (`01 / 05`)** — Real-time bandwidth saved, completed videos, throughput area-line trend (`MB/s`), and resolution distribution bar chart.
3. **Sources & Channels Hub (`02 / 05`)** — Tracks `1,800+` active `yt-dlp` extractors, unique creator channels, source category breakdown donut, and live bridge activity timeline.
4. **Engine & Bridge Health Monitor (`03 / 05`)** — Tracks WebSocket bridge uptime (`99.98%`), extractor probe latency (`ms`), error rate, 24-interval load chart, and live subsystem health pills (`yt-dlp`, `FFmpeg`, `WebSocket`, `VTT Parser`).
5. **UI & Extension Performance (`04 / 05`)** — Tracks GUI responsiveness score (`98`), P50 metadata fetch latency (`s`), mini-taskbar popup jitter, and a 14-request probe latency bar chart.
6. **Live Changelog (`05 / 05`)** — Filterable product release stream (`All`, `NEW`, `IMPROVED`, `FIX`).
7. **6 Pre-Code Engineering Specification Docs (`docs/`)**:
   - [`docs/01_PRD.md`](docs/01_PRD.md) — **#1 Product Requirement Document**
   - [`docs/02_TRD.md`](docs/02_TRD.md) — **#2 Technical Requirements Document**
   - [`docs/03_APP_FLOW.md`](docs/03_APP_FLOW.md) — **#3 App Flow Document**
   - [`docs/04_DESIGN_BRIEF.md`](docs/04_DESIGN_BRIEF.md) — **#4 Design Brief Document**
   - [`docs/05_BACKEND_SCHEMA.md`](docs/05_BACKEND_SCHEMA.md) — **#5 Backend Schema Document**
   - [`docs/06_IMPLEMENTATION_PLAN.md`](docs/06_IMPLEMENTATION_PLAN.md) — **#6 Implementation Plan Document**

---

## Project Folder Structure

```text
video_downloader_app/
├── main.py                      # Entry point (PyQt6 desktop GUI + WebSocket bridge + --web server)
├── gui/
│   ├── main_window.py           # Main InsightOS-styled PyQt6 window, queue & sidebar
│   ├── dashboards_tab.py        # Custom QPainter adapted analytical dashboards
│   ├── mini_taskbar.py          # Frameless always-on-top IDM-style floating popup
│   ├── transcript_tab.py        # Instant caption-to-transcript studio (youtubetotranscript style)
│   ├── settings_dialog.py       # Preferences modal (output folder, theme, WS port, FFmpeg)
│   ├── theme.py                 # System/Dark/Light theme detector & QSS stylesheet generator
│   └── resources/               # App icons & platform SVGs (YouTube, FB, TikTok, Anime)
├── core/
│   ├── downloader.py            # yt-dlp Python API wrapper, progress hooks, retries & FFmpeg burn
│   ├── transcriptor.py          # VTT/SRT subtitle fetcher & rolling-caption deduplicator
│   ├── url_handler.py           # URL validation, normalization & platform auto-detection
│   ├── clipboard_monitor.py     # Background clipboard watcher fallback
│   └── telemetry.py             # SQLite analytical store powering all 6 dashboards
├── server/
│   ├── websocket_server.py      # Asyncio WebSocket server (ws://127.0.0.1:8765)
│   ├── dashboard_web.py         # Live aiohttp Web Dashboard & REST API (0.0.0.0:8080)
│   ├── web_ui_template.py       # Self-contained InsightOS + Founder Stack web frontend
│   └── extension/               # Full browser extension code
│       ├── chrome/              # Chrome / Edge / Brave (Manifest V3)
│       │   ├── manifest.json
│       │   ├── background.js
│       │   ├── content.js
│       │   ├── popup.html
│       │   ├── popup.js
│       │   └── icons/
│       └── firefox/             # Firefox (Manifest V2)
│           ├── manifest.json
│           ├── background.js
│           ├── content.js
│           ├── popup.html
│           ├── popup.js
│           └── icons/
├── utils/
│   ├── config.py                # Thread-safe JSON config & automatic FFmpeg discovery
│   ├── logger.py                # Rotating file logger + live GUI ring buffer
│   └── system_tray.py           # QSystemTrayIcon + plyer desktop notification fallback
├── docs/                        # 6 structured engineering specification documents
├── tests/                       # Automated pytest suite
├── scripts/
│   └── publish_new_repo.sh      # Helper script to push standalone GitHub repository
├── requirements.txt             # Pinned Python 3.10+ dependencies
├── README.md                    # Documentation
└── build.py                     # PyInstaller single-executable packaging script
```

---

## Installation

### 1. Prerequisites
- **Python 3.10+** (`3.10`, `3.11`, or `3.12`)
- **FFmpeg**: Automatically provided out-of-the-box via `imageio-ffmpeg` in `requirements.txt`! You may also install system FFmpeg if preferred:
  - **Windows**: `winget install Gyan.FFmpeg`
  - **macOS**: `brew install ffmpeg`
  - **Ubuntu / Debian**: `sudo apt install ffmpeg`

### 2. Install Python Dependencies
```bash
cd video_downloader_app
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

---

## Running the Application

### Launch Native Desktop GUI (PyQt6 + System Tray + WebSocket Bridge)
```bash
cd video_downloader_app
python main.py
```
- Start minimized directly to the system tray:
  ```bash
  python main.py --minimized
  ```

### Launch Live Browser Dashboard Mode (Headless / Cloud Preview)
```bash
cd video_downloader_app
python main.py --web --port 8080 --ws-port 8765
```
Open `http://localhost:8080` to use the interactive InsightOS & Founder Stack dashboards, downloader queue, VTT transcript studio, and IDM mini-taskbar simulator in any browser.

---

## Setting Up the Browser Extensions (IDM-Style Mini-Taskbar)

### Chrome / Microsoft Edge / Brave (Manifest V3)
1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select `video_downloader_app/server/extension/chrome`.
5. Play any video on YouTube, Facebook, TikTok, Crunchyroll, HiAnime, etc.:
   - Hovering over a video player displays the **`● Download with VDownloader`** pill button directly on the player.
   - Starting playback automatically notifies `ws://127.0.0.1:8765` and pops up the frameless **Mini-Taskbar** near your system clock!

### Mozilla Firefox (Manifest V2)
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `video_downloader_app/server/extension/firefox/manifest.json`.
4. Verify the toolbar icon shows a green **`ON`** badge when `VDownloader OS` is running.

### Automatic Clipboard Fallback (No Extension Needed)
Even without installing the browser extension, copying any supported video URL (`Ctrl+C` / `Cmd+C`) triggers the background `ClipboardMonitor`, displaying a system-tray notification and the floating **Mini-Taskbar**!

---

## Feature Guide

- **Downloading Videos (`144p` – `8K` & Audio)**:
  1. Open **Video Downloader** in the sidebar (or press `Ctrl+Space` in the top search bar).
  2. Paste a URL — the **Platform Auto-Detection** badge immediately identifies YouTube, Facebook, TikTok, Anime Stream, etc.
  3. Click **Fetch Info** to load exact resolution/FPS/codec combinations (`4320p`, `2160p`, `1440p`, `1080p`, `720p`, ..., `144p`) or choose **Audio Only (MP3 / M4A)**.
  4. Select subtitle options (*Embed soft track*, *Hardcode/burn via FFmpeg*, *Save separate `.srt`*, *Include auto-captions*) and click **Download Now**.
- **Extracting Transcripts (Without Video Download)**:
  1. Open **Transcript Studio** in the sidebar.
  2. Paste any video URL, choose your preferred language (e.g. `en`), keep **Auto-generated captions** checked, and click **Extract Transcript**.
  3. Use **Copy Plain Text**, **Copy with Timestamps**, **Save as `.txt`**, or **Save as `.srt`**.

---

## Building a Single Executable with PyInstaller

Package **VDownloader OS** (including icons, companion extensions, and bundled FFmpeg binary) into a standalone single-file executable:

```bash
cd video_downloader_app

# Validate PyInstaller arguments (dry run)
python build.py --dry-run

# Build standalone executable in dist/VDownloaderOS (.exe on Windows)
python build.py
```

---

## Running Automated Tests

```bash
pytest video_downloader_app/tests -v
```
