"""HTTP API. Thin routes: the learning science lives in the engine modules."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone

import chess
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from . import (
    chess_modality,
    config,
    library,
    practice,
    review,
    learner,
    mastery as mastery_mod,
    openings as openings_mod,
    profile as profile_mod,
    profile_baseline,
    recommend,
)
from .content import LicenseClass, Source, decide
from .database import get_db
from .models import (
    Assessment,
    AssessmentScore,
    ChessAttempt,
    ChessPuzzle,
    Concept,
    ConceptEdge,
    ConceptState,
    Goal,
    Lesson,
    LearnerProfile,
    OpeningRow,
    Question,
    RetrievalAttempt,
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
    # Catalogue + this learner's own. Never another learner's concepts.
    for concept in library.visible_concepts(db, user).all():
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
    scope = library.visible_concepts(db, user).all()
    visible_ids = {concept.id for concept in scope}
    nodes = []
    for concept in scope:
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
    # An edge is visible only when both ends are, and when it is catalogue-wide or
    # the learner's own: one learner's private relation is not another's business.
    edges = [
        {
            "id": edge.id,
            "from": edge.from_concept_id,
            "to": edge.to_concept_id,
            "relation": edge.relation,
            "own": edge.owner_id is not None,
        }
        for edge in db.query(ConceptEdge).all()
        if library.edge_visible(edge, visible_ids, user)
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
    # 404 rather than 403 for another learner's concept: the id alone must not
    # confirm that a private record exists.
    concept = _library_call(lambda: library.get_concept(db, user, concept_id))
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
    user = _current(request, db)
    _library_call(lambda: library.get_concept(db, user, concept_id))
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
    concept = _library_call(lambda: library.get_concept(db, user, question.concept_id))

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
    user = _current(request, db)
    from .ai.retrieval import search

    # Retrieval is scoped: the catalogue plus this learner's own material. An
    # unscoped search would ground answers in somebody else's private notes.
    passages = search(db, body.question, limit=body.limit, owner_id=user.id)
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
    # A goal may only point at something this learner can actually open.
    known = {concept.id for concept in library.visible_concepts(db, user).all()}
    unknown = [concept_id for concept_id in body.concept_ids if concept_id not in known]
    if unknown:
        raise HTTPException(422, f"unknown concepts: {', '.join(unknown[:5])}")
    goal = Goal(user_id=user.id, title=body.title.strip(), concept_ids=body.concept_ids)
    db.add(goal)
    db.commit()
    return {"id": goal.id, "title": goal.title, "concept_ids": goal.concept_ids}


# -------------------------------------------------------------- learner profile
#
# Reading is open to the signed-in learner; every write is scoped by `user.id`.
# Validation lives in app.profile — these routes only translate to HTTP.


class ProfileContextBody(BaseModel):
    context: str = Field(default="", max_length=4000)


class ScoreBody(BaseModel):
    axis: str = Field(max_length=20)
    name: str = Field(min_length=1, max_length=60)
    value: float | None = None
    value_label: str = Field(default="", max_length=80)
    note: str = Field(default="", max_length=500)


class AssessmentBody(BaseModel):
    instrument: str = Field(min_length=1, max_length=40)
    label: str = Field(default="", max_length=120)
    reported_by: str = Field(default="learner", max_length=20)
    source_url: str = Field(default="", max_length=600)
    source_note: str = Field(default="", max_length=2000)
    administered_on: str = Field(default="", max_length=10)
    scale_min: float | None = None
    scale_max: float | None = None
    scores: list[ScoreBody] = Field(default_factory=list, max_length=40)


class ArchiveBody(BaseModel):
    reason: str = Field(default="", max_length=300)


def _assessment_detail(db: Session, row: Assessment) -> dict:
    scores = db.query(AssessmentScore).filter(AssessmentScore.assessment_id == row.id).all()
    return profile_mod.serialize_assessment(row, scores)


def _store(db: Session, user: User, body: dict) -> Assessment:
    try:
        return profile_mod.create_assessment(db, user_id=user.id, **body)
    except profile_mod.InvalidAssessment as error:
        raise HTTPException(422, str(error)) from error


def _owned_assessment(db: Session, user: User, assessment_id: str) -> Assessment:
    row = db.get(Assessment, assessment_id)
    # Another learner's assessment is a 404, never a read: the id alone must not
    # be enough to confirm that a record exists.
    if row is None or row.user_id != user.id:
        raise HTTPException(404, "assessment not found")
    return row


@router.get("/profile")
def get_profile(request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    return profile_mod.profile_payload(db, user)


@router.put("/profile")
def put_profile(body: ProfileContextBody, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    row = db.query(LearnerProfile).filter(LearnerProfile.user_id == user.id).first()
    if row is None:
        row = LearnerProfile(user_id=user.id, context=body.context.strip())
        db.add(row)
    else:
        row.context = body.context.strip()
        row.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {
        "context": row.context,
        "updated_at": row.updated_at.isoformat(),
    }


@router.get("/profile/instruments")
def get_instruments(request: Request, db: Session = Depends(get_db)):
    _current(request, db)
    return {"instruments": profile_mod.instrument_catalogue()}


@router.post("/profile/assessments", status_code=201)
def post_assessment(body: AssessmentBody, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    row = _store(db, user, body.model_dump())
    return _assessment_detail(db, row)


@router.post("/profile/assessments/{assessment_id}/archive")
def post_assessment_archive(
    assessment_id: str, body: ArchiveBody, request: Request, db: Session = Depends(get_db)
):
    user = _current(request, db)
    row = _owned_assessment(db, user, assessment_id)
    profile_mod.archive_assessment(db, row, body.reason)
    return _assessment_detail(db, row)


@router.post("/profile/baseline")
def post_baseline(request: Request, db: Session = Depends(get_db)):
    """Load the transcribed baseline into *this* account. Skips what is recorded.

    Idempotent on (instrument, administered_on) so a double-click cannot create
    duplicate history, and an explicit action so nothing appears without consent.

    Off unless `TESSERA_DEMO_BASELINE` is set: those scores belong to the person
    who supplied them, and no other learner should inherit them by pressing a
    button or by signing up. A 403 rather than an empty 200, so a caller cannot
    mistake "disabled" for "already loaded".
    """
    if not profile_mod.demo_baseline_enabled():
        raise HTTPException(
            403,
            "The supplied baseline is disabled on this deployment. Record your own results instead; "
            "TESSERA_DEMO_BASELINE=1 exposes the transcribed data for demonstration.",
        )
    user = _current(request, db)
    existing = {
        (row.instrument, row.administered_on)
        for row in db.query(Assessment).filter(Assessment.user_id == user.id).all()
    }
    created: list[dict] = []
    skipped: list[str] = []
    for entry in profile_baseline.BASELINE:
        key = (entry["instrument"], entry["administered_on"])
        if key in existing:
            skipped.append(entry["instrument"])
            continue
        row = _store(db, user, dict(entry))
        existing.add(key)
        created.append(_assessment_detail(db, row))
    return {"created": created, "skipped": skipped}


# ------------------------------------------------- concepts, relations, notes
#
# Stage 2: the learner's own material. Everything here is scoped by the session's
# user, and the one visibility rule lives in app.library. Routes translate library
# errors into HTTP and never contain business rules of their own.


class ConceptBody(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    subject: str = Field(min_length=1, max_length=80)
    summary: str = Field(default="", max_length=2000)
    explanation: str = Field(default="", max_length=8000)
    difficulty: float = Field(default=3.0, ge=1.0, le=5.0)


class ConceptPatch(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    subject: str | None = Field(default=None, max_length=80)
    summary: str | None = Field(default=None, max_length=2000)
    explanation: str | None = Field(default=None, max_length=8000)
    difficulty: float | None = Field(default=None, ge=1.0, le=5.0)


class ConfirmBody(BaseModel):
    confirm: bool = False


class RelateBody(BaseModel):
    to: str = Field(min_length=1, max_length=80)
    relation: str = Field(min_length=1, max_length=24)


class NoteBody(BaseModel):
    concept_id: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=20_000)
    source_ref: str = Field(default="", max_length=300)


class NotePatch(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    body: str | None = Field(default=None, max_length=20_000)
    source_ref: str | None = Field(default=None, max_length=300)
    concept_id: str | None = Field(default=None, max_length=80)


class SessionBody(BaseModel):
    concept_id: str = Field(min_length=1, max_length=80)
    objective: str = Field(min_length=3, max_length=500)
    stopping_condition: str = Field(min_length=3, max_length=500)
    planned_minutes: int = Field(default=25, ge=5, le=240)


class SessionPatch(BaseModel):
    objective: str | None = Field(default=None, max_length=500)
    stopping_condition: str | None = Field(default=None, max_length=500)
    reflection: str | None = Field(default=None, max_length=4000)
    activities: list[dict] | None = Field(default=None, max_length=20)


class SessionFinish(BaseModel):
    outcome: str = Field(min_length=1, max_length=16)
    reflection: str = Field(default="", max_length=4000)
    evidence: str = Field(default="", max_length=4000)
    minutes_spent: int | None = Field(default=None, ge=0, le=600)


def _library_call(action):
    """Run a library operation, translating its errors into HTTP status codes."""
    try:
        return action()
    except library.NotFound as error:
        raise HTTPException(404, str(error)) from error
    except library.LibraryError as error:
        raise HTTPException(error.status, str(error)) from error


def _concept_brief(concept: Concept) -> dict:
    return {
        "id": concept.id,
        "title": concept.title,
        "subject": concept.subject,
        "summary": concept.summary,
        "explanation": concept.explanation,
        "difficulty": concept.difficulty,
        "own": concept.owner_id is not None,
    }


@router.get("/library")
def library_overview(request: Request, db: Session = Depends(get_db)):
    """The learner's own material at a glance, plus the vocabulary the UI needs."""
    user = _current(request, db)
    return {
        "concepts": [
            _concept_brief(concept)
            for concept in library.visible_concepts(db, user).all()
            if concept.owner_id is not None
        ],
        "relations": [
            {"id": name, **meta} for name, meta in library.RELATIONS.items()
        ],
        "activities": [
            {"id": name, "label": label} for name, label in library.ACTIVITIES.items()
        ],
        "stats": library.stats(db, user),
    }


