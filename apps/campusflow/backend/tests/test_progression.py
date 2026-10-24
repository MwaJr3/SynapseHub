"""Phase-B tests: prerequisites, waitlist FIFO promotion, clashes, dashboard."""
from __future__ import annotations

import pytest

from app.progression import (ProgressionError, Waitlist, check_prerequisites,
                             dashboard_metrics, detect_clashes)


def test_prerequisites():
    r = check_prerequisites({"CS101"}, {"CS101", "MATH101"})
    assert r["ok"] is False and r["missing"] == ["MATH101"]
    r2 = check_prerequisites({"CS101", "MATH101"}, {"CS101", "MATH101"})
    assert r2["ok"] is True and "recorded completions only" in r2["note"]


def test_waitlist_fifo_promotion():
    w = Waitlist()
    direct = w.join(1, "ada", seats_taken=2, capacity=3)
    assert direct["status"] == "enrolled-directly"
    w1 = w.join(1, "bob", seats_taken=3, capacity=3)
    w2 = w.join(1, "cy", seats_taken=3, capacity=3)
    assert w1["position"] == 1 and w2["position"] == 2
    with pytest.raises(ProgressionError):
        w.join(1, "bob", seats_taken=3, capacity=3)       # duplicate refused
    promoted = w.promote(1, seats_taken=3, capacity=4)
    assert promoted == "bob"                               # FIFO
    assert w.position(1, "cy") == 1


def test_clash_detection():
    slots = [{"course": "CS101", "day": "Mon", "start": "09:00", "end": "10:30"},
             {"course": "MATH101", "day": "Mon", "start": "10:00", "end": "11:00"},
             {"course": "ENG101", "day": "Mon", "start": "11:00", "end": "12:00"}]
    clashes = detect_clashes(slots)
    assert len(clashes) == 1 and clashes[0]["overlap_minutes"] == 30


def test_dashboard_definitions():
    enrollments = [{"status": "active"}, {"status": "active"}, {"status": "withdrawn"}]
    d = dashboard_metrics(enrollments, capacity=4)
    assert d["enrollment_count"] == 3 and d["by_status"] == {"active": 2, "withdrawn": 1}
    assert d["seat_fill_pct"] == 50.0
    assert "active / capacity" in d["definitions"]["seat_fill_pct"]
    assert dashboard_metrics([], capacity=None)["seat_fill_pct"] is None
