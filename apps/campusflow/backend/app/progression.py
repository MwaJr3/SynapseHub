"""Progression features: prerequisite checks, waitlists, timetable clash
detection, dashboard metrics.

All functions are pure (dict/list in, dict/list out) so they can be tested
independently of the database layer.

DSA notes: prerequisite checks are set differences O(p); waitlists are FIFO
O(1) enqueue/dequeue; clash detection is pairwise O(e²) over a student's
sections (small bounded sets); dashboard metrics are one pass O(n).
"""
from __future__ import annotations


class ProgressionError(ValueError):
    pass


def check_prerequisites(completed: set[str], required: set[str]) -> dict:
    missing = sorted(required - completed)
    return {"ok": not missing, "missing": missing,
            "note": "Prerequisite status is computed from recorded completions only."}


class Waitlist:
    """FIFO waitlist per section with capacity-aware admission."""

    def __init__(self) -> None:
        self.queues: dict[int, list[str]] = {}

    def join(self, section_id: int, student: str, seats_taken: int, capacity: int) -> dict:
        if seats_taken < capacity:
            return {"status": "enrolled-directly",
                    "note": "Seats available — no waitlist place needed."}
        queue = self.queues.setdefault(section_id, [])
        if student in queue:
            raise ProgressionError(f"{student} is already on the waitlist for section {section_id}")
        queue.append(student)
        return {"status": "waitlisted", "position": len(queue),
                "note": "Waitlist is FIFO; promotion happens when a seat frees."}

    def promote(self, section_id: int, seats_taken: int, capacity: int) -> str | None:
        queue = self.queues.get(section_id, [])
        if queue and seats_taken < capacity:
            return queue.pop(0)
        return None

    def position(self, section_id: int, student: str) -> int | None:
        queue = self.queues.get(section_id, [])
        return queue.index(student) + 1 if student in queue else None


def detect_clashes(slots: list[dict]) -> list[dict]:
    """slots: [{"course": code, "day": Mon, "start": "HH:MM", "end": "HH:MM"}]"""
    def minutes(hhmm: str) -> int:
        h, m = hhmm.split(":")
        return int(h) * 60 + int(m)

    clashes = []
    for i, a in enumerate(slots):
        for b in slots[i + 1:]:
            if a["day"] != b["day"]:
                continue
            overlap = min(minutes(a["end"]), minutes(b["end"])) - max(minutes(a["start"]), minutes(b["start"]))
            if overlap > 0:
                clashes.append({"courses": [a["course"], b["course"]], "day": a["day"],
                                "overlap_minutes": overlap})
    return clashes


def dashboard_metrics(enrollments: list[dict], capacity: int | None = None) -> dict:
    """Explicit-definition dashboard numbers — every metric states its rule."""
    total = len(enrollments)
    by_status: dict[str, int] = {}
    for e in enrollments:
        by_status[e.get("status", "unknown")] = by_status.get(e.get("status", "unknown"), 0) + 1
    return {"enrollment_count": total, "by_status": by_status,
            "seat_fill_pct": (round(100 * by_status.get("active", 0) / capacity, 1)
                              if capacity else None),
            "definitions": {"active": "enrolments with status=active at query time",
                            "seat_fill_pct": "active / capacity; null when capacity unknown"},
            "note": "Dashboard counts are computed at query time from recorded rows."}


# demo in-memory waitlist store shared by the API (per-process; documented)
_waitlists = Waitlist()
