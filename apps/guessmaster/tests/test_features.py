"""Phase-B feature tests: daily seeds, adaptive difficulty, streaks."""
from __future__ import annotations

from datetime import date, timedelta

from app.features import adaptive_difficulty, daily_range, daily_seed, streak


def test_daily_seed_reproducible_and_per_user():
    assert daily_seed("2026-10-24", "alice") == daily_seed("2026-10-24", "alice")
    assert daily_seed("2026-10-24", "alice") != daily_seed("2026-10-24", "bob")
    assert daily_seed("2026-10-24", "alice") != daily_seed("2026-10-25", "alice")
    low, high = daily_range("2026-10-24", "alice", width=50)
    assert high - low == 50 and low >= 1


def test_adaptive_difficulty_rule():
    hard = adaptive_difficulty([True] * 5, base_width=100)
    assert hard["width"] == 70 and "harder" in hard["direction"]
    easy = adaptive_difficulty([False] * 5, base_width=100)
    assert easy["width"] == 140 and "easier" in easy["direction"]
    hold = adaptive_difficulty([True, False, True, False], base_width=100)
    assert hold["width"] == 100 and hold["direction"] == "hold"
    assert "Not a learning-science claim" in hard["rule"]


def test_adaptive_bounds():
    tiny = adaptive_difficulty([True] * 10, base_width=15, min_width=10)
    assert tiny["width"] == 10                       # clamped at minimum
    huge = adaptive_difficulty([False] * 10, base_width=400, max_width=500)
    assert huge["width"] == 500                      # clamped at maximum


def test_streak_counts_consecutive_days():
    today = date.today()
    days = [(today - timedelta(days=i)).isoformat() for i in range(3)]
    assert streak(days) == 3
    assert streak(days + ["2020-01-01"]) == 3        # gap breaks earlier chain
    assert streak([]) == 0
    broken = [(today - timedelta(days=5)).isoformat()]
    assert streak(broken) == 0                       # older than grace day
