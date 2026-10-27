"""Quests, an append-only XP ledger, seasons, and the rules that stop the game
from eating the learning.

Three problems this file answers, in order of importance:

**Farming.** Points attract the cheapest path to points: repeat the easiest thing,
submit twice, claim again from a retry. Four defences, each testable:
`idempotency_key` (unique per learner, enforced by the schema), one claim per quest
per season, diminishing returns for repeating the same concept in one day, and a
daily cap where further work is recorded with `xp = 0` rather than silently dropped.

**Obsession.** A learning product that rewards minutes will get minutes. The cap is
on *time*, not points: past `MAX_DAILY_MINUTES` of recorded sessions in a day, claims
are refused with a rest message and no penalty. Absence is never punished — there is
no streak to break and no negative entry the ledger can hold.

**Explainability.** `xp = round(base × difficulty × challenge × strategic ×
evidence)`, and all four factors are stored beside the number, with the concept and
any reduction (diminishing return, cap) written into `reason`. A learner can ask "why
37?" and the row answers without re-running current code.

Nothing here invents evidence. A quest is claimable only when attempts or sessions
that already exist satisfy `min_evidence`; if they do not, the API says how many are
missing.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import config
from .models import (
    ConceptState,
    Goal,
    LearningSession,
    Quest,
    QuestProgress,
    RetrievalAttempt,
    Season,
    User,
    XpEntry,
)

ANCHOR = datetime.fromisoformat(config.SEASON_ANCHOR)
SEASON_LENGTH = timedelta(weeks=config.SEASON_WEEKS)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def day_start(moment: datetime) -> datetime:
    return moment.replace(hour=0, minute=0, second=0, microsecond=0)


# ------------------------------------------------------------------------- seasons


def season_window(now: datetime) -> tuple[str, datetime, datetime, int]:
    """The season that contains `now`, derived rather than stored.

    A pure function of the clock: two processes computing the same instant get the
    same id, so concurrent creation is a no-op instead of a duplicate row.
    """
    if now < ANCHOR:
        # Before the anchor there is no season to belong to. Rather than invent a
        # season -1 with negative bounds, the first window is used and the caller
        # keeps its own date in the reason string.
        index = 0
    else:
        index = int((now - ANCHOR) // SEASON_LENGTH)
    start = ANCHOR + SEASON_LENGTH * index
    end = start + SEASON_LENGTH
    return f"s{index + 1:03d}", start, end, index + 1


def ensure_season(db: Session, now: datetime | None = None) -> Season:
    """Create the current season if it does not exist, and return it."""
    now = now or utcnow()
    season_id, start, end, number = season_window(now)
    season = db.get(Season, season_id)
    if season is None:
        season = Season(
            id=season_id,
            name=f"Season {number}",
            theme="Retrieval over recognition",
            starts_at=start,
            ends_at=end,
        )
        db.add(season)
        db.commit()
    return season


# ---------------------------------------------------------------------------- xp


def award(base_xp: int, difficulty: float, challenge: float, strategic: float, evidence: float) -> int:
    """The published formula, with half-up rounding.

    Python's `round` is banker's rounding (round(2.5) == 2), which would make an XP
    value depend on whether the digit before the half was odd. Half-up is what a
    learner computes in their head.
    """
    value = base_xp * difficulty * challenge * strategic * evidence
    return max(0, int(math.floor(value + 0.5)))


def daily_entries(db: Session, user: User, now: datetime) -> list[XpEntry]:
    start = day_start(now)
    return (
        db.query(XpEntry)
        .filter(XpEntry.user_id == user.id, XpEntry.created_at >= start)
        .order_by(XpEntry.created_at.asc())
        .all()
    )


def xp_today(db: Session, user: User, now: datetime) -> int:
    return sum(entry.xp for entry in daily_entries(db, user, now))


def season_xp(db: Session, user: User, season_id: str) -> int:
    rows = (
        db.query(XpEntry)
        .filter(XpEntry.user_id == user.id, XpEntry.season_id == season_id)
        .all()
    )
    return sum(row.xp for row in rows)


# ---------------------------------------------------------------------- guardrails


def minutes_today(db: Session, user: User, now: datetime) -> int:
    """Recorded minutes in sessions that started today, plus any open session so far.

    This is the anti-obsession input, and it is measured from `learning_sessions` —
    the table that already exists — rather than from a new timer the product would
    have to trust.
    """
    start = day_start(now)
    sessions = (
        db.query(LearningSession)
        .filter(LearningSession.user_id == user.id, LearningSession.started_at >= start)
        .all()
    )
    total = 0
    for session in sessions:
        if session.minutes_spent is not None:
            total += session.minutes_spent
        elif session.status == "open":
            started = aware(session.started_at) or now
            total += max(0, int((now - started).total_seconds() // 60))
    return total


def guardrails(db: Session, user: User, now: datetime | None = None) -> dict:
    now = now or utcnow()
    minutes = minutes_today(db, user, now)
    xp = xp_today(db, user, now)
    time_paused = minutes >= config.MAX_DAILY_MINUTES
    xp_capped = xp >= config.XP_DAILY_CAP
    reason = (
        f"{minutes} minutes recorded today, and the day's limit is {config.MAX_DAILY_MINUTES}. "
        "Come back tomorrow; nothing is lost and nothing is taken away."
        if time_paused
        else f"{xp} XP today, and the day's cap is {config.XP_DAILY_CAP}. Work still counts as practice; it just stops earning."
        if xp_capped
        else ""
    )
    return {
        "minutes_today": minutes,
        "minutes_limit": config.MAX_DAILY_MINUTES,
        "xp_today": xp,
        "xp_cap": config.XP_DAILY_CAP,
        "paused": time_paused,
        "capped": xp_capped,
        "message": reason,
        # Stated in every response so the screen never has to guess: there is no
        # streak, and no absence penalty exists in this product.
        "absence_penalty": False,
    }


def diminishing_factor(db: Session, user: User, concept_ids: list[str], now: datetime) -> tuple[float, int]:
    """Repeat work on the same concept in one day is worth less each time.

    Returns `(factor, repeats)` where `repeats` is how many entries already exist
    today for the quest's concepts. A quest with no concept (a general review) is not
    diminished by this rule: there is nothing specific being repeated.
    """
    if not concept_ids:
        return 1.0, 0
    entries = daily_entries(db, user, now)
    repeats = sum(1 for entry in entries if entry.concept_id in concept_ids)
    steps = config.DIMINISHING_XP
    return (steps[repeats] if repeats < len(steps) else 0.0), repeats


# ------------------------------------------------------------------------ evidence


def evidence_count(db: Session, user: User, quest: Quest, progress: QuestProgress) -> int:
    """How much real evidence exists since the quest was accepted."""
    since = aware(progress.accepted_at) or day_start(utcnow())
    query = db.query(RetrievalAttempt).filter(
        RetrievalAttempt.user_id == user.id, RetrievalAttempt.created_at >= since
    )
    if quest.concept_ids:
        query = query.filter(RetrievalAttempt.concept_id.in_(quest.concept_ids))
    attempts = query.count()
    if quest.kind != "reflection":
        return attempts
    # A reflection quest is answered by sitting down and finishing, not by another
    # answer: finished sessions since acceptance count instead.
    sessions = (
        db.query(LearningSession)
        .filter(
            LearningSession.user_id == user.id,
            LearningSession.started_at >= since,
            LearningSession.status.in_(("completed", "partial")),
        )
        .count()
    )
    return max(attempts, sessions)


def evidence_factor(db: Session, user: User, quest: Quest, progress: QuestProgress) -> float:
    """Mean evidence weight of the attempts behind the claim, clamped to [0.5, 1.0].

    Self-graded recall is real evidence but weaker evidence; this is the same
    `evidence_weight` the scheduler uses, so the two cannot disagree.
    """
    since = aware(progress.accepted_at) or day_start(utcnow())
    query = db.query(RetrievalAttempt).filter(
        RetrievalAttempt.user_id == user.id, RetrievalAttempt.created_at >= since
    )
    if quest.concept_ids:
        query = query.filter(RetrievalAttempt.concept_id.in_(quest.concept_ids))
    weights = [row.evidence_weight for row in query.all()]
    if not weights:
        return 0.5
    mean = sum(weights) / len(weights)
    return max(0.5, min(1.0, round(mean, 3)))


def challenge_factor(db: Session, user: User, quest: Quest) -> float:
    """Harder for this learner, worth more: `1 + 0.5 × (1 − mastery)`.

    `mastery` is the mean over the quest's concepts; a concept the learner has never
    reviewed contributes 0, which is not a judgement about them — an unreviewed
    concept is simply unmeasured, and an unmeasured concept is still work to do.
    """
    if not quest.concept_ids:
        return 1.0
    states = (
        db.query(ConceptState)
        .filter(ConceptState.user_id == user.id, ConceptState.concept_id.in_(quest.concept_ids))
        .all()
    )
    by_concept = {state.concept_id: float(state.mastery or 0.0) for state in states}
    mastery = sum(by_concept.get(concept, 0.0) for concept in quest.concept_ids) / len(quest.concept_ids)
    return round(1.0 + 0.5 * (1.0 - max(0.0, min(1.0, mastery))), 3)


def strategic_factor(db: Session, user: User, quest: Quest) -> float:
    """Points for work that serves a stated goal, not for work that does not."""
    if not quest.concept_ids:
        return 1.0
    goals = db.query(Goal).filter(Goal.user_id == user.id).all()
    targeted = {
        concept
        for goal in goals
        for concept in (goal.concept_ids or [])
    }
    if targeted & set(quest.concept_ids):
        return 1.2
    return 1.0


# -------------------------------------------------------------------------- claim


def progress_for(
    db: Session, user: User, quest: Quest, season_id: str, create: bool = False
) -> QuestProgress | None:
    progress = (
        db.query(QuestProgress)
        .filter(
            QuestProgress.user_id == user.id,
            QuestProgress.quest_id == quest.id,
            QuestProgress.season_id == season_id,
        )
        .first()
    )
    if progress is None and create:
        progress = QuestProgress(user_id=user.id, quest_id=quest.id, season_id=season_id)
        db.add(progress)
        db.commit()
    return progress


def quest_by_slug(db: Session, slug: str) -> Quest:
    quest = db.query(Quest).filter(Quest.slug == slug).first()
    if quest is None:
        raise HTTPException(404, "No such quest.")
    return quest


def accept(db: Session, user: User, quest: Quest, now: datetime | None = None) -> QuestProgress:
    now = now or utcnow()
    season = ensure_season(db, now)
    progress = progress_for(db, user, quest, season.id)
    if progress is not None:
        return progress
    return progress_for(db, user, quest, season.id, create=True)  # type: ignore[return-value]


def complete(db: Session, user: User, quest: Quest, now: datetime | None = None) -> QuestProgress:
    """Mark complete only if the evidence already exists. Otherwise say how much is missing."""
    now = now or utcnow()
    season = ensure_season(db, now)
    progress = progress_for(db, user, quest, season.id, create=True)
    assert progress is not None
    if progress.state in ("completed", "claimed"):
        return progress
    have = evidence_count(db, user, quest, progress)
    if have < quest.min_evidence:
        raise HTTPException(
            409,
            f"This quest needs {quest.min_evidence} pieces of evidence and has {have}. "
            "Record the practice first; the claim follows the work, not the other way round.",
        )
    progress.state = "completed"
    progress.completed_at = now
    db.commit()
    return progress


def claim(
    db: Session,
    user: User,
    quest: Quest,
    idempotency_key: str,
    now: datetime | None = None,
) -> tuple[XpEntry, bool]:
    """Award XP once. Returns `(entry, created)`; a replay returns the original row."""
    now = now or utcnow()
    if not idempotency_key or len(idempotency_key) < 8:
        raise HTTPException(422, "An Idempotency-Key of at least 8 characters is required.")

    existing = (
        db.query(XpEntry)
        .filter(XpEntry.user_id == user.id, XpEntry.idempotency_key == idempotency_key)
        .first()
    )
    if existing is not None:
        return existing, False

    season = ensure_season(db, now)
    progress = progress_for(db, user, quest, season.id, create=True)
    assert progress is not None

    if progress.state == "claimed":
        raise HTTPException(409, "This quest has already been claimed this season.")
    if progress.state != "completed":
        raise HTTPException(
            409,
            f"This quest is {progress.state}; complete its evidence before claiming.",
        )
    # Defence in depth: `complete` checked the evidence, and this checks it again at
    # the moment of payment. A state column can be edited by hand or by a future bug;
    # the attempts table cannot say that practice happened when it did not.
    have = evidence_count(db, user, quest, progress)
    if have < quest.min_evidence:
        raise HTTPException(
            409,
            f"This quest has {have} of the {quest.min_evidence} pieces of evidence it "
            "needs. The claim follows the work.",
        )

    state = guardrails(db, user, now)
    if state["paused"]:
        raise HTTPException(429, state["message"])

    difficulty = 1.0 + (quest.difficulty - 1) * 0.15
    challenge = challenge_factor(db, user, quest)
    strategic = strategic_factor(db, user, quest)
    evidence = evidence_factor(db, user, quest, progress)
    base_award = award(quest.base_xp, difficulty, challenge, strategic, evidence)

    diminishing, repeats = diminishing_factor(db, user, quest.concept_ids, now)
    after_diminishing = int(math.floor(base_award * diminishing + 0.5))

    remaining = max(0, config.XP_DAILY_CAP - state["xp_today"])
    xp = min(after_diminishing, remaining)

    reasons = [
        f"base {quest.base_xp} × difficulty {difficulty:.3f} × challenge {challenge:.3f} "
        f"× strategic {strategic:.3f} × evidence {evidence:.3f} = {base_award}",
    ]
    if diminishing < 1.0:
        reasons.append(f"diminishing return ×{diminishing:.1f} ({repeats} earlier award(s) today)")
    if xp < after_diminishing:
        reasons.append(f"daily cap reached; {after_diminishing - xp} XP not awarded")

    entry = XpEntry(
        user_id=user.id,
        season_id=season.id,
        quest_id=quest.id,
        idempotency_key=idempotency_key,
        kind="quest",
        base_xp=quest.base_xp,
        difficulty_factor=difficulty,
        challenge_factor=challenge,
        strategic_factor=strategic,
        evidence_factor=evidence,
        xp=xp,
        reason="; ".join(reasons),
        concept_id=quest.concept_ids[0] if quest.concept_ids else None,
    )
    db.add(entry)
    progress.state = "claimed"
    progress.claimed_at = now
    try:
        db.commit()
    except IntegrityError:
        # Two requests got here with different keys. The schema refuses the second
        # row; translate that into the answer the learner would have got a moment
        # later anyway, instead of a 500 that looks like a bug in the awarding.
        db.rollback()
        duplicate = (
            db.query(XpEntry)
            .filter(XpEntry.user_id == user.id, XpEntry.idempotency_key == idempotency_key)
            .first()
        )
        if duplicate is not None:
            return duplicate, False
        raise HTTPException(409, "This quest has already been claimed this season.") from None
    return entry, True


# ------------------------------------------------------------------------ payloads


def entry_payload(entry: XpEntry) -> dict:
    return {
        "id": entry.id,
        "season_id": entry.season_id,
        "quest_id": entry.quest_id,
        "xp": entry.xp,
        "kind": entry.kind,
        "base_xp": entry.base_xp,
        "factors": {
            "difficulty": entry.difficulty_factor,
            "challenge": entry.challenge_factor,
            "strategic": entry.strategic_factor,
            "evidence": entry.evidence_factor,
        },
        "reason": entry.reason,
        "created_at": aware(entry.created_at).isoformat() if entry.created_at else None,
    }


def quest_payload(
    db: Session, user: User, quest: Quest, season: Season, now: datetime | None = None
) -> dict:
    now = now or utcnow()
    progress = progress_for(db, user, quest, season.id)
    state = progress.state if progress else "available"
    have = evidence_count(db, user, quest, progress) if progress else 0
    return {
        "slug": quest.slug,
        "title": quest.title,
        "summary": quest.summary,
        "kind": quest.kind,
        "difficulty": quest.difficulty,
        "base_xp": quest.base_xp,
        "state": state,
        "evidence": {"have": have, "need": quest.min_evidence},
        "concept_ids": list(quest.concept_ids or []),
        "season_id": season.id,
        "completed_at": aware(progress.completed_at).isoformat() if progress and progress.completed_at else None,
        "claimed_at": aware(progress.claimed_at).isoformat() if progress and progress.claimed_at else None,
    }


# ------------------------------------------------------------------------ catalogue

#: The quest catalogue. Original to this project; every concept id exists in the
#: seeded curriculum, which is what lets `evidence_count` count real attempts.
QUEST_CATALOGUE = (
    {
        "slug": "first-recall",
        "title": "Say it back: variables and functions",
        "summary": "Answer two retrieval prompts from memory before looking at your notes.",
        "kind": "retrieval",
        "concept_ids": ["py.variables", "py.functions"],
        "difficulty": 1,
        "base_xp": 20,
        "min_evidence": 1,
    },
    {
        "slug": "exception-drill",
        "title": "Exception drill",
        "summary": "Three retrieval prompts on exceptions, without re-reading first.",
        "kind": "retrieval",
        "concept_ids": ["py.exceptions"],
        "difficulty": 2,
        "base_xp": 35,
        "min_evidence": 3,
    },
    {
        "slug": "files-by-hand",
        "title": "Files by hand",
        "summary": "Three attempts on file handling: read, write, and what happens on failure.",
        "kind": "practice",
        "concept_ids": ["py.files"],
        "difficulty": 2,
        "base_xp": 35,
        "min_evidence": 3,
    },
    {
        "slug": "hash-basics",
        "title": "Hashing basics",
        "summary": "Three recall attempts on what a hash guarantees and what it does not.",
        "kind": "retrieval",
        "concept_ids": ["sec.hashing"],
        "difficulty": 2,
        "base_xp": 30,
        "min_evidence": 3,
    },
    {
        "slug": "threat-model-sketch",
        "title": "Sketch a threat model",
        "summary": "Four attempts across threat modelling and input validation.",
        "kind": "application",
        "concept_ids": ["sec.threat-model", "sec.input-validation"],
        "difficulty": 3,
        "base_xp": 50,
        "min_evidence": 4,
    },
    {
        "slug": "chess-vision",
        "title": "Chess vision",
        "summary": "Five attempts on tactics and endgames.",
        "kind": "practice",
        "concept_ids": ["chess.tactics", "chess.endgames"],
        "difficulty": 3,
        "base_xp": 45,
        "min_evidence": 5,
    },
    {
        "slug": "sit-and-reflect",
        "title": "Finish one sitting",
        "summary": "Complete a learning session with an objective and a stopping condition.",
        "kind": "reflection",
        "concept_ids": [],
        "difficulty": 1,
        "base_xp": 25,
        "min_evidence": 1,
    },
)


def ensure_quests(db: Session) -> int:
    """Insert the catalogue if it is missing. Idempotent; never overwrites a row.

    Existing quests are left exactly as they are so an operator can retune a value
    without a code change and without the seeder undoing it on the next restart.
    """
    added = 0
    for spec in QUEST_CATALOGUE:
        if db.query(Quest).filter(Quest.slug == spec["slug"]).first() is not None:
            continue
        db.add(Quest(**spec))
        added += 1
    if added:
        db.commit()
    return added
