"""Background system clipboard watcher for fallback video URL detection."""

from __future__ import annotations

import threading
import time
from collections import deque
from typing import Callable

from ..utils.logger import get_logger
from .url_handler import PlatformInfo, URLHandler

logger = get_logger("clipboard")


class ClipboardMonitor:
    """Monitors the system clipboard for copied video URLs and emits callbacks."""

    def __init__(
        self,
        on_video_url_detected: Callable[[str, PlatformInfo], None],
        poll_interval_sec: float = 1.2,
        enabled: bool = True,
    ) -> None:
        self._callback = on_video_url_detected
        self._poll_interval = max(0.4, poll_interval_sec)
        self._enabled = enabled
        self._running = False
        self._thread: threading.Thread | None = None
        self._lock = threading.Lock()
        self._seen_urls: deque[str] = deque(maxlen=64)
        self._last_raw_text: str = ""
        self._backend_available: bool = True

    @property
    def enabled(self) -> bool:
        return self._enabled

    @enabled.setter
    def enabled(self, value: bool) -> None:
        self._enabled = bool(value)

    @property
    def is_backend_available(self) -> bool:
        return self._backend_available

    def mark_seen(self, url: str) -> None:
        """Prevent self-copied URLs from re-triggering the mini-taskbar popup."""
        normalized = URLHandler.normalize_url(url)
        if normalized:
            with self._lock:
                self._seen_urls.append(normalized)

    def read_clipboard_safe(self) -> str:
        """Read text from system clipboard via pyperclip, failing silently on headless servers."""
        try:
            import pyperclip

            text = pyperclip.paste()
            self._backend_available = True
            return text if isinstance(text, str) else ""
        except Exception as exc:
            if self._backend_available:
                logger.debug("Clipboard backend unavailable in current environment: %s", exc)
                self._backend_available = False
            return ""

    def copy_to_clipboard_safe(self, text: str) -> bool:
        """Copy text to system clipboard using pyperclip."""
        try:
            import pyperclip

            pyperclip.copy(text)
            self._last_raw_text = text
            self._backend_available = True
            return True
        except Exception as exc:
            logger.debug("pyperclip.copy unavailable: %s", exc)
            return False

    def inspect_text_once(self, raw_text: str) -> bool:
        """Evaluate clipboard text and invoke callback if a new supported video URL is found."""
        if not self._enabled or not raw_text or raw_text == self._last_raw_text:
            return False

        self._last_raw_text = raw_text
        candidate = URLHandler.extract_first_url(raw_text)
        if not candidate:
            return False

        normalized = URLHandler.normalize_url(candidate)
        if not URLHandler.is_probable_video_page(normalized):
            return False

        with self._lock:
            if normalized in self._seen_urls:
                return False
            self._seen_urls.append(normalized)

        platform = URLHandler.detect_platform(normalized)
        logger.info("Clipboard detected %s video URL: %s", platform.display_name, normalized)
        try:
            self._callback(normalized, platform)
        except Exception as exc:
            logger.warning("Clipboard URL callback error: %s", exc)
        return True

    def start(self) -> None:
        if self._running:
            return
        # Prime initial clipboard content so pre-existing link does not pop up on launch
        initial = self.read_clipboard_safe()
        self._last_raw_text = initial
        first_url = URLHandler.extract_first_url(initial)
        if first_url:
            self.mark_seen(first_url)

        self._running = True
        self._thread = threading.Thread(
            target=self._poll_loop,
            name="vdl_clipboard_monitor",
            daemon=True,
        )
        self._thread.start()
        logger.info("Clipboard monitor started (interval=%.1fs).", self._poll_interval)

    def stop(self) -> None:
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)

    def _poll_loop(self) -> None:
        while self._running:
            if self._enabled:
                current = self.read_clipboard_safe()
                if current:
                    self.inspect_text_once(current)
            time.sleep(self._poll_interval)
