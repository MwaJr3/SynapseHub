"""Core video downloading, transcript extraction, URL detection, clipboard, and telemetry engines."""

from .clipboard_monitor import ClipboardMonitor
from .downloader import (
    DownloadOptions,
    DownloadProgress,
    DownloadQueueManager,
    DownloadTask,
    FormatChoice,
    VideoDownloader,
    VideoMetadata,
)
from .telemetry import TelemetryStore
from .transcriptor import TranscriptCue, TranscriptExtractor, TranscriptResult
from .url_handler import PlatformInfo, URLHandler

__all__ = [
    "ClipboardMonitor",
    "DownloadOptions",
    "DownloadProgress",
    "DownloadQueueManager",
    "DownloadTask",
    "FormatChoice",
    "PlatformInfo",
    "TelemetryStore",
    "TranscriptCue",
    "TranscriptExtractor",
    "TranscriptResult",
    "URLHandler",
    "VideoDownloader",
    "VideoMetadata",
]
