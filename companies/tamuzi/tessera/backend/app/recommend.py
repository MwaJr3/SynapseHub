"""The recommendation engine: what is the highest-value thing to learn next?

Every recommendation is a sum of named, inspectable components, and every
recommendation carries the sentences that explain it. A learner should never be
told "learn this" without being able to see why.

Scoring (spec weights, all configurable through `Weights`):

    score = goal_relevance
          + prerequisite_importance
          + forgetting_risk
          + weakness_severity
          + learning_value
          - difficulty_mismatch

Prerequisite gating is *not* part of the score: a concept whose prerequisites are
unmastered is reported separately as `blocked_by`, so the learner sees the path
("finish functions first") rather than an unexplained absence.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from . import mastery as mastery_mod
from . import srs

#: Prerequisites at or above this mastery stop blocking a dependent concept.
PREREQUISITE_READY_THRESHOLD = 0.6
#: Below this mastery a concept counts as a weakness worth practising.
WEAK_THRESHOLD = 0.5
#: Concepts whose learners are this far from their ability are poor suggestions.
DIFFICULTY_TOLERANCE = 1.5


@dataclass(frozen=True)
class Weights:
    goal_relevance: float = 1.0
    prerequisite_importance: float = 0.6
    forgetting_risk: float = 0.9
    weakness_severity: float = 1.0
    learning_value: float = 0.7
    difficulty_mismatch: float = 0.5


DEFAULT_WEIGHTS = Weights()


@dataclass(frozen=True)
class Prerequisite:
    concept_id: str
    title: str
    mastery: float


@dataclass(frozen=True)
class ConceptSignal:
    """Everything the engine needs to know about one candidate concept."""

    concept_id: str
    title: str
    difficulty: float
    mastery: float
    stability_days: float
    last_reviewed_at: datetime | None
    now: datetime
    prerequisites: tuple[Prerequisite, ...] = ()
    #: How many downstream concepts this one unlocks — the "learning value".
    unlocks: int = 0
    max_unlocks: int = 1
    #: 1.0 when this concept serves one of the learner's stated goals.
    goal_relevance: float = 0.0
    #: Learner's stated interest in the subject, 0..1.
    interest: float = 0.0


@dataclass(frozen=True)
class Recommendation:
    concept_id: str
    title: str
    score: float
    reasons: list[str] = field(default_factory=list)
    blocked_by: list[str] = field(default_factory=list)
    forgetting_risk: float = 0.0
    due: bool = False


def _elapsed_days(last_reviewed_at: datetime | None, now: datetime) -> float:
    if last_reviewed_at is None:
        return 0.0
    return max(0.0, (now - last_reviewed_at).total_seconds() / 86_400)


def score_concept(
    signal: ConceptSignal,
    weights: Weights = DEFAULT_WEIGHTS,
) -> Recommendation:
    elapsed = _elapsed_days(signal.last_reviewed_at, signal.now)
    risk = srs.forgetting_risk(
        srs.MemoryState(stability_days=signal.stability_days), elapsed
    ) if signal.last_reviewed_at is not None else 0.0

    weakness = 1.0 - signal.mastery
    unlock_ratio = signal.unlocks / max(1, signal.max_unlocks)
    mismatch = abs(signal.difficulty - (1 + 4 * signal.mastery)) / 4.0

    blocked: list[str] = [
        f"{p.title} ({p.mastery:.0%})"
        for p in signal.prerequisites
        if p.mastery < PREREQUISITE_READY_THRESHOLD
    ]

    score = (
        weights.goal_relevance * signal.goal_relevance
        + weights.prerequisite_importance * unlock_ratio
        + weights.forgetting_risk * risk
        + weights.weakness_severity * weakness
        + weights.learning_value * (unlock_ratio * 0.5 + signal.interest * 0.5)
        - weights.difficulty_mismatch * mismatch
    )

    reasons: list[str] = []
    due = signal.last_reviewed_at is not None and risk >= (1 - 0.9)
    if due:
        reasons.append(
            f"Recall of {signal.title} has probably decayed to about {1 - risk:.0%} — it is due for review."
        )
    if signal.mastery < WEAK_THRESHOLD and signal.last_reviewed_at is not None:
        reasons.append(
            f"Your mastery of {signal.title} is {signal.mastery:.0%}, below the {WEAK_THRESHOLD:.0%} threshold."
        )
    if signal.last_reviewed_at is None:
        reasons.append(f"You have not studied {signal.title} yet.")
    if signal.goal_relevance > 0:
        reasons.append("It is part of a goal you selected.")
    if signal.unlocks > 0:
        reasons.append(f"It unlocks {signal.unlocks} further concept{'s' if signal.unlocks != 1 else ''}.")
    if blocked:
        reasons.append("Finish its prerequisite first: " + ", ".join(blocked) + ".")

    if not reasons:
        # Explainability is a requirement, not a nicety: a studied concept that is
        # neither due, weak, goal-aligned nor a gateway still needs to say why it
        # is on the list.
        reasons.append(
            f"Balanced next step: your mastery is {signal.mastery:.0%} against a "
            f"concept difficulty of {signal.difficulty:.1f}/5."
        )

    return Recommendation(
        concept_id=signal.concept_id,
        title=signal.title,
        score=round(score, 4),
        reasons=reasons,
        blocked_by=blocked,
        forgetting_risk=risk,
        due=due,
    )


def rank(
    signals: list[ConceptSignal],
    weights: Weights = DEFAULT_WEIGHTS,
    *,
    include_blocked: bool = False,
) -> list[Recommendation]:
    """Order candidates by score. Blocked concepts are excluded by default."""
    scored = [score_concept(signal, weights) for signal in signals]
    if not include_blocked:
        scored = [item for item in scored if not item.blocked_by]
    return sorted(scored, key=lambda item: item.score, reverse=True)


def next_lessons(signals: list[ConceptSignal], limit: int = 3) -> list[Recommendation]:
    """The short list shown on the home screen."""
    return rank(signals)[:limit]


def review_queue(signals: list[ConceptSignal]) -> list[Recommendation]:
    """Concepts whose recall has fallen below the retention target, most urgent first."""
    due = [score_concept(signal) for signal in signals if signal.last_reviewed_at is not None]
    due = [item for item in due if item.due]
    return sorted(due, key=lambda item: item.forgetting_risk, reverse=True)


def weakness_profile(signals: list[ConceptSignal]) -> list[Recommendation]:
    """Weakest studied concepts, the input to personalised practice."""
    studied = [s for s in signals if s.last_reviewed_at is not None]
    weak = [score_concept(s) for s in studied if s.mastery < WEAK_THRESHOLD]
    return sorted(weak, key=lambda item: item.score, reverse=True)
