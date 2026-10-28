# Engine module reused from apps/threatintel-desk-cli (tested CLI engine) — behavior preserved.
"""Result cache with explicit provenance and retrieval time."""
from __future__ import annotations

import json
from pathlib import Path

from .providers import Verdict


def save(path: str | Path, verdict: Verdict) -> None:
    p = Path(path)
    rows = load_all(path)
    rows.append(verdict.__dict__)
    p.write_text(json.dumps(rows, indent=2))


def load_all(path: str | Path) -> list[dict]:
    p = Path(path)
    return json.loads(p.read_text()) if p.exists() else []


def cached_lookup(path: str | Path, provider_name: str, value: str) -> Verdict | None:
    for row in reversed(load_all(path)):
        if row["provider"] == provider_name and row["indicator"] == value:
            return Verdict(provider=row["provider"], indicator=row["indicator"], result=row["result"],
                           detail=row["detail"], retrieved_at=row["retrieved_at"], cached=True)
    return None
