"""Mastery estimation and mastery tiers.

Mastery is deliberately *not* "lessons completed". A learner who read a lesson
once and answered nothing has mastery 0 here. Mastery moves only on evidence —
a graded attempt — and it decays with the same forgetting curve the scheduler
uses, so a concept "mastered" six months ago and never reviewed is not shown as
mastered today.
"""

from __future__ import annotations

from dataclasses import dataclass

from . import srs

#: How far one attempt moves mastery toward its target. Kept modest so a single
#: lucky or unlucky answer cannot swing a concept from weak to mastered.
BASE_LEARNING_RATE = 0.28
#: Harder questions are stronger evidence, so they move mastery further.
DIFFICULTY_WEIGHTING = 0.04

WEAK_MAX = 0.4
DEVELOPING_MAX = 0.75


@dataclass(frozen=True)
class MasteryUpdate:
    mastery: float
    delta: float


def update_mastery(previous: float, *, correct: bool, difficulty: float) -> MasteryUpdate:
    """Move mastery toward 1.0 on success, toward 0.0 on failure."""
    previous = max(0.0, min(1.0, previous))
    rate = BASE_LEARNING_RATE + DIFFICULTY_WEIGHTING * max(1.0, min(5.0, difficulty))
    target = 1.0 if correct else 0.0
    updated = previous + rate * (target - previous)
    updated = max(0.0, min(1.0, updated))
    return MasteryUpdate(mastery=round(updated, 4), delta=round(updated - previous, 4))


def decayed_mastery(mastery: float, stability_days: float, elapsed_days: float) -> float:
    """Mastery weighted by how likely the concept is to be recalled right now.

    A concept the learner cannot currently recall is not usable knowledge, so the
    knowledge bank shows the decayed figure. The stored mastery is untouched —
    decay is a display/ranking concern, not a rewrite of history.
    """
    return round(max(0.0, min(1.0, mastery)) * srs.retrievability(stability_days, elapsed_days), 4)


def tier(mastery: float, threshold: float = DEVELOPING_MAX) -> str:
    """Label a concept for the knowledge bank."""
    if mastery <= 0.0:
        return "unseen"
    if mastery < WEAK_MAX:
        return "weak"
    if mastery < threshold:
        return "developing"
    return "mastered"


def needs_review(mastery: float, stability_days: float, elapsed_days: float, target: float = 0.9) -> bool:
    """True when recall has decayed below the retention target."""
    if mastery <= 0.0:
        return False
    return srs.retrievability(stability_days, elapsed_days) < target
