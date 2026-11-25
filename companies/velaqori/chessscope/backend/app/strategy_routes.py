from __future__ import annotations

import chess
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from . import learning, strategy
from .database import get_db
from .models import User
from .routes import current_user

router = APIRouter(prefix="/api/strategy")


@router.get("")
def overview(user: User = Depends(current_user), db: Session = Depends(get_db)):
    prog = learning.progress_map(db, user, "strategy")
    return {
        "provenance": strategy.PROV,
        "lessons": [{**l, "features": strategy.features(l["fen"]), "provenance": strategy.PROV} for l in strategy.LESSONS],
        "exercises": [{"id": e["id"], "title": e["title"], "fen": e["fen"], "prompt": e["prompt"],
                       "progress": prog.get(e["id"]), "provenance": strategy.PROV} for e in strategy.EXERCISES],
    }


class AnswerBody(BaseModel):
    squares: list[str] = Field(max_length=64)


@router.post("/exercises/{ex_id}/answer")
def answer(ex_id: str, body: AnswerBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    ex = strategy.BY_ID.get(ex_id)
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found.")
    try:
        given = sorted({chess.square_name(chess.parse_square(s)) for s in body.squares})
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid square.")
    expected = strategy.answer_for(ex)
    correct = given == expected
    learning.record(db, user, "strategy", ex_id, correct)
    return {"correct": correct, "missed": [s for s in expected if s not in given],
            "extra": [s for s in given if s not in expected], "explanation": ex["why"],
            "answer": expected if correct else None}
