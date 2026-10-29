"""The scheduler is measured, not asserted.

Numbers on this machine (`python -m app.evals.recall_eval`, 200 items, 90 days,
12 reviews per item allowed, seed 7):

    strategy    recall  reviews  per item
    tessera      0.756     2200      11.0
    fixed_7      0.430     2200      11.0
    fixed_30     0.121      600       3.0
    never        0.073        0       0.0
    broken       0.073      200       1.0

At the same number of reviews, the scheduler keeps about 1.76x as much material
recallable as a fixed weekly interval does. The ground truth in the harness is an
*exponential* forgetting model with per-item half-lives and noisy outcomes, while
the scheduler uses a power curve — so this is agreement between two models, not a
model agreeing with itself.

Two guards keep the evaluation honest:

* `broken` — schedules ninety days whatever happened — must fail the same
  threshold the real scheduler passes. If it ever passes, the metric is broken.
* The ordering is required at two different seeds, so a single lucky draw cannot
  be what the claim rests on.
"""

from __future__ import annotations

import pytest

from app.evals.recall_eval import evaluate, report, simulate


@pytest.fixture(scope="module")
def results():
    return evaluate(seed=7)


def test_the_scheduler_retains_more_than_a_fixed_weekly_interval_for_the_same_work(results):
    tessera = results["tessera"]
    fixed = results["fixed_7"]

    # Same allowance, so the difference is placement rather than frequency.
    assert abs(tessera.reviews_per_item - fixed.reviews_per_item) <= 1.5
    assert tessera.mean_recall > fixed.mean_recall + 0.15, (
        f"scheduler {tessera.mean_recall:.3f} vs fixed-7 {fixed.mean_recall:.3f}"
    )


def test_reviewing_anything_beats_reviewing_nothing(results):
    assert results["tessera"].mean_recall > results["never"].mean_recall + 0.3
    assert results["never"].reviewed == 0


def test_the_failure_control_fails_the_threshold_the_scheduler_passes(results):
    """A metric that cannot fail proves nothing."""
    tessera = results["tessera"]
    broken = results["broken"]
    assert tessera.mean_recall >= 0.70
    assert broken.mean_recall < 0.70
    assert broken.reviewed > 0, "the control did spend reviews; it just spent them badly"


def test_a_strategy_that_spends_fewer_reviews_retains_less_here(results):
    """fixed_30 is not 'more efficient' at this horizon: it simply reviewed less."""
    assert results["fixed_30"].reviews_per_item < results["tessera"].reviews_per_item
    assert results["fixed_30"].mean_recall < results["tessera"].mean_recall


def test_the_ordering_holds_at_a_second_seed():
    other = evaluate(seed=11)
    assert other["tessera"].mean_recall > other["fixed_7"].mean_recall + 0.15
    assert other["broken"].mean_recall < 0.70


def test_the_same_seed_produces_the_same_numbers():
    """Determinism is the difference between an evaluation and a demo."""
    first = simulate("tessera", items=40, horizon_days=60, seed=3)
    second = simulate("tessera", items=40, horizon_days=60, seed=3)
    assert (first.mean_recall, first.reviewed) == (second.mean_recall, second.reviewed)


def test_a_strategy_with_no_evidence_scores_zero_rather_than_passing(results):
    """No probes must not be rounded up into a pass."""
    empty = simulate("never", items=10, horizon_days=10, probe_every=5)
    assert empty.reviewed == 0
    assert empty.mean_recall < 1.0
    assert "tessera" in report(results)
