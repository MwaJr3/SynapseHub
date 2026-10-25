"""HTTP API. Thin routes: the learning science lives in the engine modules."""

from __future__ import annotations

import logging
import re

import chess
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from . import chess_modality, config, learner, mastery as mastery_mod, openings as openings_mod, recommend
from .content import LicenseClass, Source, decide
from .database import get_db
from .models import (
    ChessAttempt,
    ChessPuzzle,
    Concept,
    ConceptEdge,
    ConceptState,
    Goal,
    Lesson,
    OpeningRow,
    Question,
    SourceRow,
    User,
)
from .security import (
    create_session,
    destroy_session,
    hash_password,
    require_user,
    verify_password,
)

router = APIRouter(prefix="/api")
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


# --------------------------------------------------------------------------- auth


class Credentials(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=200)
    display_name: str = Field(default="", max_length=120)


class Message(BaseModel):
    message: str


def _current(request: Request, db: Session) -> User:
    return require_user(db, request.cookies.get(config.SESSION_COOKIE))


def _set_session(response: Response, token: str) -> None:
    response.set_cookie(
        config.SESSION_COOKIE,
        token,
        httponly=True,
        samesite="lax",
        max_age=config.SESSION_MAX_AGE_SECONDS,
        secure=False,
    )


logger = logging.getLogger("tessera.api")


