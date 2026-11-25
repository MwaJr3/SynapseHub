"""Shared progress + spaced-review helpers for endgame, strategy and tactic items."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from . import srs
from .models import ItemProgress, User


def _aware(dt):
    return dt.replace(tzinfo=timezone.utc) if dt is not None and dt.tzinfo is None else dt


def record(db: Session, user: User, kind: str, item_id: str, correct: bool) -> ItemProgress:
    row = db.query(ItemProgress).filter_by(user_id=user.id, kind=kind, item_id=item_id).first()
    now = datetime.now(timezone.utc)
    if row is None:
        row = ItemProgress(user_id=user.id, kind=kind, item_id=item_id, due_at=now)
        db.add(row)
    last = _aware(row.last_at)
    elapsed = (now - last).total_seconds() / 86400 if last else 0.0
    new, due = srs.review(srs.Card(row.stability or 1.0, row.difficulty or 3.0, row.reps or 0, row.lapses or 0),
                          correct=correct, elapsed_days=elapsed, now=now)
    row.attempts = (row.attempts or 0) + 1
    row.solved_count = (row.solved_count or 0) + (1 if correct else 0)
    row.stability, row.difficulty, row.reps, row.lapses = new.stability, new.difficulty, new.reps, new.lapses
    row.due_at, row.last_at, row.last_result = due, now, "ok" if correct else "miss"
    db.commit()
    return row


def progress_map(db: Session, user: User, kind: str) -> dict[str, dict]:
    now = datetime.now(timezone.utc)
    out = {}
    for r in db.query(ItemProgress).filter_by(user_id=user.id, kind=kind).all():
        out[r.item_id] = {"attempts": r.attempts, "solved": r.solved_count, "lapses": r.lapses,
                          "due": _aware(r.due_at) <= now, "due_at": _aware(r.due_at).isoformat(),
                          "last_result": r.last_result}
    return out
