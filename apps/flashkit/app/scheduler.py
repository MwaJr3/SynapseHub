"""Initial review algorithm — simple, documented, deterministic.

Algorithm (v1, documented on purpose; NOT a claim of SM-2 equivalence):
- Correct recall: next interval = previous interval * 2 (starting at 1 day),
  nudged by confidence: confidence 5 -> +25%, confidence 1-2 -> -25%.
- Incorrect recall: interval resets to 1 day.
Intervals are capped at 60 days. Confidence is recorded but NEVER treated as
recall performance — the two are distinct columns on purpose.
"""
from __future__ import annotations

from datetime import date, timedelta

MAX_INTERVAL = 60


class ScheduleError(ValueError):
    pass


def next_interval(previous_interval: int, correct: bool, confidence: int) -> int:
    if not 1 <= confidence <= 5:
        raise ScheduleError("Confidence must be an integer between 1 and 5.")
    if not correct:
        return 1
    base = max(previous_interval, 1) * 2
    if confidence >= 5:
        base = int(base * 1.25)
    elif confidence <= 2:
        base = int(base * 0.75)
    return max(1, min(MAX_INTERVAL, base))


def due_date(reviewed_on: date, interval_days: int) -> date:
    return reviewed_on + timedelta(days=interval_days)
