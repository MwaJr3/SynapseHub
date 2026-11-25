"""Small spaced-repetition scheduler (stability model), written for ChessScope.

Modelled on the approach of tessera's srs.py: each card keeps a stability (days at which
recall probability is 90%) and a difficulty 1..5. Recall follows
R(t) = (1 + FACTOR*t/S) ** DECAY with FACTOR=19/81, DECAY=-0.5 so R(S)=0.9 exactly.
Simplified, documented, not a published algorithm; constants are named so they can be tuned.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

FACTOR = 19 / 81
DECAY = -0.5
INITIAL_STABILITY = 1.0
MIN_STABILITY = 0.25
MAX_STABILITY = 365.0
RETRY_AFTER_FAILURE = timedelta(hours=6)
FAILURE_CONTRACTION = 0.4
GROWTH_PER_FORGOTTEN = 1.6
TARGET_RETENTION = 0.9


@dataclass(frozen=True)
class Card:
    stability: float = INITIAL_STABILITY
    difficulty: float = 3.0
    reps: int = 0
    lapses: int = 0


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def retrievability(stability: float, elapsed_days: float) -> float:
    if stability <= 0:
        return 0.0
    if elapsed_days <= 0:
        return 1.0
    return float((1 + FACTOR * elapsed_days / stability) ** DECAY)


def interval_for(stability: float, target: float = TARGET_RETENTION) -> float:
    if not 0.5 <= target < 1.0:
        raise ValueError("target must be in [0.5, 1.0)")
    s = _clamp(stability, MIN_STABILITY, MAX_STABILITY)
    return _clamp((s / FACTOR) * (target ** (1 / DECAY) - 1), MIN_STABILITY, MAX_STABILITY)


def review(card: Card, *, correct: bool, elapsed_days: float, now: datetime) -> tuple[Card, datetime]:
    """Return the new card state and its next due time."""
    seen = retrievability(card.stability, elapsed_days)
    if correct:
        factor = _clamp(1.15 - 0.05 * card.difficulty, 0.5, 1.5)
        growth = 1.0 + GROWTH_PER_FORGOTTEN * (1.0 - seen) * factor
        stability = _clamp(card.stability * max(growth, 1.05), MIN_STABILITY, MAX_STABILITY)
        new = Card(stability, _clamp(card.difficulty - 0.1, 1.0, 5.0), card.reps + 1, card.lapses)
        return new, now + timedelta(days=interval_for(stability))
    stability = _clamp(card.stability * FAILURE_CONTRACTION, MIN_STABILITY, MAX_STABILITY)
    new = Card(stability, _clamp(card.difficulty + 0.3, 1.0, 5.0), card.reps + 1, card.lapses + 1)
    return new, now + RETRY_AFTER_FAILURE
