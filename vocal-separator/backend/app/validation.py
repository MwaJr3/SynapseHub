"""Upload validation (§5/6, §55): never trust the extension.
Checks magic bytes, size, then real decodability + duration via libsndfile probe.
"""
from __future__ import annotations
from pathlib import Path
from .audio_io import probe, ffmpeg_available, AudioDecodeError
from .config import MAX_UPLOAD_MB, MAX_DURATION_S

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".oga", ".opus", ".aif", ".aiff"}

_SIGNATURES: list[tuple[str, callable]] = [
    ("wav", lambda b: b[:4] == b"RIFF" and b[8:12] == b"WAVE"),
    ("flac", lambda b: b[:4] == b"fLaC"),
    ("ogg", lambda b: b[:4] == b"OggS"),
    ("mp3", lambda b: b[:3] == b"ID3" or (len(b) > 1 and b[0] == 0xFF and (b[1] & 0xE0) == 0xE0)),
    ("aiff", lambda b: b[:4] == b"FORM" and b[8:12] in (b"AIFF", b"AIFC")),
    ("m4a", lambda b: b[4:8] == b"ftyp"),                    # ISO-BMFF container (m4a/mp4a)
    ("aac", lambda b: len(b) > 1 and b[0] == 0xFF and (b[1] & 0xF6) == 0xF0),  # ADTS
]


class UploadValidationError(ValueError):
    pass


def sniff_format(header: bytes) -> str | None:
    for name, test in _SIGNATURES:
        try:
            if test(header):
                return name
        except Exception:
            continue
    return None


def validate_upload(path: Path, original_name: str) -> dict:
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise UploadValidationError(
            f"Unsupported file type '{ext or '(none)'}'. Supported: MP3, WAV, FLAC, M4A, AAC, OGG, OPUS, AIFF.")
    size = path.stat().st_size
    if size == 0:
        raise UploadValidationError("The uploaded file is empty.")
    if size > MAX_UPLOAD_MB * 1024 * 1024:
        raise UploadValidationError(f"File is {size/1e6:.1f} MB; the limit is {MAX_UPLOAD_MB} MB.")
    header = path.read_bytes()[:64]
    sniffed = sniff_format(header)
    if sniffed is None:
        raise UploadValidationError(
            "The file signature does not match any supported audio format. "
            "The file may be corrupt or mislabelled.")
    if sniffed in ("m4a", "aac") and not ffmpeg_available():
        raise UploadValidationError(
            "M4A/AAC decoding requires ffmpeg, which is not installed on this server. "
            "Please upload WAV, FLAC, MP3 or OGG, or install ffmpeg (see README).")
    try:
        meta = probe(path)
    except AudioDecodeError as e:
        raise UploadValidationError(str(e))
    if meta.get("duration", 0) > MAX_DURATION_S:
        raise UploadValidationError(
            f"Audio is {meta['duration']:.0f}s; the limit is {MAX_DURATION_S}s.")
    meta["sniffed_format"] = sniffed
    meta["size_bytes"] = size
    return meta
