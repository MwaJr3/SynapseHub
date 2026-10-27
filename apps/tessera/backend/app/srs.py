"""Spaced-repetition scheduling based on memory stability.

Why not "correct -> tomorrow, wrong -> today"? That rule ignores everything known
about forgetting: it cannot tell a concept recalled instantly after one lesson
from one recalled after a month, so it either over-reviews easy material or
under-reviews hard material. This module keeps an explicit memory state per
(learner, concept) and schedules from it.

Model
-----
`stability` is measured in days and means *the interval at which the learner has
a 90% chance of recalling the concept*. Recall probability follows the
power-forgetting curve used by modern schedulers:

    R(t) = (1 + FACTOR * t / stability) ** DECAY

with FACTOR = 19/81 and DECAY = -0.5. That pair is chosen so that R(stability)
is exactly 0.9, which makes `stability` directly interpretable and lets the
target retention be configurable:

    interval_for(stability, R_target) = (stability / FACTOR) * (R_target ** (1/DECAY) - 1)

`difficulty` is a per-concept 1..5 estimate of how hard this learner finds it,
which modulates how much a successful review grows stability.

This is a simplified stability model in the spirit of FSRS, documented here
rather than presented as a published algorithm. Every constant is a named
module-level value so it can be tuned, and the tests pin the properties that
matter: harder recall grows stability more, failure shrinks it, and the
scheduled interval always matches the requested retention target.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta

# Power-forgetting constants (see module docstring for the derivation).
FACTOR = 19 / 81
DECAY = -0.5

MIN_DIFFICULTY = 1.0
MAX_DIFFICULTY = 5.0

INITIAL_STABILITY_DAYS = 1.0
MIN_STABILITY_DAYS = 0.25
MAX_STABILITY_DAYS = 730.0

#: A failed review is retried the same day rather than shoved to tomorrow.
RETRY_AFTER_FAILURE = timedelta(hours=6)

#: Growth multiplier on a successful review, per unit of forgetting observed.
GROWTH_PER_FORGOTTEN = 1.5
#: Difficulty modulates growth: hard material grows stability more slowly.
DIFFICULTY_GROWTH_BASE = 1.15
DIFFICULTY_GROWTH_STEP = 0.05
#: A failed review contracts stability to this fraction.
FAILURE_CONTRACTION = 0.35
#: How far each review moves the difficulty estimate.
DIFFICULTY_INCREASE_ON_FAILURE = 0.3
DIFFICULTY_DECREASE_ON_SUCCESS = 0.1

DEFAULT_TARGET_RETENTION = 0.9


@dataclass(frozen=True)
class MemoryState:
    """What the learner model remembers about one concept."""

    stability_days: float = INITIAL_STABILITY_DAYS
    difficulty: float = 3.0
    reps: int = 0
    lapses: int = 0


@dataclass(frozen=True)
class ScheduleResult:
    state: MemoryState
    interval_days: float
    due_at: datetime
    #: Recall probability *before* this review — the honesty check on "was this
    #: review actually valuable, or was it already known?"
    retrievability_before: float


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def retrievability(stability_days: float, elapsed_days: float) -> float:
    """Probability the concept is still recalled after `elapsed_days`."""
    if stability_days <= 0:
        return 0.0
    if elapsed_days <= 0:
        return 1.0
    return float((1 + FACTOR * elapsed_days / stability_days) ** DECAY)


def interval_for(stability_days: float, target_retention: float = DEFAULT_TARGET_RETENTION) -> float:
    """Days until recall probability decays to `target_retention`."""
    if not 0.5 <= target_retention < 1.0:
        raise ValueError("target_retention must be in [0.5, 1.0)")
    stability = _clamp(stability_days, MIN_STABILITY_DAYS, MAX_STABILITY_DAYS)
    interval = (stability / FACTOR) * (target_retention ** (1 / DECAY) - 1)
    return _clamp(interval, MIN_STABILITY_DAYS, MAX_STABILITY_DAYS)


def schedule(
    state: MemoryState,
    *,
    correct: bool,
    elapsed_days: float,
    now: datetime,
    target_retention: float = DEFAULT_TARGET_RETENTION,
    evidence_weight: float = 1.0,
) -> ScheduleResult:
    """Advance the memory state by one review and compute the next due date.

    `evidence_weight` scales how much the review is allowed to change the model:
    1.0 for an answer the server graded itself, less for one the learner judged
    against criteria they were shown. A self-assessed "I knew that" is weaker
    evidence than a blank the server filled in correctly, and pretending
    otherwise would let a learner grow their own intervals by ticking boxes.
    """
    if not 0.0 < evidence_weight <= 1.0:
        raise ValueError("evidence_weight must be in (0, 1]")
    observed = retrievability(state.stability_days, elapsed_days)

    if correct:
        # A review that succeeded *despite* low recall says more about encoding
        # than one that succeeded immediately — so it earns more stability.
        forgotten = 1.0 - observed
        difficulty_factor = _clamp(
            DIFFICULTY_GROWTH_BASE - DIFFICULTY_GROWTH_STEP * state.difficulty, 0.5, 1.5
        )
        growth = 1.0 + GROWTH_PER_FORGOTTEN * forgotten * difficulty_factor
        # Weak evidence gets part of the way there, not all of it: interpolate
        # the growth rather than skipping the review entirely.
        effective_growth = 1.0 + (growth - 1.0) * evidence_weight
        stability = _clamp(state.stability_days * effective_growth, MIN_STABILITY_DAYS, MAX_STABILITY_DAYS)
        new_state = MemoryState(
            stability_days=stability,
            difficulty=_clamp(state.difficulty - DIFFICULTY_DECREASE_ON_SUCCESS, MIN_DIFFICULTY, MAX_DIFFICULTY),
            reps=state.reps + 1,
            lapses=state.lapses,
        )
        interval = interval_for(stability, target_retention)
        due = now + timedelta(days=interval)
    else:
        # The same asymmetry applies to failure, but never to zero: a failure
        # always costs something, however weakly it was judged.
        contraction = 1.0 - (1.0 - FAILURE_CONTRACTION) * evidence_weight
        stability = _clamp(state.stability_days * contraction, MIN_STABILITY_DAYS, MAX_STABILITY_DAYS)
        new_state = MemoryState(
            stability_days=stability,
            difficulty=_clamp(state.difficulty + DIFFICULTY_INCREASE_ON_FAILURE, MIN_DIFFICULTY, MAX_DIFFICULTY),
            reps=state.reps + 1,
            lapses=state.lapses + 1,
        )
        # Retry soon, but not instantly: an immediate repeat measures short-term
        # memory, not whether the concept is being retained.
        interval = min(RETRY_AFTER_FAILURE.total_seconds() / 86_400, interval_for(stability, target_retention))
        due = now + RETRY_AFTER_FAILURE

    return ScheduleResult(
        state=new_state,
        interval_days=round(interval, 4),
        due_at=due,
        retrievability_before=round(observed, 6),
    )


def forgetting_risk(state: MemoryState, elapsed_days: float) -> float:
    """1.0 = almost certainly forgotten, 0.0 = freshly reviewed."""
    return round(1.0 - retrievability(state.stability_days, elapsed_days), 6)
