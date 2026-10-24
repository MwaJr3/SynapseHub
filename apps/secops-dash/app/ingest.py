"""Offline event ingestion from local fixture files with provenance capture."""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path


class IngestError(ValueError):
    pass


@dataclass
class Event:
    event_id: str
    asset: str
    category: str          # auth, network, endpoint, cloud, email
    severity: int          # 1..5 (1 = informational)
    summary: str
    collected_at: str      # provenance: when the tool ingested it
    source_file: str
    indicators: list[str] = field(default_factory=list)


REQUIRED = ("event_id", "asset", "category", "severity", "summary")


def load_events(path: str) -> tuple[list[Event], list[dict]]:
    """Load events from a local JSON file. Invalid rows are returned with
    reasons — never silently dropped. Collected-at timestamps are added at
    ingest time (integrity since collection only)."""
    p = Path(path)
    if not p.exists():
        raise IngestError(f"No such local data file: {path}")
    try:
        payload = json.loads(p.read_text())
    except json.JSONDecodeError as exc:
        raise IngestError(f"Invalid JSON in {path}: {exc}") from exc
    if not isinstance(payload, list):
        raise IngestError("Event file must contain a JSON list.")
    events, rejected = [], []
    now = datetime.now(timezone.utc).isoformat()
    for i, row in enumerate(payload):
        if not isinstance(row, dict):
            rejected.append({"index": i, "reasons": ["not an object"]})
            continue
        missing = [f for f in REQUIRED if f not in row]
        problems = [f"missing field: {m}" for m in missing]
        if "severity" in row and (not isinstance(row["severity"], int) or not 1 <= row["severity"] <= 5):
            problems.append("severity must be an integer 1..5")
        if problems:
            rejected.append({"index": i, "reasons": problems})
            continue
        events.append(Event(
            event_id=str(row["event_id"]), asset=str(row["asset"]), category=str(row["category"]),
            severity=int(row["severity"]), summary=str(row["summary"])[:240],
            collected_at=now, source_file=str(p),
            indicators=[str(x) for x in row.get("indicators", [])]))
    return events, rejected
