"""Modern features: seeded daily challenge, adaptive difficulty, streaks.

DSA notes: streak computation is O(d) over played dates; adaptive difficulty
is O(w) over the recent window; daily seeds are O(1) hashing.
"""
from __future__ import annotations

import hashlib
from datetime import date, timedelta


def daily_seed(day: str, username: str) -> int:
    """Deterministic per-user-per-day seed: everyone gets the same challenge
    for the same day, reproducibly."""
    digest = hashlib.sha256(f"{day}|{username}".encode()).hexdigest()
    return int(digest[:8], 16)


def daily_range(day: str, username: str, width: int = 100) -> tuple[int, int]:
    seed = daily_seed(day, username)
    low = seed % 50 + 1
    return low, low + width


def adaptive_difficulty(recent_results: list[bool], base_width: int = 100,
                        min_width: int = 10, max_width: int = 500) -> dict:
    """Narrow the range after a hot streak (harder), widen after misses
    (easier). Bounded; the rule is documented, not learned."""
    if not recent_results:
        return {"width": base_width, "direction": "baseline",
                "rule": "no results yet; baseline width"}
    accuracy = sum(recent_results) / len(recent_results)
    if accuracy >= 0.8:
        width = max(min_width, int(base_width * 0.7))
        direction = "harder (narrower range)"
    elif accuracy <= 0.3:
        width = min(max_width, int(base_width * 1.4))
        direction = "easier (wider range)"
    else:
        width = base_width
        direction = "hold"
    return {"width": width, "direction": direction,
            "rule": ("Documented heuristic: accuracy>=0.8 -> x0.7; <=0.3 -> x1.4; else hold. "
                     "Bounded to [{min_width}, {max_width}]. Not a learning-science claim.")}


def streak(days_played: list[str]) -> int:
    """Consecutive-day streak ending today or yesterday (grace day)."""
    if not days_played:
        return 0
    days = sorted({date.fromisoformat(d) for d in days_played})
    today = date.today()
    if days[-1] < today - timedelta(days=1):
        return 0                                  # streak broken (beyond grace)
    count, cursor = 1, days[-1]
    for day in reversed(days[:-1]):
        if day == cursor - timedelta(days=1):
            count += 1
            cursor = day
        elif day < cursor - timedelta(days=1):
            break
    return count
