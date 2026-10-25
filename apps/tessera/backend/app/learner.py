"""Turning evidence into learner-model updates.

One place decides how an attempt changes what the platform believes about a
learner, so a quiz answer and a solved chess puzzle are processed identically.
SQLite returns naive datetimes, so every stored timestamp is normalised to UTC on
read — otherwise comparing a fresh `datetime.now(timezone.utc)` with a value read
back from the database raises, and a scheduling bug becomes a 500.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from . import config, mastery as mastery_mod, srs
from .models import Attempt, Concept, ConceptState, User


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def as_aware(value: datetime | None) -> datetime | None:
    """SQLite drops timezone info; treat stored values as UTC."""
    if value is None:
        return None
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def elapsed_days(last_reviewed_at: datetime | None, now: datetime) -> float:
    aware = as_aware(last_reviewed_at)
    if aware is None:
        return 0.0
    return max(0.0, (now - aware).total_seconds() / 86_400)


def get_or_create_state(db: Session, user_id: str, concept_id: str) -> ConceptState:
    state = (
        db.query(ConceptState)
        .filter(ConceptState.user_id == user_id, ConceptState.concept_id == concept_id)
        .first()
    )
    if state is None:
        state = ConceptState(user_id=user_id, concept_id=concept_id)
        db.add(state)
        db.flush()
    return state


def record_attempt(
    db: Session,
    *,
    user: User,
    concept: Concept,
    correct: bool,
    latency_ms: int = 0,
    confidence: int = 3,
    question_id: str | None = None,
    now: datetime | None = None,
) -> dict:
    """Record one graded attempt and update mastery + schedule."""
    now = now or utcnow()
    state = get_or_create_state(db, user.id, concept.id)

    db.add(
        Attempt(
            user_id=user.id,
            concept_id=concept.id,
            question_id=question_id,
            correct=correct,
            latency_ms=max(0, latency_ms),
            confidence=max(1, min(5, confidence)),
            created_at=now,
        )
    )

    elapsed = elapsed_days(state.last_reviewed_at, now)
    memory = srs.MemoryState(
        stability_days=state.stability_days,
        difficulty=state.difficulty,
        reps=state.reps,
        lapses=state.lapses,
    )
    scheduled = srs.schedule(
        memory,
        correct=correct,
        elapsed_days=elapsed,
        now=now,
        target_retention=config.TARGET_RETENTION,
    )
    updated = mastery_mod.update_mastery(
        state.mastery, correct=correct, difficulty=concept.difficulty
    )

    state.mastery = updated.mastery
    state.stability_days = scheduled.state.stability_days
    state.difficulty = scheduled.state.difficulty
    state.reps = scheduled.state.reps
    state.lapses = scheduled.state.lapses
    state.last_reviewed_at = now
    state.next_review_at = scheduled.due_at
    db.commit()

    return {
        "concept_id": concept.id,
        "correct": correct,
        "mastery": state.mastery,
        "mastery_delta": updated.delta,
        "tier": mastery_mod.tier(state.mastery, concept.mastery_threshold),
        "stability_days": round(state.stability_days, 3),
        "difficulty": round(state.difficulty, 3),
        "retrievability_before": scheduled.retrievability_before,
        "interval_days": scheduled.interval_days,
        "next_review_at": scheduled.due_at.isoformat(),
        "reps": state.reps,
        "lapses": state.lapses,
    }


def concept_signal(db: Session, user: User, concept: Concept, *, now: datetime | None = None):
    """Build the recommendation input for one concept."""
    from .recommend import ConceptSignal, Prerequisite

    now = now or utcnow()
    state = (
        db.query(ConceptState)
        .filter(ConceptState.user_id == user.id, ConceptState.concept_id == concept.id)
        .first()
    )

    prerequisites: list[Prerequisite] = []
    from .models import ConceptEdge

    edges = (
        db.query(ConceptEdge)
        .filter(ConceptEdge.to_concept_id == concept.id, ConceptEdge.relation == "prerequisite")
        .all()
    )
    for edge in edges:
        prereq = db.get(Concept, edge.from_concept_id)
        if prereq is None:
            continue
        prereq_state = (
            db.query(ConceptState)
            .filter(ConceptState.user_id == user.id, ConceptState.concept_id == prereq.id)
            .first()
        )
        prerequisites.append(
            Prerequisite(
                concept_id=prereq.id,
                title=prereq.title,
                mastery=prereq_state.mastery if prereq_state else 0.0,
            )
        )

    unlocks = (
        db.query(ConceptEdge)
        .filter(ConceptEdge.from_concept_id == concept.id, ConceptEdge.relation == "prerequisite")
        .count()
    )
    max_unlocks = max(1, db.query(ConceptEdge).filter(ConceptEdge.relation == "prerequisite").count() // 3 + 1)

    goal_ids: set[str] = set()
    from .models import Goal

    for goal in db.query(Goal).filter(Goal.user_id == user.id).all():
        goal_ids.update(goal.concept_ids or [])

    return ConceptSignal(
        concept_id=concept.id,
        title=concept.title,
        difficulty=concept.difficulty,
        mastery=state.mastery if state else 0.0,
        stability_days=state.stability_days if state else srs.INITIAL_STABILITY_DAYS,
        last_reviewed_at=as_aware(state.last_reviewed_at) if state else None,
        now=now,
        prerequisites=tuple(prerequisites),
        unlocks=unlocks,
        max_unlocks=max_unlocks,
        goal_relevance=1.0 if concept.id in goal_ids else 0.0,
        interest=0.0,
    )


def all_signals(db: Session, user: User, *, now: datetime | None = None):
    now = now or utcnow()
    concepts = db.query(Concept).order_by(Concept.ordering).all()
    return [concept_signal(db, user, concept, now=now) for concept in concepts]
