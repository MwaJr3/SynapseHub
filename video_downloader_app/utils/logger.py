"""Centralized rotating file logger and live GUI log stream for VDownloader OS."""

from __future__ import annotations

import logging
import threading
from collections import deque
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any, Callable

from .config import get_default_data_dir


@dataclass(frozen=True)
class LogEntry:
    """Structured log item surfaced in both the file log and GUI Logs tab."""

    timestamp: str
    level: str
    component: str
    message: str

    def format_line(self) -> str:
        return f"[{self.timestamp}] [{self.level:<7}] ({self.component}) {self.message}"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class GuiRingBufferHandler(logging.Handler):
    """Custom logging handler storing recent entries in memory and notifying GUI subscribers."""

    def __init__(self, max_entries: int = 1000) -> None:
        super().__init__()
        self._lock = threading.RLock()
        self._entries: deque[LogEntry] = deque(maxlen=max_entries)
        self._subscribers: list[Callable[[LogEntry], None]] = []

    def emit(self, record: logging.LogRecord) -> None:
        try:
            ts = datetime.fromtimestamp(record.created, tz=timezone.utc).astimezone().strftime(
                "%Y-%m-%d %H:%M:%S"
            )
            component = record.name.replace("vdownloader.", "") if record.name else "core"
            entry = LogEntry(
                timestamp=ts,
                level=record.levelname,
                component=component,
                message=record.getMessage(),
            )
            with self._lock:
                self._entries.append(entry)
                subscribers = list(self._subscribers)
            for callback in subscribers:
                try:
                    callback(entry)
                except Exception:
                    pass
        except Exception:
            self.handleError(record)

    def get_recent(self, limit: int = 300, level_filter: str | None = None) -> list[LogEntry]:
        with self._lock:
            items = list(self._entries)
        if level_filter and level_filter.upper() != "ALL":
            target = level_filter.upper()
            items = [item for item in items if item.level == target]
        return items[-limit:]

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()

    def subscribe(self, callback: Callable[[LogEntry], None]) -> Callable[[], None]:
        with self._lock:
            self._subscribers.append(callback)

        def _unsubscribe() -> None:
            with self._lock:
                if callback in self._subscribers:
                    self._subscribers.remove(callback)

        return _unsubscribe


class AppLogger:
    """Singleton-style logging coordinator managing file rotation and GUI ring buffer."""

    _instance: AppLogger | None = None
    _init_lock = threading.Lock()

    def __init__(self, log_dir: Path | None = None) -> None:
        base_dir = log_dir or (get_default_data_dir() / "logs")
        base_dir.mkdir(parents=True, exist_ok=True)
        self.log_file = base_dir / "vdownloader.log"
        self.ring_handler = GuiRingBufferHandler(max_entries=1200)

        self.root_logger = logging.getLogger("vdownloader")
        self.root_logger.setLevel(logging.DEBUG)
        self.root_logger.propagate = False

        if not self.root_logger.handlers:
            formatter = logging.Formatter(
                fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
            file_handler = RotatingFileHandler(
                self.log_file,
                maxBytes=5 * 1024 * 1024,
                backupCount=3,
                encoding="utf-8",
            )
            file_handler.setLevel(logging.DEBUG)
            file_handler.setFormatter(formatter)

            console_handler = logging.StreamHandler()
            console_handler.setLevel(logging.INFO)
            console_handler.setFormatter(formatter)

            self.ring_handler.setLevel(logging.INFO)

            self.root_logger.addHandler(file_handler)
            self.root_logger.addHandler(console_handler)
            self.root_logger.addHandler(self.ring_handler)

    @classmethod
    def instance(cls, log_dir: Path | None = None) -> AppLogger:
        with cls._init_lock:
            if cls._instance is None:
                cls._instance = cls(log_dir=log_dir)
            return cls._instance

    def child(self, component: str) -> logging.Logger:
        return self.root_logger.getChild(component)


def get_logger(component: str = "app") -> logging.Logger:
    """Return a named component logger under ``vdownloader.<component>``."""
    return AppLogger.instance().child(component)
