"""Small, offline-only services for the optional Personal OS desktop companion.

Nothing here connects to a bank, sends a request, recommends a financial action,
or predicts revenue. It only normalizes a user-selected CSV for review.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date
from decimal import Decimal, InvalidOperation
import csv
import io
import json
from typing import Iterable


@dataclass(frozen=True)
class StatementRow:
    date: str
    kind: str
    amount: str
    currency: str
    category: str
    note: str


def _amount(value: str) -> Decimal:
    normalized = value.strip().replace(",", "")
    try:
        amount = Decimal(normalized)
    except InvalidOperation as error:
        raise ValueError(f"Invalid amount: {value!r}") from error
    if not amount.is_finite() or amount == 0:
        raise ValueError("Amount must be a finite non-zero number")
    return amount


def normalize_statement_rows(
    csv_text: str,
    *,
    currency: str = "ZMW",
    date_column: str = "date",
    amount_column: str = "amount",
    description_column: str = "description",
    category_column: str = "category",
) -> list[StatementRow]:
    """Turn an explicitly selected CSV layout into reviewable ledger rows.

    Positive figures are represented as ``income`` and negative figures as
    ``expense`` only when the user supplied a signed amount. This is a
    bookkeeping convention, not an inference about a bank transaction.
    """
    reader = csv.DictReader(io.StringIO(csv_text))
    required = {date_column, amount_column, description_column}
    actual = set(reader.fieldnames or [])
    missing = required - actual
    if missing:
        raise ValueError(f"CSV is missing required columns: {', '.join(sorted(missing))}")

    normalized: list[StatementRow] = []
    for line, raw in enumerate(reader, start=2):
        raw_date = (raw.get(date_column) or "").strip()
        try:
            date.fromisoformat(raw_date)
        except ValueError as error:
            raise ValueError(f"Row {line} has an invalid ISO date: {raw_date!r}") from error
        amount = _amount(raw.get(amount_column) or "")
        normalized.append(
            StatementRow(
                date=raw_date,
                kind="income" if amount > 0 else "expense",
                amount=format(abs(amount), "f"),
                currency=currency.strip().upper() or "ZMW",
                category=(raw.get(category_column) or "").strip() if category_column in actual else "",
                note=(raw.get(description_column) or "").strip(),
            )
        )
    return normalized


def review_export(rows: Iterable[StatementRow]) -> str:
    """Serialise a non-restorable review file; it cannot alter browser data."""
    return json.dumps(
        {
            "format": "personal-os-manual-finance-review-v1",
            "notice": "Review only. This is not a bank connection or a restorable Personal OS backup.",
            "entries": [asdict(row) for row in rows],
        },
        indent=2,
        ensure_ascii=False,
    )


def backup_summary(serialized: str) -> dict[str, int | str]:
    """Read a full browser backup enough to report its safe, non-sensitive shape."""
    try:
        payload = json.loads(serialized)
    except json.JSONDecodeError as error:
        raise ValueError("The selected file is not JSON") from error
    if not isinstance(payload, dict) or payload.get("version") not in {1, 2, 3}:
        raise ValueError("The selected JSON is not a recognizable Personal OS full backup")
    return {
        "version": int(payload["version"]),
        "cycle_name": str(payload.get("cycleName", "")),
        "goals": len(payload.get("goals", [])) if isinstance(payload.get("goals"), list) else 0,
        "actions": len(payload.get("actionItems", [])) if isinstance(payload.get("actionItems"), list) else 0,
        "schedule_blocks": len(payload.get("scheduleBlocks", [])) if isinstance(payload.get("scheduleBlocks"), list) else 0,
    }
