"""Production yt-dlp Python API downloader, format resolver, subtitle burner, and queue manager."""

from __future__ import annotations

import subprocess
import threading
import time
import uuid
from concurrent.futures import Future, ThreadPoolExecutor
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Callable

import yt_dlp

from ..utils.config import ConfigManager, resolve_ffmpeg_path
from ..utils.logger import get_logger
from .url_handler import PlatformInfo, URLHandler

logger = get_logger("downloader")


def format_bytes(num_bytes: float | int | None) -> str:
    """Format byte counts into human-readable units (KB, MB, GB)."""
    if not num_bytes or num_bytes <= 0:
        return "—"
    value = float(num_bytes)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if value < 1024.0:
            return f"{value:.1f} {unit}" if unit != "B" else f"{int(value)} B"
        value /= 1024.0
    return f"{value:.2f} PB"


def format_eta(seconds: float | int | None) -> str:
    """Format ETA seconds into ``MM:SS`` or ``HH:MM:SS``."""
    if seconds is None or seconds < 0:
        return "—"
    total = int(seconds)
    hrs, rem = divmod(total, 3600)
    mins, secs = divmod(rem, 60)
    if hrs > 0:
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"


@dataclass(frozen=True)
class FormatChoice:
    """Selectable video+audio or audio-only output format option."""

    choice_id: str
    label: str
    ydl_format: str
    container: str
    resolution: str
    height: int
    fps: float
    vcodec: str
    acodec: str
    filesize_approx: int | None = None
    audio_only: str = ""  # "" | "mp3" | "m4a"

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["filesize_human"] = format_bytes(self.filesize_approx)
        return data


@dataclass
class VideoMetadata:
    """Extracted stream information, format choices, and available subtitle tracks."""

    url: str
    webpage_url: str
    video_id: str
    title: str
    uploader: str
    duration_seconds: int
    view_count: int
    thumbnail_url: str
    platform: PlatformInfo
    formats: list[FormatChoice]
    manual_subtitles: list[str]
    auto_subtitles: list[str]
    fetch_elapsed_sec: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "url": self.url,
            "webpage_url": self.webpage_url,
            "video_id": self.video_id,
            "title": self.title,
            "uploader": self.uploader,
            "duration_seconds": self.duration_seconds,
            "duration_human": format_eta(self.duration_seconds) if self.duration_seconds else "Live / —",
            "view_count": self.view_count,
            "thumbnail_url": self.thumbnail_url,
            "platform": self.platform.to_dict(),
            "formats": [f.to_dict() for f in self.formats],
            "manual_subtitles": self.manual_subtitles,
            "auto_subtitles": self.auto_subtitles,
            "fetch_elapsed_sec": round(self.fetch_elapsed_sec, 3),
        }


@dataclass
class DownloadOptions:
    """User-selected options for a single queued download task."""

    url: str
    output_dir: str
    format_choice: FormatChoice | None = None
    ydl_format_override: str = ""
    audio_only: str = ""  # "" | "mp3" | "m4a"
    subtitle_lang: str = "en"
    embed_subtitles: bool = False
    hardcode_subtitles: bool = False
    save_separate_subtitles: bool = False
    include_auto_subtitles: bool = True
    title_hint: str = ""
    platform_hint: str = ""


@dataclass
class DownloadProgress:
    """Real-time progress snapshot emitted by yt-dlp's progress_hooks."""

    task_id: str
    status: str  # queued | downloading | postprocessing | retrying | completed | failed | cancelled
    percent: float = 0.0
    downloaded_bytes: int = 0
    total_bytes: int = 0
    speed_bps: float = 0.0
    eta_seconds: int | None = None
    filename: str = ""
    attempt: int = 1
    max_attempts: int = 3
    message: str = ""
    error: str = ""

    @property
    def speed_human(self) -> str:
        return f"{format_bytes(self.speed_bps)}/s" if self.speed_bps > 0 else "—"

    @property
    def eta_human(self) -> str:
        return format_eta(self.eta_seconds)

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["speed_human"] = self.speed_human
        data["eta_human"] = self.eta_human
        data["downloaded_human"] = format_bytes(self.downloaded_bytes)
        data["total_human"] = format_bytes(self.total_bytes)
        return data


