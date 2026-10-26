"""Phase-B feature tests: recurrence, cycle detection, focus view, filters."""
from __future__ import annotations

import pytest

from app.features import detect_cycle, focus_view, next_occurrence, save_filter, FeatureError


def test_next_occurrence_bounded():
    days = next_occurrence("2026-10-24", "weekly", 3)
    assert days == ["2026-10-31", "2026-11-07", "2026-11-14"]
    with pytest.raises(FeatureError):
        next_occurrence("2026-10-24", "yearly")
    with pytest.raises(FeatureError):
        next_occurrence("2026-10-24", "daily", 100)        # bounded expansion


def test_cycle_detection():
    assert detect_cycle([(1, 2), (2, 3)]) is None
    cycle = detect_cycle([(1, 2), (2, 3), (3, 1)])
    assert cycle is not None and cycle[0] == cycle[-1]
    self_cycle = detect_cycle([(5, 5)])
    assert self_cycle == [5, 5]


def test_focus_view_orders_by_priority_then_due():
    tasks = [{"id": 1, "priority": "low", "due": "2026-10-25"},
             {"id": 2, "priority": "high", "due": "2026-10-30"},
             {"id": 3, "priority": "high", "due": "2026-10-20"},
             {"id": 4, "priority": "medium", "due": "2026-10-21"}]
    focused = focus_view(tasks, limit=3)
    assert [t["id"] for t in focused] == [3, 2, 4]
    with pytest.raises(FeatureError):
        focus_view(tasks, limit=0)


def test_saved_filters():
    registry = save_filter("urgent", {"priority": "high"}, {})
    assert registry["urgent"] == {"priority": "high"}
    with pytest.raises(FeatureError):
        save_filter("  ", {}, {})
