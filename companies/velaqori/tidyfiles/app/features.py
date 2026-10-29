"""Modern features: rule profiles, undo manifest, size-first duplicate scan.

Safety rule (enforced + tested): the organizer NEVER deletes files. All
operations are recorded in an undo manifest so they can be reversed.

DSA notes: duplicate scan compares sizes first (O(n) grouping) and only then
hashes same-size candidates (bounded I/O); undo is a manifest replay in
reverse order.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path


class FeatureError(ValueError):
    pass


PROFILES = {
    "student": {"ext_buckets": {".pdf": "docs", ".docx": "docs", ".png": "images",
                                ".jpg": "images", ".py": "code", ".zip": "archives"},
                "notes": "Study-material oriented buckets."},
    "developer": {"ext_buckets": {".py": "code", ".js": "code", ".ts": "code",
                                  ".md": "docs", ".json": "data", ".csv": "data",
                                  ".png": "images", ".zip": "archives"},
                  "notes": "Code-oriented buckets."},
    "minimal": {"ext_buckets": {".pdf": "docs", ".txt": "docs", ".png": "images"},
                "notes": "Few buckets; unknown extensions go to 'other'."},
}


def apply_profile(profile: str, filename: str) -> str:
    if profile not in PROFILES:
        raise FeatureError(f"unknown profile {profile!r}; available: {sorted(PROFILES)}")
    ext = Path(filename).suffix.lower()
    return PROFILES[profile]["ext_buckets"].get(ext, "other")


class UndoManifest:
    """Records every organize operation for exact reversal."""

    def __init__(self, path: str) -> None:
        self.path = path
        self.entries: list[dict] = []

    def record(self, src: str, dst: str) -> None:
        self.entries.append({"src": src, "dst": dst})

    def save(self) -> None:
        Path(self.path).write_text(json.dumps({"operations": self.entries}, indent=2))

    @classmethod
    def load(cls, path: str) -> "UndoManifest":
        data = json.loads(Path(path).read_text())
        manifest = cls(path)
        manifest.entries = data["operations"]
        return manifest

    def undo(self) -> list[str]:
        """Reverse recorded moves (dst -> src). Never deletes: if the source
        exists the reversal is refused with a reason."""
        reversed_ops = []
        for entry in reversed(self.entries):
            dst, src = Path(entry["dst"]), Path(entry["src"])
            if src.exists():
                reversed_ops.append(f"refused: {src} already exists (would overwrite)")
                continue
            if dst.exists():
                dst.rename(src)
                reversed_ops.append(f"reversed: {dst} -> {src}")
            else:
                reversed_ops.append(f"skipped: {dst} not found")
        return reversed_ops


def find_duplicates(paths: list[str], size_threshold_bytes: int = 0) -> list[list[str]]:
    """Size-first grouping, SHA-256 only within equal-size groups. Bounded I/O."""
    by_size: dict[int, list[str]] = {}
    for p in paths:
        path = Path(p)
        if not path.is_file():
            continue
        size = path.stat().st_size
        if size < size_threshold_bytes:
            continue
        by_size.setdefault(size, []).append(p)
    groups = []
    for size, group in by_size.items():
        if len(group) < 2:
            continue
        by_hash: dict[str, list[str]] = {}
        for p in group:
            digest = hashlib.sha256(Path(p).read_bytes()).hexdigest()
            by_hash.setdefault(digest, []).append(p)
        groups.extend(v for v in by_hash.values() if len(v) > 1)
    return groups