@router.post("/concepts", status_code=201)
def create_concept(body: ConceptBody, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    concept = _library_call(
        lambda: library.create_concept(
            db,
            user,
            title=body.title,
            subject=body.subject,
            summary=body.summary,
            explanation=body.explanation,
            difficulty=body.difficulty,
        )
    )
    return _concept_brief(concept)


@router.patch("/concepts/{concept_id}")
def patch_concept(concept_id: str, body: ConceptPatch, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    concept = _library_call(
        lambda: library.update_concept(db, user, concept_id, body.model_dump(exclude_unset=True))
    )
    return _concept_brief(concept)


@router.delete("/concepts/{concept_id}")
def delete_concept(concept_id: str, request: Request, db: Session = Depends(get_db), confirm: bool = False):
    """Remove an own concept. Without `confirm=true` this answers 409 and says what
    would go with it, so nothing is destroyed by a stray request."""
    user = _current(request, db)
    removed = _library_call(lambda: library.delete_concept(db, user, concept_id, confirmed=confirm))
    return {"deleted": concept_id, "removed": removed}


@router.get("/concepts/{concept_id}/relations")
def get_relations(concept_id: str, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    # Visibility first: relations on somebody else's concept are not a read.
    _library_call(lambda: library.get_concept(db, user, concept_id))
    return {"relations": library.relations_for(db, user, concept_id)}


@router.post("/concepts/{concept_id}/relate", status_code=201)
def post_relate(concept_id: str, body: RelateBody, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    edge, created = _library_call(
        lambda: library.relate(db, user, from_id=concept_id, to_id=body.to, relation=body.relation)
    )
    return {
        "id": edge.id,
        "from": edge.from_concept_id,
        "to": edge.to_concept_id,
        "relation": edge.relation,
        # False when the relation already existed: a double-submitted form must not
        # draw the same arrow twice.
        "created": created,
    }


@router.delete("/relations/{edge_id}")
def delete_relation(edge_id: str, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    _library_call(lambda: library.unrelate(db, user, edge_id))
    return {"deleted": edge_id}


@router.get("/notes")
def list_notes(
    request: Request,
    db: Session = Depends(get_db),
    q: str = "",
    concept: str | None = None,
    limit: int = 50,
):
    user = _current(request, db)
    notes = _library_call(
        lambda: library.list_notes(
            db, user, query=q, concept_id=concept, limit=max(1, min(200, limit))
        )
    )
    return {
        "notes": notes,
        "query": q,
        "terms": library.search_terms(q),
        "explanation": (
            "Notes are ranked by how many of your search terms they contain, with a title match "
            "worth three. No hidden relevance: the matched terms are returned with each note."
            if q
            else "All notes, most recently edited first."
        ),
    }


@router.post("/notes", status_code=201)
def post_note(body: NoteBody, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    note = _library_call(
        lambda: library.create_note(
            db,
            user,
            concept_id=body.concept_id,
            title=body.title,
            body=body.body,
            source_ref=body.source_ref,
        )
    )
    concept = db.get(Concept, note.concept_id)
    return library.note_payload(note, concept.title if concept else "")


@router.patch("/notes/{note_id}")
def patch_note(note_id: str, body: NotePatch, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    note = _library_call(
        lambda: library.update_note(db, user, note_id, body.model_dump(exclude_unset=True))
    )
    concept = db.get(Concept, note.concept_id)
    return library.note_payload(note, concept.title if concept else "")


@router.delete("/notes/{note_id}")
def remove_note(note_id: str, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    _library_call(lambda: library.delete_note(db, user, note_id))
    return {"deleted": note_id}


@router.get("/sessions")
def get_sessions(
    request: Request,
    db: Session = Depends(get_db),
    status: str | None = None,
    concept: str | None = None,
    limit: int = 50,
):
    user = _current(request, db)
    sessions = _library_call(
        lambda: library.list_sessions(
            db, user, status=status, concept_id=concept, limit=max(1, min(200, limit))
        )
    )
    return {"sessions": sessions, "stats": library.stats(db, user)}


@router.post("/sessions", status_code=201)
def post_session(body: SessionBody, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    session = _library_call(
        lambda: library.start_session(
            db,
            user,
            concept_id=body.concept_id,
            objective=body.objective,
            stopping_condition=body.stopping_condition,
            planned_minutes=body.planned_minutes,
        )
    )
    return library.session_payload(session)


@router.get("/sessions/{session_id}")
def get_session(session_id: str, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    session = _library_call(lambda: library.get_session(db, user, session_id))
    title = db.get(Concept, session.concept_id)
    return {
        **library.session_payload(session, title.title if title else ""),
        "evidence_summary": practice.session_evidence(db, user, session.id),
    }


@router.patch("/sessions/{session_id}")
def patch_session(session_id: str, body: SessionPatch, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    session = _library_call(
        lambda: library.update_session(db, user, session_id, body.model_dump(exclude_unset=True))
    )
    title = db.get(Concept, session.concept_id)
    return library.session_payload(session, title.title if title else "")


@router.post("/sessions/{session_id}/finish")
def finish_session(session_id: str, body: SessionFinish, request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    session = _library_call(
        lambda: library.finish_session(
            db,
            user,
            session_id,
            outcome=body.outcome,
            reflection=body.reflection,
            evidence=body.evidence,
            minutes_spent=body.minutes_spent,
        )
    )
    title = db.get(Concept, session.concept_id)
    # What the sitting actually produced. The sitting is the container; the
    # retrieval attempts inside it are the evidence, and keeping those two things
    # apart is the whole reason stage 2 refused to award anything for a session.
    return {
        **library.session_payload(session, title.title if title else ""),
        "evidence_summary": practice.session_evidence(db, user, session.id),
    }


# ------------------------------------------------------------------- retrieval
#
# Stage 3. A prompt is rebuilt from (concept, format, seed) rather than stored, so
# the answer key never leaves the server and a half-finished tab still grades.


class PracticeBody(BaseModel):
    prompt_id: str = Field(min_length=5, max_length=120)
    answer: str = Field(default="", max_length=6000)
    choice_index: int | None = Field(default=None, ge=0, le=20)
    #: Indices of the source criteria the learner produced. Required for the
    #: self-graded formats; an empty list is a valid, meaningful answer.
    checked: list[int] | None = Field(default=None, max_length=20)
    latency_ms: int = Field(default=0, ge=0, le=3_600_000)
    session_id: str | None = Field(default=None, max_length=32)


def _practice_call(action):
    try:
        return action()
    except library.NotFound as error:
        raise HTTPException(404, str(error)) from error
    except practice.PracticeError as error:
        raise HTTPException(error.status, str(error)) from error
    except library.LibraryError as error:
        raise HTTPException(error.status, str(error)) from error


@router.get("/review")
def review_queue(request: Request, db: Session = Depends(get_db), body_limit: int | None = None):
    """What is due, why, and how to get back on track after a gap."""
    user = _current(request, db)
    return review.review_overview(db, user, today_target=body_limit)


@router.get("/review/stats")
def review_stats(request: Request, db: Session = Depends(get_db)):
    user = _current(request, db)
    return {
        "summary": practice.summary(db, user),
        "prediction": review.prediction(db, user),
        "note": (
            "Predicted recall is the scheduler's own estimate for each studied concept. "
            "It is shown so it can be checked, not because it is a measurement."
        ),
    }


@router.get("/review/attempts")
def review_history(
    request: Request,
    db: Session = Depends(get_db),
    concept: str | None = None,
    limit: int = 50,
):
    user = _current(request, db)
    rows = _practice_call(
        lambda: practice.history(db, user, concept_id=concept, limit=max(1, min(200, limit)))
    )
    return {"attempts": rows}


@router.get("/review/{concept_id}/prompt")
def review_prompt(
    concept_id: str,
    request: Request,
    db: Session = Depends(get_db),
    format: str = "free_recall",
    seed: int = 0,
    reveal: bool = False,
):
    """Build a prompt. The expected answer is never in this response."""
    user = _current(request, db)
    prompt = _practice_call(
        lambda: practice.build_prompt(db, user, concept_id, format, seed, revealed=reveal)
    )
    concept = _practice_call(lambda: library.get_concept(db, user, concept_id))
    attempts = (
        db.query(RetrievalAttempt)
        .filter(RetrievalAttempt.user_id == user.id, RetrievalAttempt.concept_id == concept.id)
        .count()
    )
    formats = practice.available_formats(db, concept)
    return {
        **prompt.payload(revealed=reveal),
        "available_formats": formats,
        "attempts_on_concept": attempts,
        # Rotate formats between attempts so recognition is not the only thing
        # practised; the material decides what is possible.
        "suggested_format": review.next_format(db, user, concept.id, attempts_for_concept=attempts),
    }


@router.post("/review/attempts", status_code=201)
def submit_practice(body: PracticeBody, request: Request, db: Session = Depends(get_db)):
    """Grade an answer, store it, and move the schedule. Nothing is ever overwritten."""
    user = _current(request, db)
    graded = _practice_call(
        lambda: practice.record(
            db,
            user,
            prompt_id=body.prompt_id,
            answer=body.answer,
            choice_index=body.choice_index,
            checked=body.checked,
            latency_ms=body.latency_ms,
            session_id=body.session_id,
        )
    )
    concept = db.get(Concept, graded.attempt.concept_id)
    return {
        "attempt": practice.attempt_payload(graded.attempt, concept.title if concept else ""),
        "explanation": graded.explanation,
        "model": graded.model,
        "next": {
            "next_review_at": graded.model["next_review_at"],
            "interval_days": graded.model["interval_days"],
            "reasons": [
                f"Score {graded.attempt.score:.2f} with weight {graded.attempt.evidence_weight:.1f} "
                f"({'server-graded' if graded.attempt.graded_by == 'auto' else 'self-graded'}).",
                f"Stability is now {graded.model['stability_days']:.2f} days.",
            ],
        },
    }
