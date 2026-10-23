# #3 App Flow Document

## 1. Overview
This document maps what happens when a user interacts with **VDownloader OS** — from playing a video in Chrome/Firefox, to clicking the IDM-style mini-taskbar, extracting clean transcripts, queuing multi-resolution downloads, and inspecting real-time telemetry.

## 2. Key User Journeys
Covers the five primary paths through the application:
1. **Browser Extension -> Floating Mini-Taskbar -> One-Click Download**
2. **Clipboard Fallback -> Tray Alert & Mini-Taskbar**
3. **Manual URL Paste -> Format Matrix (`144p`–`8K`) -> Queued Download with Subtitles**
4. **Standalone Transcript Studio -> Copy Plain / Timestamped / Export `.srt`**
5. **InsightOS & Founder Telemetry Navigation**

## 3. Step-by-Step User & System Flows

### Journey A: IDM-Style Browser Video Detection
```text
[Browser <video> plays or user hovers video player]
       │
       ▼
[content.js extracts canonical window.location.href + og:title + poster]
       │  chrome.runtime.sendMessage()
       ▼
[background.js dispatches JSON over ws://127.0.0.1:8765]
       │
       ▼
[ExtensionWebSocketServer validates URL via URLHandler & deduplicates cooldown]
       │  Qt Signal (browserEventReceived)
       ▼
[MiniTaskbarWindow fades in at bottom-right above taskbar (no focus steal, 15s timer)]
       ├──► User clicks "Dismiss" or 15s elapses ──► Popup hides cleanly
       └──► User clicks "⬇ Download" ──► MainWindow restores, pre-fills URL & runs InfoFetchWorker
```

### Journey B: Manual Stream Download & Subtitle Pipeline
```text
[Paste URL in Video Downloader] ──► [Platform Badge updates instantly via URLHandler]
       │
       ├──► Click "Fetch Info" ──► [InfoFetchWorker populates 144p..8K + MP3/M4A + Sub langs]
       │
       ▼
[Select Quality + Subtitle Options (Soft Embed / Hardcode Burn / Separate .srt)]
       │
       ▼
[DownloadQueueManager Worker Thread]
  1. yt_dlp.YoutubeDL downloads & merges best video+audio
  2. Soft-embed remuxes to MP4/MKV OR Hardcode runs `ffmpeg -vf subtitles=...`
  3. On transient error -> Exponential backoff retry (1s, 2s, 4s)
  4. Saves to ~/Downloads/Videos, records SQLite telemetry & triggers desktop notification
```

### Journey C: Instant Transcript Extraction (No Video Download)
```text
[Open Transcript Studio -> Paste URL -> Choose Language + Auto-Captions ON]
       │
       ▼
[TranscriptWorker runs yt-dlp (skip_download=True, writesubtitles=True, writeautomaticsub=True)]
       │
       ▼
[TranscriptExtractor parses .vtt/.srt -> strips <c> tags -> removes rolling duplicates]
       │
       ▼
[Scrollable Viewer] ──► [Copy Plain Text] | [Copy with Timestamps] | [Save .txt / .srt]
```
