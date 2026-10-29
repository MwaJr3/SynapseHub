"""Application configuration and automatic FFmpeg discovery for VDownloader OS."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import threading
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Callable


def get_default_data_dir() -> Path:
    """Return the persistent runtime data directory for config, logs, and SQLite."""
    env_override = os.environ.get("VDOWNLOADER_DATA_DIR")
    if env_override:
        path = Path(env_override).expanduser().resolve()
    else:
        path = (Path.home() / ".vdownloader_os").resolve()
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_default_download_dir() -> str:
    """Return the default video output directory (`~/Downloads/Videos`)."""
    target = Path.home() / "Downloads" / "Videos"
    try:
        target.mkdir(parents=True, exist_ok=True)
    except OSError:
        target = Path.cwd() / "downloads"
        target.mkdir(parents=True, exist_ok=True)
    return str(target)


def resolve_ffmpeg_path(custom_path: str = "", data_dir: Path | None = None) -> str | None:
    """Locate a working FFmpeg binary via custom path, system PATH, or imageio-ffmpeg.

    When falling back to ``imageio-ffmpeg`` (whose binary name includes platform/version),
    creates a clean ``ffmpeg`` symlink/shim inside ``<data_dir>/bin`` so ``yt-dlp`` and
    direct subprocess calls always find ``ffmpeg`` seamlessly.
    """
    if custom_path:
        candidate = Path(custom_path).expanduser()
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return str(candidate.resolve())
        if candidate.is_dir():
            exe_name = "ffmpeg.exe" if sys.platform.startswith("win") else "ffmpeg"
            inner = candidate / exe_name
            if inner.is_file() and os.access(inner, os.X_OK):
                return str(inner.resolve())

    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg

    try:
        import imageio_ffmpeg

        bundled = Path(imageio_ffmpeg.get_ffmpeg_exe())
        if bundled.is_file():
            base_dir = data_dir or get_default_data_dir()
            bin_dir = base_dir / "bin"
            bin_dir.mkdir(parents=True, exist_ok=True)
            exe_name = "ffmpeg.exe" if sys.platform.startswith("win") else "ffmpeg"
            alias_path = bin_dir / exe_name
            if not alias_path.exists():
                try:
                    alias_path.symlink_to(bundled)
                except OSError:
                    shutil.copy2(bundled, alias_path)
                    alias_path.chmod(0o755)
            return str(alias_path)
    except Exception:
        pass

    return None


def probe_ffmpeg_version(ffmpeg_path: str | None = None) -> dict[str, Any]:
    """Return diagnostic metadata for the resolved FFmpeg installation."""
    resolved = ffmpeg_path or resolve_ffmpeg_path()
    if not resolved:
        return {
            "available": False,
            "path": None,
            "version": "Not installed",
            "source": "missing",
        }
    source = "imageio-ffmpeg" if ".vdownloader_os" in resolved or "imageio_ffmpeg" in resolved else "system"
    try:
        proc = subprocess.run(
            [resolved, "-version"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        first_line = (proc.stdout or "").splitlines()[0] if proc.stdout else "FFmpeg available"
        return {
            "available": proc.returncode == 0,
            "path": resolved,
            "version": first_line.strip(),
            "source": source,
        }
    except Exception as exc:
        return {
            "available": False,
            "path": resolved,
            "version": f"Error: {exc}",
            "source": source,
        }


@dataclass
class AppConfig:
    """Strongly typed application settings persisted as JSON."""

    download_dir: str = field(default_factory=get_default_download_dir)
    default_subtitle_lang: str = "en"
    default_format: str = "best"  # best | ask | 2160p | 1080p | 720p | audio_mp3 | audio_m4a
    theme_mode: str = "system"  # dark | light | system
    mini_taskbar_enabled: bool = True
    mini_taskbar_timeout_sec: int = 15
    clipboard_monitor_enabled: bool = True
    clipboard_poll_interval_ms: int = 1200
    websocket_host: str = "127.0.0.1"
    websocket_port: int = 8765
    web_dashboard_host: str = "0.0.0.0"
    web_dashboard_port: int = 8080
    embed_subtitles_default: bool = False
    hardcode_subtitles_default: bool = False
    save_separate_subtitles_default: bool = False
    auto_subtitles_default: bool = True
    minimize_to_tray_on_close: bool = True
    desktop_notifications_enabled: bool = True
    max_retries: int = 3
    concurrent_downloads: int = 2
    ffmpeg_path: str = ""

    def validate(self) -> None:
        """Clamp and normalize configuration values."""
        if self.theme_mode not in {"dark", "light", "system"}:
            self.theme_mode = "system"
        if self.default_format not in {
            "best",
            "ask",
            "4320p",
            "2160p",
            "1440p",
            "1080p",
            "720p",
            "480p",
            "audio_mp3",
            "audio_m4a",
        }:
            self.default_format = "best"
        self.websocket_port = max(1024, min(65535, int(self.websocket_port)))
        self.web_dashboard_port = max(1024, min(65535, int(self.web_dashboard_port)))
        self.mini_taskbar_timeout_sec = max(5, min(120, int(self.mini_taskbar_timeout_sec)))
        self.max_retries = max(0, min(10, int(self.max_retries)))
        self.concurrent_downloads = max(1, min(6, int(self.concurrent_downloads)))
        if not self.default_subtitle_lang.strip():
            self.default_subtitle_lang = "en"


class ConfigManager:
    """Thread-safe JSON configuration store with observer notifications."""

    def __init__(self, config_path: Path | str | None = None) -> None:
        self._lock = threading.RLock()
        self._listeners: list[Callable[[AppConfig], None]] = []
        if config_path is not None:
            self.config_path = Path(config_path).expanduser().resolve()
            self.data_dir = self.config_path.parent
        else:
            self.data_dir = get_default_data_dir()
            self.config_path = self.data_dir / "config.json"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._config = self._load_or_initialize()

    def _load_or_initialize(self) -> AppConfig:
        if self.config_path.is_file():
            try:
                raw = json.loads(self.config_path.read_text(encoding="utf-8"))
                valid_keys = {f.name for f in AppConfig.__dataclass_fields__.values()}
                filtered = {k: v for k, v in raw.items() if k in valid_keys}
                cfg = AppConfig(**filtered)
                cfg.validate()
                return cfg
            except Exception:
                pass
        cfg = AppConfig()
        cfg.validate()
        self._write_disk(cfg)
        return cfg

    def _write_disk(self, cfg: AppConfig) -> None:
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = self.config_path.with_suffix(".json.tmp")
        tmp_path.write_text(json.dumps(asdict(cfg), indent=2), encoding="utf-8")
        tmp_path.replace(self.config_path)

    @property
    def config(self) -> AppConfig:
        with self._lock:
            return AppConfig(**asdict(self._config))

    def get(self, key: str, default: Any = None) -> Any:
        with self._lock:
            return getattr(self._config, key, default)

    def update(self, **kwargs: Any) -> AppConfig:
        """Update one or more configuration fields, persist to disk, and notify listeners."""
        with self._lock:
            current = asdict(self._config)
            for key, value in kwargs.items():
                if key in current:
                    current[key] = value
            updated = AppConfig(**current)
            updated.validate()
            Path(updated.download_dir).expanduser().mkdir(parents=True, exist_ok=True)
            self._config = updated
            self._write_disk(updated)
            listeners = list(self._listeners)

        snapshot = AppConfig(**asdict(updated))
        for callback in listeners:
            try:
                callback(snapshot)
            except Exception:
                pass
        return snapshot

    def subscribe(self, listener: Callable[[AppConfig], None]) -> Callable[[], None]:
        """Register a listener invoked whenever settings change. Returns an unsubscribe callable."""
        with self._lock:
            self._listeners.append(listener)

        def _unsubscribe() -> None:
            with self._lock:
                if listener in self._listeners:
                    self._listeners.remove(listener)

        return _unsubscribe

    def get_ffmpeg_executable(self) -> str | None:
        """Resolve FFmpeg using configured override, system PATH, or imageio-ffmpeg."""
        with self._lock:
            custom = self._config.ffmpeg_path
        return resolve_ffmpeg_path(custom_path=custom, data_dir=self.data_dir)
