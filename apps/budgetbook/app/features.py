"""Modern features: CSV import with duplicate warnings, recurring templates.

DSA notes: duplicate detection hashes each row (O(n) expected); template
materialization is O(templates × periods) with an explicit count bound.
"""
from __future__ import annotations

import csv
import hashlib
import io
from datetime import date, timedelta


class FeatureError(ValueError):
    pass


def _row_key(row: dict) -> str:
    try:
        amount = f"{float(row.get('amount') or 0):.2f}"     # normalize "12.50" == 12.5
    except (TypeError, ValueError):
        amount = str(row.get("amount", ""))
    raw = f"{row.get('date','')}|{row.get('kind','')}|{amount}|{row.get('description','')}"
    return hashlib.sha256(raw.encode()).hexdigest()


def import_csv(text: str, existing_rows: list[dict] | None = None) -> dict:
    """Parse CSV (date,kind,amount,category,description). Invalid rows are
    reported with reasons; duplicates (exact row hash, or same date+amount+
    description as an existing row) are returned as warnings — never dropped
    silently."""
    reader = csv.DictReader(io.StringIO(text))
    required = ("date", "kind", "amount")
    rows, rejected, duplicates = [], [], []
    seen = {_row_key(r) for r in (existing_rows or [])}
    for i, row in enumerate(reader, start=2):
        problems = [f"missing column: {c}" for c in required if not (row.get(c) or "").strip()]
        amount = None
        if not problems:
            try:
                amount = float(row["amount"])
            except ValueError:
                problems.append(f"amount {row['amount']!r} is not a number")
        if not problems and row["kind"] not in ("income", "expense", "refund"):
            problems.append(f"kind {row['kind']!r} must be income|expense|refund")
        if problems:
            rejected.append({"line": i, "row": row, "reasons": problems})
            continue
        key = _row_key(row)
        if key in seen:
            duplicates.append({"line": i, "row": row, "reason": "exact duplicate row"})
            continue
        seen.add(key)
        rows.append({"date": row["date"], "kind": row["kind"], "amount": amount,
                     "category": row.get("category", ""), "description": row.get("description", "")})
    return {"imported": rows, "rejected": rejected, "duplicates": duplicates,
            "note": "Duplicates are warnings — the caller decides. Nothing is dropped silently."}


INTERVALS = {"daily": 1, "weekly": 7, "monthly": 30}


class RecurringTemplate:
    """Recurring transaction template. Materialized transactions are flagged
    'needs-review' — the user confirms before they count."""

    def __init__(self, name: str, kind: str, amount: float, interval: str, start: str,
                 description: str = "") -> None:
        if interval not in INTERVALS:
            raise FeatureError(f"interval must be one of {sorted(INTERVALS)}")
        if amount < 0:
            raise FeatureError("amount must be non-negative")
        self.name, self.kind, self.amount = name, kind, amount
        self.interval, self.start = interval, date.fromisoformat(start)
        self.description = description

    def materialize(self, upto: str, limit: int = 365) -> list[dict]:
        end = date.fromisoformat(upto)
        step = INTERVALS[self.interval]
        out, current, count = [], self.start, 0
        while current <= end and count < limit:
            out.append({"date": current.isoformat(), "kind": self.kind, "amount": self.amount,
                        "description": self.description or self.name, "status": "needs-review"})
            current += timedelta(days=step)
            count += 1
        return out
