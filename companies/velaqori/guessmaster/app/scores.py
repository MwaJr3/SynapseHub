"""Persistent high-score table (JSON). Lower attempt counts rank first."""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass
class Score:
    player: str
    difficulty: str
    attempts: int
    won: bool
    recorded_at: str


def record(path: str | Path, player: str, difficulty: str, attempts: int, won: bool) -> None:
    p = Path(path)
    rows = json.loads(p.read_text()) if p.exists() else []
    rows.append(asdict(Score(player, difficulty, attempts, won, datetime.now(timezone.utc).isoformat())))
    p.write_text(json.dumps(rows, indent=2))


def top(path: str | Path, difficulty: str | None = None, limit: int = 10) -> list[dict]:
    p = Path(path)
    if not p.exists():
        return []
    rows = [r for r in json.loads(p.read_text()) if r.get("won")]
    if difficulty:
        rows = [r for r in rows if r["difficulty"] == difficulty]
    rows.sort(key=lambda r: (r["attempts"], r["recorded_at"]))
    return rows[:limit]
