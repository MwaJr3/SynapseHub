# #1 Product Requirement Document (PRD)

## 1. Overview
This document outlines what **VDownloader OS** does, feature by feature. It defines the expected functionality, supported streaming platforms, user experience, and analytical dashboard capabilities of the desktop application and companion browser extensions.

## 2. Product Goal
Build a production-ready, cross-platform desktop video downloader, subtitle/transcript extractor, and real-time media telemetry suite supporting **YouTube, Facebook, TikTok, anime streaming websites (Crunchyroll, HiAnime, Bilibili, Niconico), and 1,800+ streaming platforms** — complete with an **Internet Download Manager (IDM)–style floating mini-taskbar**.

## 3. Features

| Feature | Description | Expected Behavior |
| :--- | :--- | :--- |
| **Universal Stream Downloader** | Downloads videos from 144p up to 8K UHD (4320p) plus Audio-Only MP3/M4A. | Auto-detects source platform, lists resolutions/FPS/codecs via `yt-dlp`, merges streams via FFmpeg, and updates real-time progress bar with speed & ETA. |
| **Subtitle Soft-Embed & Burn** | Downloads manual or auto-generated captions as separate `.srt`, soft-embedded tracks, or burned-in frames. | Uses `FFmpegEmbedSubtitle` (auto-remuxing to MP4/MKV when required) or FFmpeg `-vf subtitles=...` filter for hardcoded burns. |
| **Transcript Studio** | Dedicated caption-to-transcript workflow (inspired by `youtubetotranscript.com`). | Fetches VTT/SRT with `--skip-download`, strips inline word tags, deduplicates YouTube's rolling 2-line captions, and supports Copy Plain, Copy w/ Timestamps, and `.txt`/`.srt` export. |
| **IDM-Style Mini-Taskbar** | Frameless, always-on-top bottom-right floating popup near the system clock. | Appears without stealing focus when a `<video>` plays in Chrome/Edge/Firefox or when a supported URL is copied to clipboard; auto-dismisses after 15s. |
| **Browser Extension Bridge** | Companion Chrome/Edge (Manifest V3) and Firefox (Manifest V2) extensions. | Detects active `<video>` playback + renders an optional `"Download with VDownloader"` hover pill over video players, dispatching page URLs over `ws://127.0.0.1:8765`. |
| **Adapted Analytical Dashboards** | 6 integrated telemetry & operational boards adapted from InsightOS & Founder Stack designs. | Displays Smart Media Distribution, Live Metrics, Sources & Channels Hub, Engine & FFmpeg Health, UI/Bridge Latency, and Live Changelog. |
| **System Tray & Resilience** | Persistent `QSystemTrayIcon`, clipboard fallback watcher, and exponential backoff retries. | Minimizes cleanly to tray on close, retries transient stream errors (`1s -> 2s -> 4s`), logs operations to rotating files, and sends desktop completion alerts. |
