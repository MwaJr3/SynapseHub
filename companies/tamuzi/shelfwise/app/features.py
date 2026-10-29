"""Modern features: holds/waiting lists, overdue reports with extensions.

Design note: a TITLE (the work) and a COPY (a physical item) are distinct —
holds queue on titles; loans attach to copies.

DSA notes: hold queues are FIFO lists O(1) enqueue/dequeue; overdue scan is
O(loans); extension checks are O(1).
"""
from __future__ import annotations

from datetime import date, timedelta


class FeatureError(ValueError):
    pass


class HoldQueue:
    """Waiting list per title: FIFO with duplicate prevention."""

    def __init__(self) -> None:
        self.queues: dict[str, list[str]] = {}

    def place_hold(self, title_id: str, member: str) -> list[str]:
        queue = self.queues.setdefault(title_id, [])
        if member in queue:
            raise FeatureError(f"{member} already holds a place on {title_id}")
        queue.append(member)
        return queue

    def next_up(self, title_id: str) -> str | None:
        queue = self.queues.get(title_id, [])
        return queue[0] if queue else None

    def fulfil(self, title_id: str) -> str | None:
        queue = self.queues.get(title_id, [])
        return queue.pop(0) if queue else None

    def position(self, title_id: str, member: str) -> int | None:
        queue = self.queues.get(title_id, [])
        return queue.index(member) + 1 if member in queue else None


def overdue_report(loans: list[dict], today: str, loan_days: int = 14) -> dict:
    """Overdue loans as of `today` (ISO). Every date comparison uses the
    provided 'today' — no hidden clock."""
    today_d = date.fromisoformat(today)
    overdue = []
    for loan in loans:
        if "due" in loan:
            due = date.fromisoformat(loan["due"])
        else:
            due = date.fromisoformat(loan["loaned"]) + timedelta(days=loan_days)
        if due < today_d:
            overdue.append({"copy": loan.get("copy"), "member": loan.get("member"),
                            "due": due.isoformat(), "days_overdue": (today_d - due).days})
    return {"overdue": overdue, "as_of": today,
            "note": "Overdue status is computed against the provided date; no hidden clock."}


def extend_loan(loan: dict, today: str, extra_days: int = 7, max_extensions: int = 2) -> dict:
    if not 1 <= extra_days <= 30:
        raise FeatureError("extra_days must be within 1..30")
    extensions = loan.get("extensions", 0)
    if extensions >= max_extensions:
        raise FeatureError(f"extension limit reached ({max_extensions})")
    due = date.fromisoformat(loan.get("due", today))
    new_due = due + timedelta(days=extra_days)
    return {"copy": loan.get("copy"), "due": new_due.isoformat(), "extensions": extensions + 1,
            "note": "Extension recorded; holds on the title still take priority at the next renewal."}
