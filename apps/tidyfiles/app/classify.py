"""File classification: content sniffing first, extension as fallback.

An extension NEVER guarantees content type — the classifier records which
signal it used so reports stay honest.
"""
from __future__ import annotations

from dataclasses import dataclass

MAGIC: dict[str, bytes] = {
    "images": [
        b"\x89PNG", b"\xff\xd8\xff", b"GIF87a", b"GIF89a", b"BM", b"\x00\x00\x01\x00",
    ],
}
# extension fallbacks (used only when no magic signature matches)
EXTENSION_CATEGORY = {
    ".pdf": "documents", ".doc": "documents", ".docx": "documents", ".txt": "documents",
    ".md": "documents", ".rtf": "documents", ".odt": "documents", ".csv": "documents",
    ".png": "images", ".jpg": "images", ".jpeg": "images", ".gif": "images",
    ".bmp": "images", ".webp": "images", ".svg": "images",
    ".mp3": "audio", ".wav": "audio", ".flac": "audio", ".ogg": "audio",
    ".mp4": "video", ".mkv": "video", ".avi": "video", ".mov": "video",
    ".zip": "archives", ".tar": "archives", ".gz": "archives", ".7z": "archives",
    ".rar": "archives",
    ".py": "code", ".js": "code", ".ts": "code", ".java": "code", ".c": "code",
    ".cpp": "code", ".html": "code", ".css": "code", ".json": "code", ".yaml": "code",
}
FALLBACK_CATEGORY = "other"


@dataclass
class Classification:
    category: str
    signal: str      # "magic" | "extension" | "fallback"
    mismatch: bool   # extension claims one type but content sniffed another


def classify(path) -> Classification:
    from pathlib import Path
    p = Path(path)
    header = b""
    try:
        with p.open("rb") as fh:
            header = fh.read(16)
    except OSError:
        pass
    sniffed = None
    for category, signatures in MAGIC.items():
        if any(header.startswith(sig) for sig in signatures):
            sniffed = category
            break
    ext = p.suffix.lower()
    ext_category = EXTENSION_CATEGORY.get(ext)
    if sniffed is not None:
        mismatch = ext_category is not None and ext_category != sniffed
        return Classification(sniffed, "magic", mismatch)
    if ext_category is not None:
        return Classification(ext_category, "extension", False)
    return Classification(FALLBACK_CATEGORY, "fallback", False)
