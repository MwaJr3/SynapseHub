# Engine module reused from apps/incidentflow (tested CLI engine) — behavior preserved.
"""Evidence intake: hashing, metadata, duplicates. Source files stay read-only."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


class IntakeError(ValueError):
    pass


@dataclass
class EvidenceItem:
    path: str
    sha256: str
    size: int
    mtime: float
    collected_by: str
    collected_at: str
    notes: str = ""
    duplicate_of: int | None = None


def hash_file(path: str | Path, chunk_size: int = 65536) -> str:
    """Streamed hashing — bounded memory even for large files."""
    h = hashlib.sha256()
    try:
        with Path(path).open("rb") as fh:
            for chunk in iter(lambda: fh.read(chunk_size), b""):
                h.update(chunk)
    except OSError as exc:
        raise IntakeError(f"Cannot read {path}: {exc}") from exc
    return h.hexdigest()


def collect(path: str | Path, collected_by: str, notes: str = "") -> EvidenceItem:
    p = Path(path)
    if not p.is_file():
        raise IntakeError(f"{path} is not a readable file (evidence must exist at collection time).")
    st = p.stat()
    return EvidenceItem(str(p), hash_file(p), st.st_size, st.st_mtime, collected_by.strip() or "unknown",
                        datetime.now(timezone.utc).isoformat(), notes)


def build_timeline(entries: list[tuple[str, str, str]]) -> list[dict]:
    """entries: (timestamp, source, description). Metadata-derived timelines are
    labelled as such — timestamps can be altered and never prove chronology."""
    rows = [{"timestamp": ts, "source": src, "description": desc} for ts, src, desc in entries]
    rows.sort(key=lambda r: r["timestamp"])
    return rows
