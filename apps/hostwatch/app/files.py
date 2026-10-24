"""Scoped file observation (metadata + optional hashing)."""
from __future__ import annotations

import hashlib
from pathlib import Path

from .collectors import FileFact


def scan_paths(paths: list[str], hash_files: bool = False) -> list[FileFact]:
    facts: list[FileFact] = []
    for raw in paths:
        base = Path(raw)
        if not base.exists():
            facts.append(FileFact(str(base), -1, -1.0, None))   # explicit missing marker
            continue
        for p in sorted(base.rglob("*") if base.is_dir() else [base]):
            try:
                st = p.stat()
                digest = None
                if hash_files and p.is_file():
                    h = hashlib.sha256()
                    with p.open("rb") as fh:
                        for chunk in iter(lambda: fh.read(65536), b""):
                            h.update(chunk)
                    digest = h.hexdigest()
                facts.append(FileFact(str(p), st.st_size, st.st_mtime, digest))
            except OSError:
                facts.append(FileFact(str(p), -1, -1.0, None))
    return facts
