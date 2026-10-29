"""The review queue: what is due, why, and what to do after a gap.

A due queue is easy to get wrong in two directions. Give a learner a bare list of
concept titles and the schedule becomes something that happens *to* them; give them
everything that is overdue after a two-week absence and the product punishes the
absence by burying them, which is the fastest way to make someone stop opening it.

So every item carries:

* the numbers the decision is made from — predicted recall now, stability, days
  overdue, lapses — and a sentence saying why it is here;
* the formats it can actually be practised in (`practice.available_formats`), so
  the interface never offers a cloze the material cannot support.

And the queue as a whole has a **recovery plan** when the backlog is large: it caps
today's work at a number a person will actually do, says how the rest will be
spread, and — importantly — changes nothing about the schedule. Nothing is reset,
no mastery is docked, no streak is broken. The items keep their real due dates and
come back up; the plan is about throughput, not about rewriting history.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from . import config, mastery as mastery_mod, practice, srs
from .models import Concept, ConceptState, User

#: Above this many overdue reviews, the queue switches to recovery mode.
RECOVERY_THRESHOLD = 8
#: How many reviews recovery mode asks for today.
RECOVERY_DAILY_TARGET = 6
#: Never promise a recovery spread longer than this; after that the plan is "keep
#: going", not "here is a date".
MAX_RECOVERY_DAYS = 14


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def _reasons(
    *,
    elapsed_days: float,
    overdue_days: float,
    recall: float,
    stability_days: float,
    lapses: int,
    reps: int,
    target: float,
) -> list[str]:
    reasons = [
        f"Recall probability is estimated at {recall * 100:.0f}%, below your {target * 100:.0f}% target.",
        f"Last reviewed {elapsed_days:.1f} days ago; the interval set from a {stability_days:.1f}-day stability.",
    ]
    if overdue_days > 0.5:
        reasons.append(f"Overdue by {overdue_days:.1f} days.")
    if lapses:
        reasons.append(f"{lapses} lapse(s) on this concept, so the interval grows more slowly.")
    if reps == 0:  # pragma: no cover - a state with no reps is not scheduled
        reasons.append("No review has been recorded yet.")
    return reasons


def due_items(db: Session, user: User, *, now: datetime | None = None, limit: int = 50) -> list[dict]:
    """Concepts whose scheduled review time has passed, most overdue first.

    Reads every state in one query rather than one per concept: the queue is shown
    on the home screen, and a queue that costs a query per concept is the kind of
    thing that is fine with ten concepts and unusable with two hundred.
    """
    now = now or datetime.now(timezone.utc)
    target = config.TARGET_RETENTION

    states = (
        db.query(ConceptState)
        .filter(ConceptState.user_id == user.id, ConceptState.next_review_at.isnot(None))
        .all()
    )
    if not states:
        return []

    concept_ids = [state.concept_id for state in states]
    concepts = {
        concept.id: concept
        for concept in db.query(Concept).filter(Concept.id.in_(concept_ids)).all()
    }

    # Which formats each due concept can support, and therefore what to offer
    # next. Computed once for the whole queue.
    format_map = practice.formats_by_concept(db, concept_ids)

    items: list[dict] = []
    for state in states:
        concept = concepts.get(state.concept_id)
        if concept is None:
            continue
        # A concept the learner can no longer see (someone else's, or deleted in a
        # way that left a state) must not appear in their queue.
        if concept.owner_id is not None and concept.owner_id != user.id:
            continue
        due_at = _aware(state.next_review_at)
        if due_at is None or due_at > now:
            continue
        last = _aware(state.last_reviewed_at) or now
        elapsed = max(0.0, (now - last).total_seconds() / 86_400)
        overdue = max(0.0, (now - due_at).total_seconds() / 86_400)
        recall = srs.retrievability(state.stability_days, elapsed)

        formats = format_map.get(concept.id) or []
        items.append(
            {
                "concept_id": concept.id,
                "title": concept.title,
                "subject": concept.subject,
                "mastery": state.mastery,
                "tier": mastery_mod.tier(state.mastery, concept.mastery_threshold),
                "retained": mastery_mod.decayed_mastery(state.mastery, state.stability_days, elapsed),
                "predicted_recall": round(recall, 4),
                "stability_days": round(state.stability_days, 2),
                "difficulty": round(state.difficulty, 2),
                "reps": state.reps,
                "lapses": state.lapses,
                "last_reviewed_at": last.isoformat(),
                "next_review_at": due_at.isoformat(),
                "overdue_days": round(overdue, 2),
                "available_formats": formats,
                # The server owns the rotation policy; the screen only displays it.
                # None means the concept has no material a prompt can be built from,
                # and the screen must say so rather than offering a format that
                # would answer 409.
                "suggested_format": formats[state.reps % len(formats)] if formats else None,
                "reasons": _reasons(
                    elapsed_days=elapsed,
                    overdue_days=overdue,
                    recall=recall,
                    stability_days=state.stability_days,
                    lapses=state.lapses,
                    reps=state.reps,
                    target=target,
                ),
            }
        )

    items.sort(key=lambda item: (item["overdue_days"], -item["predicted_recall"]), reverse=True)
    return items[:limit]


def upcoming(db: Session, user: User, *, now: datetime | None = None, limit: int = 5) -> list[dict]:
    """The soonest not-yet-due reviews, so an empty queue is not a dead end."""
    now = now or datetime.now(timezone.utc)
    states = (
        db.query(ConceptState)
        .filter(ConceptState.user_id == user.id, ConceptState.next_review_at > now)
        .order_by(ConceptState.next_review_at)
        .limit(limit)
        .all()
    )
    if not states:
        return []
    concepts = {
        concept.id: concept
        for concept in db.query(Concept).filter(Concept.id.in_([s.concept_id for s in states])).all()
    }
    rows = []
    for state in states:
        concept = concepts.get(state.concept_id)
        if concept is None or (concept.owner_id is not None and concept.owner_id != user.id):
            continue
        due_at = _aware(state.next_review_at)
        rows.append(
            {
                "concept_id": concept.id,
                "title": concept.title,
                "next_review_at": due_at.isoformat() if due_at else None,
                "in_hours": round(max(0.0, (due_at - now).total_seconds() / 3600), 1) if due_at else None,
            }
        )
    return rows


def recovery_plan(overdue_count: int) -> dict:
    """What to do when the backlog is bigger than a sitting.

    The policy is deliberately boring: do the target number today, in order of
    risk, and let the rest come back on their own schedule. No date is moved, so
    nothing is quietly forgiven and nothing is dumped. The alternative — a queue
    that shows ninety items — reliably produces no reviews at all.
    """
    if overdue_count == 0:
        return {
            "active": False,
            "reason": "Nothing is overdue.",
            "today_target": 0,
            "remaining_after_today": 0,
            "spread_days": 0,
        }
    if overdue_count <= RECOVERY_THRESHOLD:
        return {
            "active": False,
            "reason": (
                f"{overdue_count} review(s) overdue, which is an ordinary day's work."
            ),
            "today_target": overdue_count,
            "remaining_after_today": 0,
            "spread_days": 0,
        }

    target = RECOVERY_DAILY_TARGET
    remaining = overdue_count - target
    spread = min(MAX_RECOVERY_DAYS, max(1, -(-remaining // target)))
    return {
        "active": True,
        "reason": (
            f"{overdue_count} reviews are overdue. Today's plan is {target} of them, most "
            f"forgotten first; the other {remaining} stay on their real due dates and will "
            f"come back over roughly {spread} day(s). Nothing has been reset and no mastery "
            "has been taken away."
        ),
        "today_target": target,
        "remaining_after_today": remaining,
        "spread_days": spread,
    }


def next_format(db: Session, user: User, concept_id: str, *, attempts_for_concept: int) -> str:
    """Choose a format for the next attempt on this concept.

    Rotating rather than random: a learner who always answers multiple choice never
    practises production, and the diagnostic this product is built around says
    recognition is not the gap. Formats the material cannot support are skipped.
    """
    available = practice.available_formats(db, db.get(Concept, concept_id))
    if not available:  # pragma: no cover - a concept with no material is never queued
        return "free_recall"
    return available[attempts_for_concept % len(available)]


def review_overview(
    db: Session,
    user: User,
    *,
    now: datetime | None = None,
    today_target: int | None = None,
) -> dict:
    """The whole queue screen in one response."""
    now = now or datetime.now(timezone.utc)
    items = due_items(db, user, now=now)
    plan = recovery_plan(len(items))
    planned = items[: plan["today_target"]] if plan["today_target"] else items
    if today_target is not None:
        planned = planned[: max(0, today_target)]
        plan = {**plan, "today_target": min(plan["today_target"], max(0, today_target)), "capped_by_learner": True}

    return {
        "due": items,
        "today": planned,
        "overdue_count": len(items),
        "recovery": plan,
        "upcoming": upcoming(db, user, now=now),
        "target_retention": config.TARGET_RETENTION,
        "empty_state": _empty_state(db, user),
        "policy": (
            "Ordered by how far overdue each concept is, then by how unlikely recall is. "
            "The reasons on each item are the numbers the order was computed from."
        ),
    }


def _empty_state(db: Session, user: User) -> str | None:
    studied = (
        db.query(ConceptState)
        .filter(ConceptState.user_id == user.id, ConceptState.last_reviewed_at.isnot(None))
        .count()
    )
    if studied:
        return None
    return (
        "Nothing is scheduled yet: reviews appear after you have answered something. "
        "Practice a concept from the knowledge bank and it will start coming back."
    )


def prediction(db: Session, user: User, *, now: datetime | None = None) -> list[dict]:
    """Every studied concept with its predicted recall — the calibration input.

    `evals/recall_eval.py` scores these predictions against simulated outcomes.
    Exported here because a scheduler nobody checks is a scheduler nobody can
    trust, and the check has to run on the same numbers the app uses.
    """
    now = now or datetime.now(timezone.utc)
    states = db.query(ConceptState).filter(ConceptState.user_id == user.id).all()
    out = []
    for state in states:
        last = _aware(state.last_reviewed_at)
        if last is None:
            continue
        elapsed = max(0.0, (now - last).total_seconds() / 86_400)
        out.append(
            {
                "concept_id": state.concept_id,
                "predicted_recall": round(srs.retrievability(state.stability_days, elapsed), 4),
                "elapsed_days": round(elapsed, 3),
                "stability_days": round(state.stability_days, 3),
                "mastery": state.mastery,
            }
        )
    return out