@dataclass
class DownloadTask:
    """Tracked download job inside the queue manager."""

    task_id: str
    options: DownloadOptions
    title: str
    platform_name: str
    resolution_label: str
    created_at: float = field(default_factory=time.time)
    completed_at: float | None = None
    progress: DownloadProgress = field(init=False)
    cancel_requested: bool = False

    def __post_init__(self) -> None:
        self.progress = DownloadProgress(
            task_id=self.task_id,
            status="queued",
            message="Waiting in download queue",
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "task_id": self.task_id,
            "url": self.options.url,
            "title": self.title,
            "platform_name": self.platform_name,
            "resolution_label": self.resolution_label,
            "output_dir": self.options.output_dir,
            "embed_subtitles": self.options.embed_subtitles,
            "hardcode_subtitles": self.options.hardcode_subtitles,
            "save_separate_subtitles": self.options.save_separate_subtitles,
            "subtitle_lang": self.options.subtitle_lang,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
            "progress": self.progress.to_dict(),
        }


class DownloadCancelledError(Exception):
    """Raised inside yt-dlp progress hook when user cancels an active task."""


class VideoDownloader:
    """Stateless/reusable wrapper around `yt_dlp.YoutubeDL` for metadata & downloads."""

    def __init__(self, ffmpeg_path: str | None = None) -> None:
        self.ffmpeg_path = ffmpeg_path or resolve_ffmpeg_path()

    def fetch_info(self, raw_url: str, quick: bool = False) -> VideoMetadata:
        """Retrieve video metadata, resolution presets (144p–8K), and subtitle languages."""
        url = URLHandler.normalize_url(raw_url)
        if not URLHandler.is_valid_http_url(url):
            raise ValueError(f"Unsupported or malformed URL: {raw_url!r}")

        t0 = time.perf_counter()
        ydl_opts: dict[str, Any] = {
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "extract_flat": False,
        }
        if self.ffmpeg_path:
            ydl_opts["ffmpeg_location"] = self.ffmpeg_path

        logger.info("Fetching stream info via yt-dlp API: %s", url)
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        if not info:
            raise RuntimeError("Extractor returned empty stream metadata.")

        # Unwrap single-entry playlist wrapper if returned
        if "entries" in info and isinstance(info["entries"], list) and info["entries"]:
            info = info["entries"][0]

        elapsed = time.perf_counter() - t0
        platform = URLHandler.detect_platform(info.get("webpage_url") or url)
        formats = [] if quick else self._build_format_choices(info)
        manual_subs = sorted((info.get("subtitles") or {}).keys())
        auto_subs = sorted((info.get("automatic_captions") or {}).keys())

        metadata = VideoMetadata(
            url=url,
            webpage_url=str(info.get("webpage_url") or url),
            video_id=str(info.get("id") or "stream"),
            title=str(info.get("title") or "Untitled Stream"),
            uploader=str(info.get("uploader") or info.get("channel") or platform.display_name),
            duration_seconds=int(info.get("duration") or 0),
            view_count=int(info.get("view_count") or 0),
            thumbnail_url=str(info.get("thumbnail") or ""),
            platform=platform,
            formats=formats,
            manual_subtitles=manual_subs,
            auto_subtitles=auto_subs,
            fetch_elapsed_sec=elapsed,
        )
        logger.info(
            "Fetched metadata for '%s' (%d format presets, %d subs) in %.2fs",
            metadata.title,
            len(formats),
            len(manual_subs) + len(auto_subs),
            elapsed,
        )
        return metadata

    @staticmethod
    def _build_format_choices(info: dict[str, Any]) -> list[FormatChoice]:
        """Construct clean Video+Audio combinations (8K -> 144p) plus Audio-Only options."""
        choices: list[FormatChoice] = [
            FormatChoice(
                choice_id="best_auto",
                label="Best Available Quality (Auto Video + Audio MP4/MKV)",
                ydl_format="bestvideo+bestaudio/best",
                container="mp4",
                resolution="Best (Up to 8K)",
                height=9999,
                fps=60.0,
                vcodec="auto",
                acodec="auto",
            )
        ]

        raw_formats = info.get("formats") or []
        best_audio_size = 0
        for fmt in raw_formats:
            if fmt.get("vcodec") in (None, "none") and fmt.get("acodec") not in (None, "none"):
                sz = int(fmt.get("filesize") or fmt.get("filesize_approx") or 0)
                best_audio_size = max(best_audio_size, sz)

        # Group video streams by (height, container_preference)
        seen_buckets: dict[tuple[int, str], dict[str, Any]] = {}
        for fmt in raw_formats:
            vcodec = str(fmt.get("vcodec") or "none")
            if vcodec == "none":
                continue
            height = int(fmt.get("height") or 0)
            if height < 144:
                continue
            ext = str(fmt.get("ext") or "mp4").lower()
            container = "webm" if ext == "webm" else "mp4"
            key = (height, container)
            tbr = float(fmt.get("tbr") or 0.0)
            prev = seen_buckets.get(key)
            if prev is None or tbr > float(prev.get("tbr") or 0.0):
                seen_buckets[key] = fmt

        tier_names = {
            4320: "8K UHD",
            2160: "4K UHD",
            1440: "2K QHD",
            1080: "1080p Full HD",
            720: "720p HD",
            480: "480p SD",
            360: "360p",
            240: "240p",
            144: "144p",
        }

        for (height, container), fmt in sorted(
            seen_buckets.items(), key=lambda item: (item[0][0], item[0][1] == "mp4"), reverse=True
        ):
            fmt_id = str(fmt.get("format_id") or "")
            fps = float(fmt.get("fps") or 30.0)
            vcodec = str(fmt.get("vcodec") or "h264").split(".")[0]
            acodec_raw = str(fmt.get("acodec") or "none")
            has_audio = acodec_raw != "none"
            v_size = int(fmt.get("filesize") or fmt.get("filesize_approx") or 0)
            approx_total = (v_size + (0 if has_audio else best_audio_size)) or None

            tier = tier_names.get(height, f"{height}p")
            fps_tag = f" {int(fps)}fps" if fps >= 50 else ""
            size_tag = f" (~{format_bytes(approx_total)})" if approx_total else ""

            if has_audio:
                selector = f"{fmt_id}/bestvideo[height<={height}]+bestaudio/best[height<={height}]"
            elif container == "mp4":
                selector = (
                    f"{fmt_id}+bestaudio[ext=m4a]/"
                    f"bestvideo[height<={height}][ext=mp4]+bestaudio[ext=m4a]/"
                    f"bestvideo[height<={height}]+bestaudio/best[height<={height}]"
                )
            else:
                selector = (
                    f"{fmt_id}+bestaudio/"
                    f"bestvideo[height<={height}]+bestaudio/best[height<={height}]"
                )

            choices.append(
                FormatChoice(
                    choice_id=f"v_{height}_{container}_{fmt_id}",
                    label=f"{tier}{fps_tag} • {container.upper()} ({vcodec}){size_tag}",
                    ydl_format=selector,
                    container=container,
                    resolution=f"{height}p",
                    height=height,
                    fps=fps,
                    vcodec=vcodec,
                    acodec=acodec_raw if has_audio else "aac/opus",
                    filesize_approx=approx_total,
                )
            )

        # Audio-only presets
        choices.extend(
            [
                FormatChoice(
                    choice_id="audio_mp3",
                    label="Audio Only • MP3 (320 kbps High Quality)",
                    ydl_format="bestaudio/best",
                    container="mp3",
                    resolution="Audio MP3",
                    height=0,
                    fps=0.0,
                    vcodec="none",
                    acodec="mp3",
                    filesize_approx=best_audio_size or None,
                    audio_only="mp3",
                ),
                FormatChoice(
                    choice_id="audio_m4a",
                    label="Audio Only • M4A (AAC Lossless Container)",
                    ydl_format="bestaudio[ext=m4a]/bestaudio/best",
                    container="m4a",
                    resolution="Audio M4A",
                    height=0,
                    fps=0.0,
                    vcodec="none",
                    acodec="m4a",
                    filesize_approx=best_audio_size or None,
                    audio_only="m4a",
                ),
            ]
        )
        return choices

    def execute_download(
        self,
        task: DownloadTask,
        on_progress: Callable[[DownloadTask], None] | None = None,
        max_retries: int = 3,
    ) -> Path:
        """Run a download task via yt-dlp with progress hooks, subtitle handling, and retries."""
        opts = task.options
        out_dir = Path(opts.output_dir).expanduser().resolve()
        out_dir.mkdir(parents=True, exist_ok=True)

        choice = opts.format_choice
        audio_mode = opts.audio_only or (choice.audio_only if choice else "")
        ydl_format = (
            opts.ydl_format_override
            or (choice.ydl_format if choice else "")
            or "bestvideo+bestaudio/best"
        )

        # Determine target container when soft-embedding subtitles
        preferred_container = choice.container if choice else "mp4"
        if opts.embed_subtitles and not audio_mode and preferred_container not in {"mp4", "mkv", "mov"}:
            logger.info(
                "Container '%s' has limited soft-subtitle support; remuxing to MKV.",
                preferred_container,
            )
            preferred_container = "mkv"

        want_subs = (
            opts.embed_subtitles or opts.hardcode_subtitles or opts.save_separate_subtitles
        ) and not audio_mode
        lang = (opts.subtitle_lang or "en").strip()
        sub_langs = [lang, f"{lang}-*"]

        postprocessors: list[dict[str, Any]] = []
        if audio_mode in {"mp3", "m4a"}:
            postprocessors.append(
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": audio_mode,
                    "preferredquality": "320" if audio_mode == "mp3" else "0",
                }
            )
        else:
            if want_subs:
                postprocessors.append(
                    {
                        "key": "FFmpegSubtitlesConvertor",
                        "format": "srt",
                    }
                )
            if opts.embed_subtitles and not opts.hardcode_subtitles:
                postprocessors.append(
                    {
                        "key": "FFmpegEmbedSubtitle",
                        "already_have_subtitle": opts.save_separate_subtitles,
                    }
                )

        final_file_holder: list[str] = []

        def _progress_hook(d: dict[str, Any]) -> None:
            if task.cancel_requested:
                raise DownloadCancelledError("Download cancelled by user.")

            state = d.get("status")
            if state == "downloading":
                downloaded = int(d.get("downloaded_bytes") or 0)
                total = int(d.get("total_bytes") or d.get("total_bytes_estimate") or 0)
                pct = (downloaded / total * 100.0) if total > 0 else task.progress.percent
                speed = float(d.get("speed") or 0.0)
                eta = d.get("eta")
                filename = str(d.get("filename") or task.progress.filename)
                task.progress.status = "downloading"
                task.progress.percent = round(min(99.9, max(0.0, pct)), 1)
                task.progress.downloaded_bytes = downloaded
                task.progress.total_bytes = total
                task.progress.speed_bps = speed
                task.progress.eta_seconds = int(eta) if eta is not None else None
                task.progress.filename = filename
                task.progress.message = f"Downloading ({task.progress.percent:.1f}%)"
                if on_progress:
                    on_progress(task)
            elif state == "finished":
                filename = str(d.get("filename") or "")
                if filename:
                    final_file_holder.append(filename)
                task.progress.status = "postprocessing"
                task.progress.percent = 100.0
                task.progress.eta_seconds = 0
                task.progress.message = "Merging streams & processing subtitles via FFmpeg..."
                if on_progress:
                    on_progress(task)

        def _postprocessor_hook(d: dict[str, Any]) -> None:
            info_dict = d.get("info_dict") or {}
            filepath = info_dict.get("filepath")
            if filepath:
                final_file_holder.append(str(filepath))

        total_attempts = max(1, max_retries + 1)
        last_exc: Exception | None = None

        for attempt in range(1, total_attempts + 1):
            if task.cancel_requested:
                task.progress.status = "cancelled"
                task.progress.message = "Cancelled"
                if on_progress:
                    on_progress(task)
                raise DownloadCancelledError("Download cancelled.")

            task.progress.attempt = attempt
            task.progress.max_attempts = total_attempts

            ydl_opts: dict[str, Any] = {
                "format": ydl_format,
                "outtmpl": str(out_dir / "%(title).180B [%(id)s].%(ext)s"),
                "noplaylist": True,
                "quiet": True,
                "no_warnings": True,
                "progress_hooks": [_progress_hook],
                "postprocessor_hooks": [_postprocessor_hook],
                "postprocessors": postprocessors,
                "writesubtitles": want_subs,
                "writeautomaticsub": want_subs and opts.include_auto_subtitles,
                "subtitleslangs": sub_langs if want_subs else [],
            }
            if not audio_mode and preferred_container in {"mp4", "mkv"}:
                ydl_opts["merge_output_format"] = preferred_container
            if self.ffmpeg_path:
                ydl_opts["ffmpeg_location"] = self.ffmpeg_path

            try:
                logger.info(
                    "Starting download task %s (attempt %d/%d): %s",
                    task.task_id,
                    attempt,
                    total_attempts,
                    opts.url,
                )
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(opts.url, download=True)
                    if info and info.get("title"):
                        task.title = str(info["title"])
                    prepared = Path(ydl.prepare_filename(info)) if info else None

                resolved_output = self._resolve_final_path(
                    out_dir, final_file_holder, prepared, audio_mode, preferred_container
                )

                # Hardcoded subtitle burn via FFmpeg if explicitly requested
                if opts.hardcode_subtitles and not audio_mode and resolved_output.is_file():
                    resolved_output = self._burn_hardcoded_subtitles(
                        video_path=resolved_output,
                        out_dir=out_dir,
                        keep_separate_srt=opts.save_separate_subtitles,
                        task=task,
                        on_progress=on_progress,
                    )

                task.completed_at = time.time()
                task.progress.status = "completed"
                task.progress.percent = 100.0
                task.progress.filename = str(resolved_output)
                if resolved_output.is_file():
                    sz = resolved_output.stat().st_size
                    task.progress.downloaded_bytes = sz
                    task.progress.total_bytes = sz
                task.progress.message = f"Saved to {resolved_output.name}"
                if on_progress:
                    on_progress(task)
                logger.info("Completed download task %s -> %s", task.task_id, resolved_output)
                return resolved_output

            except DownloadCancelledError:
                task.progress.status = "cancelled"
                task.progress.message = "Cancelled by user"
                if on_progress:
                    on_progress(task)
                raise
            except Exception as exc:
                last_exc = exc
                logger.warning(
                    "Download attempt %d/%d failed for %s: %s",
                    attempt,
                    total_attempts,
                    opts.url,
                    exc,
                )
                if attempt < total_attempts:
                    backoff = min(16.0, float(2 ** (attempt - 1)))
                    task.progress.status = "retrying"
                    task.progress.error = str(exc)
                    task.progress.message = f"Retrying in {backoff:.0f}s (attempt {attempt + 1}/{total_attempts})..."
                    if on_progress:
                        on_progress(task)
                    time.sleep(backoff)

        err_msg = self._humanize_error(last_exc)
        task.progress.status = "failed"
        task.progress.error = err_msg
        task.progress.message = f"Failed: {err_msg}"
        if on_progress:
            on_progress(task)
        raise RuntimeError(err_msg) from last_exc

    @staticmethod
    def _resolve_final_path(
        out_dir: Path,
        recorded_paths: list[str],
        prepared: Path | None,
        audio_mode: str,
        preferred_container: str,
    ) -> Path:
        for raw in reversed(recorded_paths):
            cand = Path(raw)
            if cand.is_file():
                return cand
        if prepared is not None:
            if prepared.is_file():
                return prepared
            target_ext = audio_mode if audio_mode else preferred_container
            alt = prepared.with_suffix(f".{target_ext}")
            if alt.is_file():
                return alt
        # Fallback: newest media file in out_dir
        candidates = sorted(
            [p for p in out_dir.iterdir() if p.is_file()],
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        return candidates[0] if candidates else (prepared or out_dir / "output.mp4")

    def _burn_hardcoded_subtitles(
        self,
        video_path: Path,
        out_dir: Path,
        keep_separate_srt: bool,
        task: DownloadTask,
        on_progress: Callable[[DownloadTask], None] | None,
    ) -> Path:
        """Burn `.srt`/`.vtt` subtitles directly into video frames using FFmpeg."""
        if not self.ffmpeg_path:
            logger.warning("Hardcoded subtitle burn requested, but FFmpeg is unavailable.")
            return video_path

        stem = video_path.stem
        srt_candidates = sorted(
            [
                p
                for p in out_dir.iterdir()
                if p.is_file()
                and p.name.startswith(stem)
                and p.suffix.lower() in {".srt", ".vtt"}
            ]
        )
        if not srt_candidates:
            logger.info("No subtitle file found alongside %s to burn in.", video_path.name)
            return video_path

        sub_file = srt_candidates[0]
        burned_path = video_path.with_name(f"{video_path.stem} [subbed]{video_path.suffix}")
        task.progress.status = "postprocessing"
        task.progress.message = f"Burning hardcoded subtitles ({sub_file.name})..."
        if on_progress:
            on_progress(task)

        # Escape path for FFmpeg subtitles filter
        escaped_sub = (
            str(sub_file.resolve())
            .replace("\\", "/")
            .replace(":", "\\:")
            .replace("'", r"\'")
            .replace("[", r"\[")
            .replace("]", r"\]")
        )
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-i",
            str(video_path),
            "-vf",
            f"subtitles='{escaped_sub}'",
            "-c:a",
            "copy",
            str(burned_path),
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if proc.returncode == 0 and burned_path.is_file():
            try:
                video_path.unlink(missing_ok=True)
            except OSError:
                pass
            if not keep_separate_srt:
                for srt in srt_candidates:
                    srt.unlink(missing_ok=True)
            return burned_path

        logger.warning("FFmpeg hardcoded subtitle burn returned %d: %s", proc.returncode, proc.stderr[-300:])
        return video_path

    @staticmethod
    def _humanize_error(exc: Exception | None) -> str:
        if exc is None:
            return "Unknown download failure."
        raw = str(exc)
        lower = raw.lower()
        if "geo" in lower or "not available in your country" in lower or "region" in lower:
            return "Video is region-blocked or geo-restricted by the streaming provider."
        if "private video" in lower or "sign in" in lower or "login" in lower:
            return "Video is private or requires platform authentication."
        if "unsupported url" in lower:
            return "Unsupported URL — no matching media stream found on this page."
        if "ffmpeg" in lower:
            return "FFmpeg stream merge failed — verify FFmpeg configuration in Settings."
        return raw.strip() or exc.__class__.__name__


class DownloadQueueManager:
    """Thread-safe multi-download queue dispatching tasks and notifying UI listeners."""

    def __init__(
        self,
        config_manager: ConfigManager,
        telemetry: Any = None,
        on_task_finished: Callable[[DownloadTask, bool], None] | None = None,
    ) -> None:
        self._config = config_manager
        self._telemetry = telemetry
        self._on_finished = on_task_finished
        self._lock = threading.RLock()
        self._tasks: dict[str, DownloadTask] = {}
        self._futures: dict[str, Future[Any]] = {}
        self._listeners: list[Callable[[DownloadTask], None]] = []
        workers = self._config.config.concurrent_downloads
        self._executor = ThreadPoolExecutor(max_workers=workers, thread_name_prefix="vdl_worker")

    def enqueue(self, options: DownloadOptions) -> DownloadTask:
        """Create and schedule a new download task."""
        platform = URLHandler.detect_platform(options.url)
        task_id = uuid.uuid4().hex[:10]
        res_label = (
            options.format_choice.resolution
            if options.format_choice
            else (options.audio_only.upper() if options.audio_only else "Best")
        )
        task = DownloadTask(
            task_id=task_id,
            options=options,
            title=options.title_hint or options.url,
            platform_name=options.platform_hint or platform.display_name,
            resolution_label=res_label,
        )
        with self._lock:
            self._tasks[task_id] = task
        self._notify(task)

        future = self._executor.submit(self._run_worker, task)
        with self._lock:
            self._futures[task_id] = future
        return task

    def _run_worker(self, task: DownloadTask) -> None:
        downloader = VideoDownloader(ffmpeg_path=self._config.get_ffmpeg_executable())
        retries = self._config.config.max_retries
        try:
            output_path = downloader.execute_download(
                task,
                on_progress=self._notify,
                max_retries=retries,
            )
            if self._telemetry is not None:
                size_bytes = output_path.stat().st_size if output_path.is_file() else 0
                self._telemetry.record_download(
                    url=task.options.url,
                    title=task.title,
                    platform=task.platform_name,
                    resolution=task.resolution_label,
                    size_bytes=size_bytes,
                    speed_bps=task.progress.speed_bps,
                    status="completed",
                    has_subtitles=(
                        task.options.embed_subtitles
                        or task.options.hardcode_subtitles
                        or task.options.save_separate_subtitles
                    ),
                )
            if self._on_finished:
                self._on_finished(task, True)
        except DownloadCancelledError:
            logger.info("Download task %s cancelled.", task.task_id)
        except Exception as exc:
            logger.error("Download task %s failed permanently: %s", task.task_id, exc)
            if self._telemetry is not None:
                self._telemetry.record_download(
                    url=task.options.url,
                    title=task.title,
                    platform=task.platform_name,
                    resolution=task.resolution_label,
                    size_bytes=0,
                    speed_bps=0.0,
                    status="failed",
                    has_subtitles=False,
                )
            if self._on_finished:
                self._on_finished(task, False)

    def cancel(self, task_id: str) -> bool:
        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                return False
            task.cancel_requested = True
        self._notify(task)
        return True

    def list_tasks(self) -> list[DownloadTask]:
        with self._lock:
            return sorted(self._tasks.values(), key=lambda t: t.created_at, reverse=True)

    def subscribe(self, callback: Callable[[DownloadTask], None]) -> Callable[[], None]:
        with self._lock:
            self._listeners.append(callback)

        def _unsubscribe() -> None:
            with self._lock:
                if callback in self._listeners:
                    self._listeners.remove(callback)

        return _unsubscribe

    def _notify(self, task: DownloadTask) -> None:
        with self._lock:
            listeners = list(self._listeners)
        for cb in listeners:
            try:
                cb(task)
            except Exception:
                pass

    def shutdown(self) -> None:
        with self._lock:
            for task in self._tasks.values():
                task.cancel_requested = True
        self._executor.shutdown(wait=False, cancel_futures=True)
