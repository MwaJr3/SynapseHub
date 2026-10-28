"""Quests, XP and seasons over HTTP.

Same conventions as the rest of the API: session cookie for the learner, thin routes,
and the reasoning lives in `gamification.py`.

Two things are deliberate:

* **`Idempotency-Key` is a header, not a body field.** A retry is a transport
  concern, and putting the key next to the content invites it to be regenerated with
  the content — which is exactly the mistake idempotency exists to survive.
* **Every refusal explains itself in a sentence a learner can act on.** A 409 that
  says only "conflict" teaches nobody which of the four rules it hit.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from . import config, gamification
from .database import get_db
from .models import Quest, User, XpEntry
from .security import require_user

router = APIRouter(prefix="/api", tags=["quests"])


def _current(request: Request, db: Session) -> User:
    return require_user(db, request.cookies.get(config.SESSION_COOKIE))


def _quests(db: Session) -> list[Quest]:
    return db.query(Quest).order_by(Quest.difficulty.asc(), Quest.slug.asc()).all()


@router.get("/quests")
def list_quests(request: Request, db: Session = Depends(get_db)):
    """Every quest, with this learner's state and how much evidence is still missing."""
    user = _current(request, db)
    now = gamification.utcnow()
    season = gamification.ensure_season(db, now)
    return {
        "season": {
            "id": season.id,
            "name": season.name,
            "theme": season.theme,
            "starts_at": gamification.aware(season.starts_at).isoformat(),
            "ends_at": gamification.aware(season.ends_at).isoformat(),
        },
        "quests": [gamification.quest_payload(db, user, quest, season, now) for quest in _quests(db)],
        "guardrails": gamification.guardrails(db, user, now),
    }


@router.post("/quests/{slug}/accept")
def accept_quest(slug: str, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    quest = gamification.quest_by_slug(db, slug)
    progress = gamification.accept(db, user, quest)
    return {"slug": quest.slug, "state": progress.state, "accepted_at": progress.accepted_at}


@router.post("/quests/{slug}/complete")
def complete_quest(slug: str, request: Request, db: Session = Depends(get_db)):
    """Complete only when the evidence already exists — never on the strength of a click."""
    user = _current(request, db)
    quest = gamification.quest_by_slug(db, slug)
    progress = gamification.complete(db, user, quest)
    return {
        "slug": quest.slug,
        "state": progress.state,
        "evidence": {
            "have": gamification.evidence_count(db, user, quest, progress),
            "need": quest.min_evidence,
        },
    }


@router.post("/quests/{slug}/claim")
def claim_quest(
    slug: str,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
):
    """Award XP. Sending the same key twice returns the same entry, not a second award."""
    user = _current(request, db)
    quest = gamification.quest_by_slug(db, slug)
    entry, created = gamification.claim(db, user, quest, idempotency_key or "")
    return {
        "entry": gamification.entry_payload(entry),
        "created": created,
        "guardrails": gamification.guardrails(db, user),
    }


@router.get("/xp")
def xp_summary(request: Request, db: Session = Depends(get_db)):
    """Totals, the day's guardrails, and the last five awards with their reasons."""
    user = _current(request, db)
    now = gamification.utcnow()
    season = gamification.ensure_season(db, now)
    recent = (
        db.query(XpEntry)
        .filter(XpEntry.user_id == user.id)
        .order_by(XpEntry.created_at.desc())
        .limit(5)
        .all()
    )
    return {
        "total": sum(entry.xp for entry in db.query(XpEntry).filter(XpEntry.user_id == user.id).all()),
        "season_xp": gamification.season_xp(db, user, season.id),
        "season_id": season.id,
        "today": gamification.guardrails(db, user, now),
        "recent": [gamification.entry_payload(entry) for entry in recent],
    }


@router.get("/xp/ledger")
def xp_ledger(request: Request, limit: int = 50, db: Session = Depends(get_db)):
    """Append-only history. There is no update and no delete route, by design."""
    user = _current(request, db)
    if limit < 1 or limit > 200:
        raise HTTPException(422, "limit must be between 1 and 200.")
    rows = (
        db.query(XpEntry)
        .filter(XpEntry.user_id == user.id)
        .order_by(XpEntry.created_at.desc())
        .limit(limit)
        .all()
    )
    return {"entries": [gamification.entry_payload(row) for row in rows], "count": len(rows)}


@router.get("/seasons/current")
def current_season(request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    now = gamification.utcnow()
    season = gamification.ensure_season(db, now)
    starts, ends = gamification.aware(season.starts_at), gamification.aware(season.ends_at)
    return {
        "id": season.id,
        "name": season.name,
        "theme": season.theme,
        "starts_at": starts.isoformat(),
        "ends_at": ends.isoformat(),
        "days_remaining": max(0, (ends - now).days),
        "xp": gamification.season_xp(db, user, season.id),
        "guardrails": gamification.guardrails(db, user, now),
    }