@router.post("/auth/register")
def register(body: Credentials, response: Response, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(422, "a valid email address is required")
    if len(body.password) < config.PASSWORD_MIN_LENGTH:
        raise HTTPException(422, f"password must be at least {config.PASSWORD_MIN_LENGTH} characters")
    if db.query(User).filter(User.email == email).first() is not None:
        # Deliberately vague: registration must not reveal which accounts exist.
        raise HTTPException(422, "registration could not be completed")
    user = User(
        email=email,
        display_name=body.display_name.strip()[:120],
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    _set_session(response, create_session(db, user))
    return {"email": user.email, "display_name": user.display_name}


@router.post("/auth/login")
def login(body: Credentials, response: Response, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "email or password is incorrect")
    _set_session(response, create_session(db, user))
    return {"email": user.email, "display_name": user.display_name}


@router.post("/auth/logout", response_model=Message)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(config.SESSION_COOKIE)
    if token:
        destroy_session(db, token)
    response.delete_cookie(config.SESSION_COOKIE)
    return {"message": "signed out"}


@router.get("/auth/me")
def me(request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    return {"email": user.email, "display_name": user.display_name}


# ------------------------------------------------------------------ knowledge bank


def _state_for(db: Session, user: User, concept_id: str) -> ConceptState | None:
    return (
        db.query(ConceptState)
        .filter(ConceptState.user_id == user.id, ConceptState.concept_id == concept_id)
        .first()
    )


@router.get("/knowledge")
def knowledge(request: Request, db: Session = Depends(get_db)):
    """Mastery per concept, decayed by what the learner can still recall."""
    user = _current(request, db)
    now = learner.utcnow()
    rows = []
    for concept in db.query(Concept).order_by(Concept.ordering).all():
        state = _state_for(db, user, concept.id)
        if state is None:
            rows.append(
                {
                    "concept_id": concept.id,
                    "title": concept.title,
                    "subject": concept.subject,
                    "mastery": 0.0,
                    "retained": 0.0,
                    "tier": "unseen",
                    "stability_days": None,
                    "next_review_at": None,
                    "reps": 0,
                    "lapses": 0,
                }
            )
            continue
        elapsed = learner.elapsed_days(state.last_reviewed_at, now)
        retained = mastery_mod.decayed_mastery(state.mastery, state.stability_days, elapsed)
        next_review = learner.as_aware(state.next_review_at)
        rows.append(
            {
                "concept_id": concept.id,
                "title": concept.title,
                "subject": concept.subject,
                "mastery": state.mastery,
                "retained": retained,
                "tier": mastery_mod.tier(state.mastery, concept.mastery_threshold),
                "stability_days": round(state.stability_days, 2),
                "next_review_at": next_review.isoformat() if next_review else None,
                "due": bool(next_review and next_review <= now),
                "reps": state.reps,
                "lapses": state.lapses,
            }
        )
    subjects: dict[str, list[dict]] = {}
    for row in rows:
        subjects.setdefault(row["subject"], []).append(row)
    return {
        "concepts": rows,
        "subjects": [
            {
                "subject": subject,
                "average_mastery": round(
                    sum(item["mastery"] for item in items) / max(1, len(items)), 4
                ),
                "concepts": items,
            }
            for subject, items in subjects.items()
        ],
    }


@router.get("/map")
def knowledge_map(request: Request, db: Session = Depends(get_db)):
    """The graph: nodes with mastery, edges with their relation type."""
    user = _current(request, db)
    nodes = []
    for concept in db.query(Concept).order_by(Concept.ordering).all():
        state = _state_for(db, user, concept.id)
        nodes.append(
            {
                "id": concept.id,
                "title": concept.title,
                "subject": concept.subject,
                "difficulty": concept.difficulty,
                "mastery": state.mastery if state else 0.0,
                "tier": mastery_mod.tier(state.mastery if state else 0.0, concept.mastery_threshold),
            }
        )
    edges = [
        {"from": edge.from_concept_id, "to": edge.to_concept_id, "relation": edge.relation}
        for edge in db.query(ConceptEdge).all()
    ]
    return {"nodes": nodes, "edges": edges}


# --------------------------------------------------------------- recommendations


@router.get("/recommendations")
def recommendations(request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    signals = learner.all_signals(db, user)
    ranked = recommend.rank(signals)
    return {
        "next": [vars(item) for item in recommend.next_lessons(signals, limit=3)],
        "review_queue": [vars(item) for item in recommend.review_queue(signals)],
        "weaknesses": [vars(item) for item in recommend.weakness_profile(signals)],
        "all_ranked": [vars(item) for item in ranked],
        "weights": vars(recommend.DEFAULT_WEIGHTS),
    }


@router.get("/today")
def today(request: Request, db: Session = Depends(get_db), available_minutes: int = 15):
    """A daily session: one new concept, reviews, a weak area, and a challenge.

    The composition adapts to the time the learner says they have; it never
    invents activity to fill the slot.
    """
    user = _current(request, db)
    minutes = max(5, min(60, available_minutes))
    signals = learner.all_signals(db, user)
    ranked = recommend.rank(signals)
    reviews = recommend.review_queue(signals)
    weak = recommend.weakness_profile(signals)

    # A `Recommendation` deliberately carries no mastery, so the unseen concept is
    # identified from the signals instead of guessed from the score.
    unseen_ids = {s.concept_id for s in signals if s.last_reviewed_at is None}
    new_concept = next((item for item in ranked if item.concept_id in unseen_ids), None)

    items: list[dict] = []
    if new_concept:
        items.append(
            {
                "kind": "new_concept",
                "concept_id": new_concept.concept_id,
                "title": new_concept.title,
                "minutes": 5,
                "reasons": new_concept.reasons,
            }
        )
    for review in reviews[: max(1, minutes // 5)]:
        items.append(
            {
                "kind": "review",
                "concept_id": review.concept_id,
                "title": review.title,
                "minutes": 2,
                "reasons": review.reasons,
            }
        )
    if weak and (not reviews or weak[0].concept_id != reviews[0].concept_id):
        items.append(
            {
                "kind": "weak_area",
                "concept_id": weak[0].concept_id,
                "title": weak[0].title,
                "minutes": 3,
                "reasons": weak[0].reasons,
            }
        )

    return {
        "available_minutes": minutes,
        "items": items,
        "empty_state": (
            "Nothing is due and nothing is overdue. Pick a concept from the knowledge map to start something new."
            if not items
            else None
        ),
    }


# ---------------------------------------------------------------------- concepts


@router.get("/concepts/{concept_id}")
def concept_detail(concept_id: str, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    concept = db.get(Concept, concept_id)
    if concept is None:
        raise HTTPException(404, "concept not found")
    lesson = db.query(Lesson).filter(Lesson.concept_id == concept_id).first()
    state = _state_for(db, user, concept_id)
    prerequisites = [
        {"concept_id": edge.from_concept_id, "relation": edge.relation}
        for edge in db.query(ConceptEdge).filter(ConceptEdge.to_concept_id == concept_id).all()
    ]
    source = db.get(SourceRow, lesson.source_id) if lesson and lesson.source_id else None
    return {
        "concept": {
            "id": concept.id,
            "title": concept.title,
            "subject": concept.subject,
            "summary": concept.summary,
            "explanation": concept.explanation,
            "difficulty": concept.difficulty,
        },
        "lesson": None
        if lesson is None
        else {
            "id": lesson.id,
            "title": lesson.title,
            "hook": lesson.hook,
            "explanation": lesson.explanation,
            "example": lesson.example,
            "application": lesson.application,
            "recap": lesson.recap,
            "est_minutes": lesson.est_minutes,
        },
        "provenance": None
        if source is None
        else {
            "title": source.title,
            "author": source.author,
            "url": source.url,
            "license_class": source.license_class,
            "license_name": source.license_name,
            "attribution": source.attribution,
            "retrieved_at": source.retrieved_at,
        },
        "state": None
        if state is None
        else {
            "mastery": state.mastery,
            "tier": mastery_mod.tier(state.mastery, concept.mastery_threshold),
            "stability_days": round(state.stability_days, 2),
            "reps": state.reps,
            "lapses": state.lapses,
        },
        "prerequisites": prerequisites,
        "questions": _questions_for(db, concept_id, include_answers=False),
    }


def _questions_for(db: Session, concept_id: str, *, include_answers: bool) -> list[dict]:
    rows = db.query(Question).filter(Question.concept_id == concept_id).all()
    payload = []
    for question in rows:
        item = {
            "id": question.id,
            "prompt": question.prompt,
            "choices": question.choices,
            "difficulty": question.difficulty,
        }
        if include_answers:
            item["correct_index"] = question.correct_index
            item["explanation"] = question.explanation
            item["misconception"] = question.misconception
        payload.append(item)
    return payload


@router.get("/concepts/{concept_id}/questions")
def questions(concept_id: str, request: Request, db: Session = Depends(get_db)):
    """Questions without answers — grading happens server-side."""
    _current(request, db)
    if db.get(Concept, concept_id) is None:
        raise HTTPException(404, "concept not found")
    return {"questions": _questions_for(db, concept_id, include_answers=False)}


# --------------------------------------------------------------------- answering


class Answer(BaseModel):
    question_id: str = Field(max_length=64)
    choice_index: int = Field(ge=0, le=10)
    latency_ms: int = Field(default=0, ge=0, le=3_600_000)
    confidence: int = Field(default=3, ge=1, le=5)


@router.post("/answers")
def answer(body: Answer, request: Request, db: Session = Depends(get_db)):
    """Grade one answer, update the learner model, and explain the result."""
    user = _current(request, db)
    question = db.get(Question, body.question_id)
    if question is None:
        raise HTTPException(404, "question not found")
    concept = db.get(Concept, question.concept_id)
    if concept is None:
        raise HTTPException(404, "concept not found")

    correct = body.choice_index == question.correct_index
    result = learner.record_attempt(
        db,
        user=user,
        concept=concept,
        correct=correct,
        latency_ms=body.latency_ms,
        confidence=body.confidence,
        question_id=question.id,
    )
    return {
        **result,
        "correct_index": question.correct_index,
        "explanation": question.explanation,
        "misconception": question.misconception if not correct else None,
    }


# ------------------------------------------------------------------- provenance


@router.get("/sources")
def sources(request: Request, db: Session = Depends(get_db)):
    """Every source with the usage decision the licence gate produces."""
    _current(request, db)
    payload = []
    for row in db.query(SourceRow).all():
        try:
            source = Source(
                source_id=row.id,
                title=row.title,
                author=row.author,
                url=row.url,
                license_class=LicenseClass(row.license_class),
                license_name=row.license_name,
                commercial_use_ok=row.commercial_use_ok,
                attribution=row.attribution,
                retrieved_at=__import__("datetime").date.fromisoformat(row.retrieved_at or "1970-01-01"),
                holds_copy=row.holds_copy,
            )
            decision = decide(source, commercial_deployment=config.COMMERCIAL_DEPLOYMENT)
            usage, reason = decision.usage.value, decision.reason
        except (ValueError, PermissionError) as exc:
            usage, reason = "refused", f"record could not be evaluated: {exc}"
        payload.append(
            {
                "source_id": row.id,
                "title": row.title,
                "author": row.author,
                "url": row.url,
                "license_class": row.license_class,
                "license_name": row.license_name,
                "attribution": row.attribution,
                "retrieved_at": row.retrieved_at,
                "usage": usage,
                "reason": reason,
                "commercial_deployment": config.COMMERCIAL_DEPLOYMENT,
            }
        )
    return {"sources": payload}


# ------------------------------------------------------------------------ chess


@router.get("/chess/puzzles")
def puzzles(request: Request, db: Session = Depends(get_db)):
    _current(request, db)
    return {
        "puzzles": [
            {
                "id": puzzle.id,
                "title": puzzle.title,
                "theme": puzzle.theme,
                "difficulty": puzzle.difficulty,
                "side_to_move": chess_modality.side_to_move(puzzle.fen),
            }
            for puzzle in db.query(ChessPuzzle).all()
        ]
    }


@router.get("/chess/puzzles/{puzzle_id}")
def puzzle(puzzle_id: str, request: Request, db: Session = Depends(get_db)):
    """The position and its legal moves. The solution is never sent to the client."""
    _current(request, db)
    row = db.get(ChessPuzzle, puzzle_id)
    if row is None:
        raise HTTPException(404, "puzzle not found")
    return {
        "id": row.id,
        "title": row.title,
        "theme": row.theme,
        "difficulty": row.difficulty,
        "board": chess_modality.public_puzzle(row.fen),
    }


class ChessMove(BaseModel):
    uci: str = Field(min_length=2, max_length=6)
    plies_played: int = Field(default=0, ge=0, le=40)


@router.post("/chess/puzzles/{puzzle_id}/move")
def play_move(puzzle_id: str, body: ChessMove, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    row = db.get(ChessPuzzle, puzzle_id)
    if row is None:
        raise HTTPException(404, "puzzle not found")

    current_fen = row.fen
    if body.plies_played > 0:
        # Rebuild the position by replaying the solved prefix, so the client
        # cannot simply claim a different board.
        board = chess.Board(row.fen)
        for uci in row.solution_uci[: body.plies_played]:
            board.push_uci(uci)
        if body.plies_played >= len(row.solution_uci):
            raise HTTPException(409, "this puzzle is already solved")
        current_fen = board.fen()

    progress = chess_modality.apply_move(
        current_fen, body.uci, row.solution_uci, body.plies_played
    )

    if progress.solved:
        db.add(
            ChessAttempt(
                user_id=user.id,
                puzzle_id=row.id,
                solved=True,
                moves_uci=row.solution_uci,
            )
        )
        db.commit()
        concept = db.get(Concept, row.concept_id) if row.concept_id else None
        if concept is not None:
            learner.record_attempt(
                db, user=user, concept=concept, correct=True, confidence=4
            )

    return {
        "legal": progress.legal,
        "on_solution": progress.on_solution,
        "solved": progress.solved,
        "fen": progress.fen,
        "plies_played": progress.plies_played,
        "san_history": progress.san_history,
        "opponent_reply": progress.opponent_reply,
        "error": progress.error,
    }


# ------------------------------------------------------------------ chess openings


def _opening_records(db: Session) -> list[openings_mod.Opening]:
    return [
        openings_mod.Opening(
            id=row.id,
            eco=row.eco,
            name=row.name,
            family=row.family,
            moves_san=row.moves_san,
            moves_uci=row.moves_uci,
            idea=row.idea,
        )
        for row in db.query(OpeningRow).order_by(OpeningRow.eco).all()
    ]


@router.get("/chess/openings")
def openings(request: Request, db: Session = Depends(get_db), family: str | None = None):
    """The opening reference, grouped by family."""
    _current(request, db)
    rows = db.query(OpeningRow).order_by(OpeningRow.eco).all()
    if family:
        rows = [row for row in rows if row.family.lower() == family.lower()]
    families: dict[str, int] = {}
    for row in rows:
        families[row.family] = families.get(row.family, 0) + 1
    return {
        "openings": [
            {
                "id": row.id,
                "eco": row.eco,
                "name": row.name,
                "family": row.family,
                "moves_san": row.moves_san,
                # The coordinate line lets the interface hand a catalogue entry
                # straight back to the matcher instead of the learner retyping it.
                "moves_uci": row.moves_uci,
                "idea": row.idea,
                "plies": len(row.moves_uci.split()),
            }
            for row in rows
        ],
        "families": families,
    }


@router.get("/chess/openings/match")
def opening_match(
    request: Request,
    db: Session = Depends(get_db),
    moves: str = "",
    fen: str = "",
):
    """Identify an opening from a move line or a position.

    Position matching is what makes transpositions work: two different move
    orders that reach the same board resolve to the same opening.
    """
    _current(request, db)
    entries = _opening_records(db)
    line = [token for token in moves.split() if token]

    if line:
        matches = openings_mod.lookup_by_moves(line, entries)
        return {
            "matched": len(matches) > 0,
            "matches": [{"eco": m.eco, "name": m.name, "family": m.family, "moves_san": m.moves_san} for m in matches],
            "message": None
            if matches
            else "That move order is not in the reference yet — you may have left the lines this trainer covers.",
        }

    if fen:
        try:
            match = openings_mod.lookup_by_position(fen, entries)
        except ValueError:
            raise HTTPException(422, "that is not a valid FEN")
        return {
            "matched": match is not None,
            "matches": []
            if match is None
            else [{"eco": match.eco, "name": match.name, "family": match.family, "moves_san": match.moves_san}],
            "message": None if match else "No catalogued opening reaches this position.",
        }

    raise HTTPException(422, "provide either moves (UCI, space separated) or fen")


# ----------------------------------------------------------------------- AI tutor


class TutorSearchBody(BaseModel):
    question: str = Field(min_length=3, max_length=500)
    limit: int = Field(default=4, ge=1, le=10)


@router.get("/tutor/status")
def tutor_status(request: Request, db: Session = Depends(get_db)):
    """Whether the AI tutor can run, and what is missing. Never fakes a key."""
    _current(request, db)
    from .ai.agent import tutor_config

    state = tutor_config()
    return {
        "configured": state.configured,
        "model": state.model,
        "provider": state.provider,
        # The endpoint is public information; the credential never is.
        "base_url": state.base_url,
        "key_source": state.key_source,
        "missing": list(state.missing),
        "reason": state.reason,
        "retrieval_available": True,
        "note": (
            "Retrieval returns sourced passages from the curriculum with no model involved. "
            "It is not a conversation and is labelled as such in the interface."
        ),
    }


@router.post("/tutor/search")
def tutor_search(body: TutorSearchBody, request: Request, db: Session = Depends(get_db)):
    """Retrieval-only grounding. Works with no API key; does not generate text."""
    _current(request, db)
    from .ai.retrieval import search

    passages = search(db, body.question, limit=body.limit)
    return {
        "mode": "retrieval",
        "generated": False,
        "passages": [
            {
                "concept_id": p.concept_id,
                "concept_title": p.concept_title,
                "subject": p.subject,
                "text": p.text,
                "citation": p.as_citation(),
                "source_url": p.source_url,
                "license_name": p.license_name,
            }
            for p in passages
        ],
        "message": None
        if passages
        else "Nothing in the curriculum matched that question. The tutor will not answer from outside it.",
    }


class TutorChatBody(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    thread_id: str | None = None


@router.post("/tutor/chat")
async def tutor_chat(body: TutorChatBody, request: Request, db: Session = Depends(get_db)):
    """One turn of the conversation, streamed as Server-Sent Events.

    Returns 503 with an explicit reason when no model is configured, rather than
    serving a chat surface that cannot answer.
    """
    from fastapi.responses import JSONResponse, StreamingResponse

    from .ai.agent import tutor_config
    from .ai.chat import stream_reply
    from .ai.store import ChatStore

    user = _current(request, db)
    state = tutor_config()
    if not state.configured:
        return JSONResponse(
            status_code=503,
            content={
                "error": "tutor_not_configured",
                "missing": list(state.missing),
                "reason": state.reason,
            },
        )

    store = ChatStore(db)
    thread_id = body.thread_id
    if thread_id is None:
        thread = store.create_thread(user.id, title=body.message[:80])
        thread_id = thread.id
    else:
        try:
            store.get_thread(user.id, thread_id)
        except LookupError:
            # Not "forbidden": confirming existence would leak whose thread it is.
            raise HTTPException(404, "no such conversation")

    return StreamingResponse(
        stream_reply(store, state, user.id, thread_id, body.message),
        media_type="text/event-stream",
        headers={"cache-control": "no-cache", "x-accel-buffering": "no"},
    )


@router.get("/tutor/threads")
def tutor_threads(request: Request, db: Session = Depends(get_db)):
    """This learner's conversations, newest first."""
    from .ai.store import ChatStore

    user = _current(request, db)
    store = ChatStore(db)
    return {"threads": [thread.as_dict() for thread in store.list_threads(user.id)]}


@router.get("/tutor/threads/{thread_id}")
def tutor_thread(thread_id: str, request: Request, db: Session = Depends(get_db)):
    """One conversation with its messages, including the citations used."""
    from .ai.store import ChatStore

    user = _current(request, db)
    store = ChatStore(db)
    try:
        thread = store.get_thread(user.id, thread_id)
    except LookupError:
        raise HTTPException(404, "no such conversation")
    return {
        "thread": thread.as_dict(),
        "messages": [message.as_dict() for message in store.load_messages(user.id, thread_id)],
    }


@router.delete("/tutor/threads/{thread_id}")
def tutor_thread_delete(thread_id: str, request: Request, db: Session = Depends(get_db)):
    from .ai.store import ChatStore

    user = _current(request, db)
    store = ChatStore(db)
    try:
        store.delete_thread(user.id, thread_id)
    except LookupError:
        raise HTTPException(404, "no such conversation")
    return {"deleted": thread_id}



# ------------------------------------------------------------------------ goals


class GoalBody(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    concept_ids: list[str] = Field(default_factory=list, max_length=50)


@router.get("/goals")
def list_goals(request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    return {
        "goals": [
            {"id": goal.id, "title": goal.title, "concept_ids": goal.concept_ids}
            for goal in db.query(Goal).filter(Goal.user_id == user.id).all()
        ]
    }


@router.post("/goals")
def create_goal(body: GoalBody, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    known = {concept.id for concept in db.query(Concept).all()}
    unknown = [concept_id for concept_id in body.concept_ids if concept_id not in known]
    if unknown:
        raise HTTPException(422, f"unknown concepts: {', '.join(unknown[:5])}")
    goal = Goal(user_id=user.id, title=body.title.strip(), concept_ids=body.concept_ids)
    db.add(goal)
    db.commit()
    return {"id": goal.id, "title": goal.title, "concept_ids": goal.concept_ids}
