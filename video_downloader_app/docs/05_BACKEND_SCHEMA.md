# #5 Backend Schema Document

## 1. Overview
This document defines where local application state, SQLite telemetry records, JSON configuration, and WebSocket browser-bridge messages live, how they relate to one another, and how security boundaries are enforced.

## 2. Data Model (SQLite `telemetry.sqlite3`)

```text
┌───────────────────────────┐       ┌───────────────────────────┐
│         downloads         │       │        transcripts        │
├───────────────────────────┤       ├───────────────────────────┤
│ id (PK INTEGER)           │       │ id (PK INTEGER)           │
│ url (TEXT)                │       │ url (TEXT)                │
│ title (TEXT)              │       │ title (TEXT)              │
│ channel (TEXT)            │       │ language (TEXT)           │
│ platform (TEXT)           │       │ is_auto (INTEGER 0/1)     │
│ category (TEXT)           │       │ cue_count (INTEGER)       │
│ resolution (TEXT)         │       │ word_count (INTEGER)      │
│ size_bytes (INTEGER)      │       │ elapsed_sec (REAL)        │
│ speed_bps (REAL)          │       │ created_at (REAL)         │
│ has_subtitles (INTEGER)   │       └───────────────────────────┘
│ health_score (INTEGER)    │
│ status (TEXT)             │       ┌───────────────────────────┐
│ created_at (REAL)         │       │      latency_samples      │
└───────────────────────────┘       ├───────────────────────────┤
                                    │ id (PK INTEGER)           │
┌───────────────────────────┐       │ metric_type (TEXT)        │
│     changelog_entries     │       │ elapsed_sec (REAL)        │
├───────────────────────────┤       │ created_at (REAL)         │
│ id (PK INTEGER)           │       └───────────────────────────┘
│ tag ('NEW'|'IMPROVED'|..) │
│ version (TEXT)            │       ┌───────────────────────────┐
│ title (TEXT)              │       │      activity_events      │
│ description (TEXT)        │       ├───────────────────────────┤
│ released_label (TEXT)     │       │ id (PK INTEGER)           │
└───────────────────────────┘       │ event_type (TEXT)         │
                                    │ headline (TEXT)           │
                                    │ detail (TEXT)             │
                                    │ created_at (REAL)         │
                                    └───────────────────────────┘
```

### WebSocket Wire Protocol (`ws://127.0.0.1:8765`)
- **Extension -> Python App**:
  ```json
  {
    "type": "video_detected",
    "url": "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    "title": "Big Buck Bunny 60fps 4K",
    "thumbnail": "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg",
    "duration": 634.5,
    "trigger": "playback"
  }
  ```
- **Python App -> Extension**:
  ```json
  {
    "type": "ack",
    "accepted": true,
    "platform": { "slug": "youtube", "display_name": "YouTube" },
    "url": "https://www.youtube.com/watch?v=aqz-KE-bpKQ"
  }
  ```

## 3. Access Control & Local Security

| Actor / Component | WebSocket Bridge | SQLite Telemetry | Config JSON | Media Filesystem |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop GUI (`MainWindow`)** | Full control | Read / Write | Read / Write | Write to `download_dir` |
| **Browser Extension** | Localhost `127.0.0.1` submit only | None (indirect event log) | None | None |
| **Clipboard Monitor** | None | None | Read toggle | None |

- The WebSocket bridge binds strictly to loopback (`127.0.0.1`) so external LAN devices cannot inject URLs.
- File output names use `yt-dlp`'s length-capped sanitized template `%(title).180B [%(id)s].%(ext)s`.

## 4. Data Storage Locations
- **Config JSON**: `~/.vdownloader_os/config.json` (atomic `.json.tmp` rename writes)
- **SQLite Telemetry**: `~/.vdownloader_os/telemetry.sqlite3`
- **Rotating Logs**: `~/.vdownloader_os/logs/vdownloader.log` (5 MB × 3 backups)
- **Downloaded Media**: `~/Downloads/Videos/` (user-configurable)
