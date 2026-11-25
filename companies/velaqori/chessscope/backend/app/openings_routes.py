"""Opening explorer, repertoire drill (spaced repetition) and game-to-opening linking."""
from __future__ import annotations

import json
from datetime import datetime, timezone

import chess
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from . import analysis, openings, srs
from .database import get_db
from .models import Game, Mistake, OpeningCard, User
from .routes import current_user

router = APIRouter(prefix="/api/openings")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime | None) -> datetime | None:
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _parse_moves(raw: str) -> list[str]:
    return [m for m in raw.split(",") if m]


def _card_view(card: OpeningCard) -> dict:
    r = openings.get(card.opening_id)
    now = _now()
    due = _aware(card.due_at)
    last = _aware(card.last_reviewed_at)
    elapsed = (now - last).total_seconds() / 86400 if last else 0.0
    return {
        "id": card.id, "opening_id": card.opening_id, "side": card.side,
        "eco": r["eco"], "name": r["name"], "plies": len(r["uci"]),
        "reps": card.reps, "lapses": card.lapses, "stability_days": round(card.stability, 2),
        "due_at": due.isoformat(), "due": due <= now,
        "recall_estimate": round(srs.retrievability(card.stability, elapsed), 3) if card.reps else None,
        "recall_note": "Estimated by a simple forgetting model, not measured.",
    }


@router.get("")
def search(q: str = Query("", max_length=60), eco: str = Query("", max_length=3),
           limit: int = Query(40, ge=1, le=100), user: User = Depends(current_user)):
    return {"meta": openings.meta(), "results": [openings.public(r) for r in openings.search(q, eco, limit)]}


@router.get("/explore")
def explore(moves: str = Query("", max_length=600), user: User = Depends(current_user)):
    try:
        return openings.explore(_parse_moves(moves))
    except openings.LineError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/cards")
def list_cards(user: User = Depends(current_user), db: Session = Depends(get_db)):
    cards = db.query(OpeningCard).filter(OpeningCard.user_id == user.id).order_by(OpeningCard.due_at).all()
    return {"cards": [_card_view(c) for c in cards]}


class CardBody(BaseModel):
    opening_id: int = Field(ge=0)
    side: str = Field(pattern="^(white|black)$")


@router.post("/cards")
def add_card(body: CardBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    r = openings.get(body.opening_id)
    if r is None:
        raise HTTPException(status_code=404, detail="Opening not found.")
    if len(r["uci"]) > openings.MAX_DRILL_PLIES:
        raise HTTPException(status_code=400, detail="Line is too long to drill.")
    existing = db.query(OpeningCard).filter_by(user_id=user.id, opening_id=body.opening_id, side=body.side).first()
    if existing:
        return _card_view(existing)
    card = OpeningCard(user_id=user.id, opening_id=body.opening_id, side=body.side, due_at=_now())
    db.add(card)
    db.commit()
    db.refresh(card)
    return _card_view(card)


def _owned_card(db: Session, user: User, card_id: int) -> OpeningCard:
    card = db.get(OpeningCard, card_id)
    if not card or card.user_id != user.id:
        raise HTTPException(status_code=404, detail="Card not found.")
    return card


@router.delete("/cards/{card_id}")
def delete_card(card_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(_owned_card(db, user, card_id))
    db.commit()
    return {"ok": True}


@router.get("/cards/{card_id}/drill")
def drill_prompt(card_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """What the learner may see before answering: the opening name and their side, never the line."""
    card = _owned_card(db, user, card_id)
    r = openings.get(card.opening_id)
    mine = [i for i in range(len(r["uci"])) if (i % 2 == 0) == (card.side == "white")]
    theirs = [r["uci"][i] for i in range(len(r["uci"])) if i not in set(mine)]
    return {"card": _card_view(card), "user_moves": len(mine), "opponent_moves": theirs}


class ReviewBody(BaseModel):
    moves: list[str] = Field(max_length=40)  # the learner's own moves, in order


@router.post("/cards/{card_id}/review")
def review_card(card_id: int, body: ReviewBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Server-graded: compares the learner's moves with the stored line; updates the schedule."""
    card = _owned_card(db, user, card_id)
    r = openings.get(card.opening_id)
    mine_idx = [i for i in range(len(r["uci"])) if (i % 2 == 0) == (card.side == "white")]
    expected = [r["uci"][i] for i in mine_idx]
    first_error = None
    for k, exp in enumerate(expected):
        if k >= len(body.moves) or body.moves[k] != exp:
            first_error = k
            break
    correct = first_error is None and len(body.moves) >= len(expected)
    now = _now()
    last = _aware(card.last_reviewed_at)
    elapsed = (now - last).total_seconds() / 86400 if last else 0.0
    new, due = srs.review(srs.Card(card.stability, card.difficulty, card.reps, card.lapses),
                          correct=correct, elapsed_days=elapsed, now=now)
    card.stability, card.difficulty, card.reps, card.lapses = new.stability, new.difficulty, new.reps, new.lapses
    card.due_at, card.last_reviewed_at = due, now
    db.commit()
    board = chess.Board()
    san = []
    for u in r["uci"]:
        mv = chess.Move.from_uci(u)
        san.append(board.san(mv))
        board.push(mv)
    return {"correct": correct, "first_error_index": first_error, "expected": expected,
            "line_san": san, "opening": openings.public(r, detail=True), "card": _card_view(card)}


@router.get("/{opening_id}")
def opening_detail(opening_id: int, user: User = Depends(current_user)):
    r = openings.get(opening_id)
    if r is None:
        raise HTTPException(status_code=404, detail="Opening not found.")
    return openings.public(r, detail=True)


games_router = APIRouter()


@games_router.get("/api/games/{game_id}/opening")
def game_opening(game_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Match a stored game to a named opening and link recorded mistakes made while in or just after book."""
    game = db.get(Game, game_id)
    if not game or game.user_id != user.id:
        raise HTTPException(status_code=404, detail="Game not found.")
    try:
        _parsed, moves = analysis.parse_pgn(game.pgn_text)
    except analysis.PgnError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    ucis = [m.uci() if hasattr(m, "uci") else str(m) for m in moves]
    match = openings.match_game(ucis)
    if not match:
        return {"match": None, "linked_mistakes": [], "note": "No named opening matched this game."}
    window = match["matched_plies"] + 4
    rows = (db.query(Mistake).filter(Mistake.game_id == game.id, Mistake.user_id == user.id,
                                     Mistake.ply <= window).order_by(Mistake.ply).all())
    return {"match": match,
            "linked_mistakes": [{"ply": m.ply, "san": m.san, "classification": m.classification} for m in rows],
            "note": "Mistakes within four plies of leaving the known line are linked to the opening; "
                    "engine-classified mistakes only exist after an analysis with an engine."}
