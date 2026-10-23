"""Subtitle and transcript extraction engine (VTT/SRT parser + yt-dlp caption fetcher)."""

from __future__ import annotations

import html
import re
import tempfile
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import yt_dlp

from ..utils.logger import get_logger
from .url_handler import URLHandler

logger = get_logger("transcriptor")

_INLINE_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")
_SRT_TIMESTAMP_RE = re.compile(
    r"(?P<start>(?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*(?P<end>(?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})"
)


def parse_timestamp_to_seconds(ts: str) -> float:
    """Convert a VTT or SRT timestamp (e.g. ``01:02:03.450`` or ``02:03,450``) to seconds."""
    cleaned = ts.strip().replace(",", ".")
    parts = cleaned.split(":")
    if len(parts) == 3:
        hours, minutes, seconds = int(parts[0]), int(parts[1]), float(parts[2])
    elif len(parts) == 2:
        hours, minutes, seconds = 0, int(parts[0]), float(parts[1])
    else:
        return 0.0
    return hours * 3600.0 + minutes * 60.0 + seconds


def format_display_timestamp(seconds: float) -> str:
    """Format seconds as ``MM:SS`` (under 1 hour) or ``HH:MM:SS``."""
    total = max(0, int(seconds))
    hrs, rem = divmod(total, 3600)
    mins, secs = divmod(rem, 60)
    if hrs > 0:
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"


def format_srt_timestamp(seconds: float) -> str:
    """Format seconds as standard SubRip ``HH:MM:SS,mmm``."""
    clamped = max(0.0, seconds)
    whole = int(clamped)
    millis = int(round((clamped - whole) * 1000))
    if millis >= 1000:
        whole += 1
        millis -= 1000
    hrs, rem = divmod(whole, 3600)
    mins, secs = divmod(rem, 60)
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"


def clean_caption_line(raw_line: str) -> str:
    """Remove VTT word-timing tags, HTML markup, and redundant whitespace."""
    unescaped = html.unescape(raw_line)
    without_tags = _INLINE_TAG_RE.sub("", unescaped)
    return _WHITESPACE_RE.sub(" ", without_tags).strip()


@dataclass
class TranscriptCue:
    """Single cleaned transcript segment with start/end timings."""

    index: int
    start_seconds: float
    end_seconds: float
    text: str

    @property
    def display_timestamp(self) -> str:
        return format_display_timestamp(self.start_seconds)

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["display_timestamp"] = self.display_timestamp
        return data


@dataclass
class TranscriptResult:
    """Complete extracted transcript ready for display, copy, or export."""

    url: str
    video_title: str
    language: str
    is_auto_generated: bool
    source_format: str
    fetch_elapsed_sec: float
    cues: list[TranscriptCue]

    def to_plain_text(self) -> str:
        """Return clean continuous text without timestamps."""
        return "\n".join(cue.text for cue in self.cues if cue.text.strip())

    def to_timestamped_text(self) -> str:
        """Return transcript lines prefixed with ``[MM:SS]`` or ``[HH:MM:SS]``."""
        return "\n".join(
            f"[{cue.display_timestamp}] {cue.text}" for cue in self.cues if cue.text.strip()
        )

    def to_srt(self) -> str:
        """Serialize cues into standard `.srt` SubRip format."""
        blocks: list[str] = []
        for idx, cue in enumerate(self.cues, start=1):
            start_ts = format_srt_timestamp(cue.start_seconds)
            end_sec = max(cue.end_seconds, cue.start_seconds + 1.0)
            end_ts = format_srt_timestamp(end_sec)
            blocks.append(f"{idx}\n{start_ts} --> {end_ts}\n{cue.text}")
        return "\n\n".join(blocks) + ("\n" if blocks else "")

    def save_to_file(self, output_path: Path | str, mode: str = "txt_timestamps") -> Path:
        """Write transcript to ``.txt`` or ``.srt`` file."""
        dest = Path(output_path).expanduser().resolve()
        dest.parent.mkdir(parents=True, exist_ok=True)
        if mode == "srt" or dest.suffix.lower() == ".srt":
            content = self.to_srt()
        elif mode == "plain":
            content = self.to_plain_text()
        else:
            content = self.to_timestamped_text()
        dest.write_text(content, encoding="utf-8")
        return dest

    def to_dict(self) -> dict[str, Any]:
        return {
            "url": self.url,
            "video_title": self.video_title,
            "language": self.language,
            "is_auto_generated": self.is_auto_generated,
            "source_format": self.source_format,
            "fetch_elapsed_sec": round(self.fetch_elapsed_sec, 3),
            "cue_count": len(self.cues),
            "word_count": sum(len(c.text.split()) for c in self.cues),
            "plain_text": self.to_plain_text(),
            "timestamped_text": self.to_timestamped_text(),
            "srt_text": self.to_srt(),
            "cues": [c.to_dict() for c in self.cues],
        }


