"""The scheduler must behave like memory, not like a lookup table."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app import srs

NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)


def test_stability_is_the_ninety_percent_interval():
    for stability in (1.0, 5.0, 40.0):
        assert srs.retrievability(stability, stability) == pytest.approx(0.9, abs=1e-9)
        assert srs.interval_for(stability, 0.9) == pytest.approx(stability, rel=1e-6)


def test_recall_decays_monotonically():
    days = (0, 1, 5, 10, 30, 300)
    values = [srs.retrievability(10.0, day) for day in days]
    assert values[0] == 1.0
    assert values == sorted(values, reverse=True)
    # The power curve decays slower than an exponential one: recall is still ~0.77
    # at 3x the stability, and only falls below half much later. That is the point
    # of using it, so the test pins the actual shape rather than a guess.
    assert values[4] == pytest.approx(0.766, abs=0.01)
    assert values[-1] < 0.5


def test_success_grows_stability_and_failure_shrinks_it():
    state = srs.MemoryState(stability_days=4.0, difficulty=3.0)

    success = srs.schedule(state, correct=True, elapsed_days=4.0, now=NOW)
    failure = srs.schedule(state, correct=False, elapsed_days=4.0, now=NOW)

    assert success.state.stability_days > state.stability_days
    assert failure.state.stability_days < state.stability_days
    assert success.due_at > failure.due_at


def test_harder_recall_earns_more_stability_than_easy_recall():
    state = srs.MemoryState(stability_days=4.0, difficulty=3.0)
    # Same success, but one review arrived after recall had decayed far more.
    easy = srs.schedule(state, correct=True, elapsed_days=0.5, now=NOW)
    hard = srs.schedule(state, correct=True, elapsed_days=12.0, now=NOW)
    assert hard.state.stability_days > easy.state.stability_days
    assert hard.retrievability_before < easy.retrievability_before


def test_a_failure_is_retried_the_same_day_not_next_week():
    state = srs.MemoryState(stability_days=40.0, difficulty=2.0)
    result = srs.schedule(state, correct=False, elapsed_days=40.0, now=NOW)
    assert result.due_at == NOW + srs.RETRY_AFTER_FAILURE
    assert result.state.lapses == state.lapses + 1
    # A long-stability concept must not be rescheduled 40 days out after a lapse.
    assert result.due_at - NOW < timedelta(days=1)


def test_retention_target_changes_the_interval():
    state = srs.MemoryState(stability_days=10.0)
    relaxed = srs.schedule(state, correct=True, elapsed_days=10.0, now=NOW, target_retention=0.8)
    strict = srs.schedule(state, correct=True, elapsed_days=10.0, now=NOW, target_retention=0.95)
    assert relaxed.interval_days > strict.interval_days


def test_interval_is_never_shorter_than_the_floor():
    state = srs.MemoryState(stability_days=srs.MIN_STABILITY_DAYS, difficulty=5.0)
    result = srs.schedule(state, correct=False, elapsed_days=100.0, now=NOW)
    assert result.state.stability_days >= srs.MIN_STABILITY_DAYS


def test_target_retention_is_validated():
    with pytest.raises(ValueError):
        srs.interval_for(5.0, target_retention=1.0)
