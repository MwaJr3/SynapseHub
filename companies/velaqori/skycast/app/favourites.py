"""Favourite locations persistence (JSON)."""
from __future__ import annotations

import json
from pathlib import Path


def add(path: str | Path, city: str) -> list[str]:
    rows = load(path)
    if city.strip().lower() not in rows:
        rows.append(city.strip().lower())
    Path(path).write_text(json.dumps(sorted(rows), indent=2))
    return rows


def load(path: str | Path) -> list[str]:
    p = Path(path)
    return json.loads(p.read_text()) if p.exists() else []