class TranscriptExtractor:
    """Extracts and cleans video subtitles/captions without downloading video streams."""

    def __init__(self, ffmpeg_path: str | None = None) -> None:
        self.ffmpeg_path = ffmpeg_path

    @classmethod
    def parse_subtitle_file(cls, file_path: Path | str) -> list[TranscriptCue]:
        """Parse either a `.vtt` or `.srt` file into deduplicated `TranscriptCue` items."""
        path = Path(file_path)
        suffix = path.suffix.lower()
        raw_content = path.read_text(encoding="utf-8", errors="replace")
        if suffix == ".vtt" or raw_content.lstrip().startswith("WEBVTT"):
            return cls._parse_vtt_file(path, raw_content)
        return cls.parse_subtitle_text(raw_content, fmt="srt")

    @classmethod
    def _parse_vtt_file(cls, path: Path, raw_content: str) -> list[TranscriptCue]:
        """Parse WebVTT using `webvtt-py` with fallback to regex parser."""
        raw_cues: list[tuple[float, float, list[str]]] = []
        try:
            import webvtt

            for caption in webvtt.read(str(path)):
                start_s = parse_timestamp_to_seconds(caption.start)
                end_s = parse_timestamp_to_seconds(caption.end)
                lines = [clean_caption_line(ln) for ln in caption.text.splitlines()]
                lines = [ln for ln in lines if ln]
                if lines:
                    raw_cues.append((start_s, end_s, lines))
        except Exception as exc:
            logger.debug("webvtt-py fallback triggered (%s); using regex VTT parser.", exc)
            return cls.parse_subtitle_text(raw_content, fmt="vtt")

        return cls._deduplicate_rolling_cues(raw_cues)

    @classmethod
    def parse_subtitle_text(cls, raw_text: str, fmt: str = "vtt") -> list[TranscriptCue]:
        """Parse raw VTT or SRT subtitle text directly from memory."""
        raw_cues: list[tuple[float, float, list[str]]] = []
        normalized = raw_text.replace("\r\n", "\n").replace("\r", "\n")
        blocks = re.split(r"\n\s*\n", normalized)

        for block in blocks:
            lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
            if not lines:
                continue
            if lines[0].upper().startswith(("WEBVTT", "NOTE", "STYLE", "REGION")):
                continue

            ts_idx = -1
            match = None
            for idx, ln in enumerate(lines):
                m = _SRT_TIMESTAMP_RE.search(ln)
                if m:
                    ts_idx = idx
                    match = m
                    break
            if match is None or ts_idx == -1:
                continue

            start_s = parse_timestamp_to_seconds(match.group("start"))
            end_s = parse_timestamp_to_seconds(match.group("end"))
            cleaned_lines = [clean_caption_line(ln) for ln in lines[ts_idx + 1 :]]
            cleaned_lines = [ln for ln in cleaned_lines if ln]
            if cleaned_lines:
                raw_cues.append((start_s, end_s, cleaned_lines))

        return cls._deduplicate_rolling_cues(raw_cues)

    @staticmethod
    def _deduplicate_rolling_cues(
        raw_cues: list[tuple[float, float, list[str]]],
    ) -> list[TranscriptCue]:
        """Eliminate overlapping lines produced by YouTube's rolling 2-line auto-captions."""
        deduped: list[TranscriptCue] = []
        seen_recent_lines: list[str] = []

        for start_s, end_s, lines in raw_cues:
            novel_lines: list[str] = []
            for ln in lines:
                if ln in seen_recent_lines:
                    continue
                if novel_lines and novel_lines[-1] == ln:
                    continue
                novel_lines.append(ln)

            if not novel_lines:
                continue

            combined = " ".join(novel_lines).strip()
            if not combined:
                continue

            # Merge exact consecutive repeats or sub-50ms flash cues
            if deduped and deduped[-1].text == combined:
                deduped[-1].end_seconds = max(deduped[-1].end_seconds, end_s)
                continue

            deduped.append(
                TranscriptCue(
                    index=len(deduped) + 1,
                    start_seconds=start_s,
                    end_seconds=max(end_s, start_s + 0.5),
                    text=combined,
                )
            )
            seen_recent_lines = (seen_recent_lines + novel_lines)[-4:]

        return deduped

    def extract_transcript(
        self,
        url: str,
        preferred_lang: str = "en",
        include_auto_subs: bool = True,
    ) -> TranscriptResult:
        """Fetch subtitles/auto-captions via `yt-dlp` (skipping video download) and parse cues."""
        clean_url = URLHandler.normalize_url(url)
        if not URLHandler.is_valid_http_url(clean_url):
            raise ValueError(f"Invalid video URL: {url!r}")

        t0 = time.perf_counter()
        lang = (preferred_lang or "en").strip()
        lang_candidates = [lang, f"{lang}-*", f"{lang}.*"]
        if not lang.lower().startswith("en"):
            lang_candidates.extend(["en", "en-*"])

        with tempfile.TemporaryDirectory(prefix="vdl_transcript_") as tmp_dir:
            tmp_path = Path(tmp_dir)
            ydl_opts: dict[str, Any] = {
                "skip_download": True,
                "writesubtitles": True,
                "writeautomaticsub": include_auto_subs,
                "subtitleslangs": lang_candidates,
                "subtitlesformat": "vtt/srt/best",
                "outtmpl": str(tmp_path / "caption.%(ext)s"),
                "quiet": True,
                "no_warnings": True,
                "noplaylist": True,
            }
            if self.ffmpeg_path:
                ydl_opts["ffmpeg_location"] = self.ffmpeg_path

            logger.info(
                "Fetching transcript for %s (lang=%s, auto=%s)",
                clean_url,
                lang,
                include_auto_subs,
            )
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(clean_url, download=True)

            if not info:
                raise RuntimeError("Could not retrieve video metadata from extractor.")

            title = str(info.get("title") or "Untitled Video")
            manual_subs = info.get("subtitles") or {}
            auto_subs = info.get("automatic_captions") or {}

            subtitle_files = sorted(
                [
                    p
                    for p in tmp_path.iterdir()
                    if p.is_file() and p.suffix.lower() in {".vtt", ".srt", ".ttml", ".srv3"}
                ],
                key=lambda p: (0 if p.suffix.lower() == ".vtt" else 1, p.name),
            )

            # Fallback: if requested lang wasn't available, retry first available manual or auto lang
            if not subtitle_files and (manual_subs or (include_auto_subs and auto_subs)):
                fallback_lang = next(iter(manual_subs.keys()), None) or next(
                    iter(auto_subs.keys()), None
                )
                if fallback_lang:
                    ydl_opts["subtitleslangs"] = [fallback_lang]
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl_retry:
                        ydl_retry.extract_info(clean_url, download=True)
                    subtitle_files = sorted(
                        [
                            p
                            for p in tmp_path.iterdir()
                            if p.is_file() and p.suffix.lower() in {".vtt", ".srt"}
                        ]
                    )
                    lang = fallback_lang

            if not subtitle_files:
                raise LookupError(
                    "No manual subtitles or auto-generated captions are available for this video."
                )

            chosen_file = subtitle_files[0]
            # Infer language code from filename `caption.<lang>.vtt`
            parts = chosen_file.name.split(".")
            detected_lang = parts[1] if len(parts) >= 3 else lang
            is_auto = detected_lang not in manual_subs and bool(auto_subs)

            cues = self.parse_subtitle_file(chosen_file)
            elapsed = time.perf_counter() - t0
            logger.info(
                "Extracted %d transcript cues (%s, auto=%s) in %.2fs",
                len(cues),
                detected_lang,
                is_auto,
                elapsed,
            )
            return TranscriptResult(
                url=clean_url,
                video_title=title,
                language=detected_lang,
                is_auto_generated=is_auto,
                source_format=chosen_file.suffix.lstrip(".").lower(),
                fetch_elapsed_sec=elapsed,
                cues=cues,
            )
