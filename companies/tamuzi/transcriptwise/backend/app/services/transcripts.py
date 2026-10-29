"""Conservative parsing: retain repetitions, stable segment IDs and real timestamps."""

import html
import re
from pathlib import Path

from app.config import get_settings
from app.errors import ServiceError
from app.schemas import Segment

TIME = r"(?:(?:\d{1,3}):)?\d{2}:\d{2}[,.]\d{3}"
CUE = re.compile(rf"^({TIME})\s*-->\s*({TIME})(?:\s+.*)?$")
PLAIN_TIME = re.compile(r"^\[?(?P<t>(?:\d{1,3}:)?\d{1,2}:\d{2})\]?\s+(?P<text>.+)$")


def seconds(value: str) -> float:
    parts = value.replace(",", ".").split(":")
    if len(parts) not in (2, 3):
        raise ValueError("Invalid timestamp")
    if float(parts[-1]) >= 60 or (len(parts) == 3 and int(parts[-2]) >= 60):
        raise ValueError("Invalid timestamp components")
    result = float(parts[-1]) + int(parts[-2]) * 60
    return result + (int(parts[0]) * 3600 if len(parts) == 3 else 0)


def cleanup(text: str) -> str:
    # Only whitespace and subtitle markup. Never remove repetitions or source claims.
    return re.sub(r"[ \t]+", " ", text.replace("\r\n", "\n").replace("\r", "\n")).strip()


def validate_length(text: str):
    settings = get_settings()
    if len(text.strip()) < settings.min_transcript_chars:
        raise ServiceError("transcript_too_short", f"Add at least {settings.min_transcript_chars} characters of transcript text.")
    if len(text) > settings.max_transcript_chars:
        raise ServiceError(
            "transcript_too_long",
            f"The transcript limit is {settings.max_transcript_chars:,} characters. Split this source into smaller files.",
        )
    if "\x00" in text or any(ord(c) < 9 or 13 < ord(c) < 32 for c in text):
        raise ServiceError("invalid_encoding", "This file contains binary or unsupported control characters. Use a UTF-8 text transcript.")


def split_text(text: str, max_chars: int = 1800) -> list[str]:
    """Split oversized paragraphs without truncating even a long unbroken word."""
    pieces = []
    remaining = text.strip()
    while len(remaining) > max_chars:
        cutoff = remaining.rfind(" ", 0, max_chars)
        if cutoff < max_chars // 3:
            cutoff = max_chars
        pieces.append(remaining[:cutoff].strip())
        remaining = remaining[cutoff:].strip()
    if remaining:
        pieces.append(remaining)
    return pieces


def parse_plain(text: str) -> list[dict]:
    segments = []
    for paragraph in re.split(r"\n\s*\n|\n", cleanup(text)):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        match = PLAIN_TIME.match(paragraph)
        start = None
        if match:
            try:
                start = seconds(match["t"])
                paragraph = match["text"]
            except ValueError:
                pass
        for piece in split_text(paragraph):
            segments.append(Segment(id=f"s{len(segments) + 1:05}", text=piece, start=start).model_dump())
    return segments


def parse_subtitles(text: str, extension: str) -> list[dict]:
    lines = text.replace("\r\n", "\n").replace("\r", "\n").lstrip("\ufeff").split("\n")
    if extension == ".vtt" and not lines[0].startswith("WEBVTT"):
        raise ServiceError("malformed_subtitles", "A WebVTT file must begin with WEBVTT.")
    segments = []
    i = 1 if extension == ".vtt" else 0
    try:
        while i < len(lines):
            line = lines[i].strip()
            if not line:
                i += 1
                continue
            if extension == ".vtt" and (line.startswith("NOTE") or line in ("STYLE", "REGION")):
                while i < len(lines) and lines[i].strip():
                    i += 1
                continue
            match = CUE.match(line)
            if not match and i + 1 < len(lines):  # SRT number / VTT cue identifier
                i += 1
                match = CUE.match(lines[i].strip())
            if not match:
                raise ValueError(f"Expected a timestamp cue near line {i + 1}")
            start, end = seconds(match[1]), seconds(match[2])
            if end < start:
                raise ValueError(f"End precedes start near line {i + 1}")
            i += 1
            cue_lines = []
            while i < len(lines) and lines[i].strip():
                if "-->" in lines[i]:
                    raise ValueError(f"Missing blank line before cue near line {i + 1}")
                cue_lines.append(lines[i].strip())
                i += 1
            # Subtitle formatting is not source text; ordinary text is never HTML-rendered.
            content = re.sub(r"<br\s*/?>", " ", " ".join(cue_lines), flags=re.I)
            content = html.unescape(
                re.sub(
                    r"</?(?:b|i|u|ruby|rt|c(?:\.[\w-]+)*|v|lang)(?:\s[^>]*)?>|<\d{2}:\d{2}(?::\d{2})?[.,]\d{3}>", "", content, flags=re.I
                )
            )
            content = cleanup(content)
            for piece in split_text(content):
                segments.append(Segment(id=f"s{len(segments) + 1:05}", text=piece, start=start, end=end).model_dump())
    except (ValueError, IndexError) as exc:
        raise ServiceError(
            "malformed_subtitles", f"We couldn't parse the subtitle structure: {exc}. Repair the timestamps or upload plain text."
        ) from exc
    if not segments:
        raise ServiceError("empty_subtitles", "No subtitle cues were found in this file.")
    return segments


def parse_upload(filename: str, content: bytes) -> tuple[str, list[dict]]:
    settings = get_settings()
    if len(content) > settings.max_upload_bytes:
        raise ServiceError("upload_too_large", f"Files must be smaller than {settings.max_upload_bytes / 1_000_000:g} MB.")
    ext = Path(filename).suffix.lower()
    if ext not in (".txt", ".srt", ".vtt"):
        raise ServiceError("unsupported_file", "Upload a .txt, .srt, or .vtt transcript. PDF and Word files are not supported.")
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ServiceError("invalid_encoding", "Save your transcript as UTF-8 text and try again.") from exc
    if "\x00" in text or text.lstrip().lower().startswith(("<!doctype html", "<html", "{\\rtf", "%pdf-", "pk\x03\x04")):
        raise ServiceError(
            "invalid_file_content", "This does not look like a text transcript. Renaming a document does not convert it to plain text."
        )
    if ext == ".txt":
        segments = parse_plain(text)
    else:
        segments = parse_subtitles(text, ext)
    normalized = "\n\n".join(s["text"] for s in segments)
    validate_length(normalized)
    return text, segments


def chunk_segments(segments: list[dict], max_chars: int) -> list[list[dict]]:
    result, batch, size = [], [], 0
    for segment in segments:
        # Input parsers already split long text; edits are split at the route boundary.
        weight = len(segment["text"]) + len(segment["id"]) + 50
        if batch and size + weight > max_chars:
            result.append(batch)
            batch, size = [], 0
        batch.append(segment)
        size += weight
    if batch:
        result.append(batch)
    return result
