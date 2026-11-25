from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from . import endgames, learning
from .database import get_db
from .models import User
from .routes import current_user

router = APIRouter(prefix="/api/endgames")


@router.get("")
def list_exercises(user: User = Depends(current_user), db: Session = Depends(get_db)):
    prog = learning.progress_map(db, user, "endgame")
    return {"exercises": [{**endgames.public_exercise(e), "progress": prog.get(e["id"])} for e in endgames.EXERCISES]}


@router.get("/{ex_id}")
def get_exercise(ex_id: str, user: User = Depends(current_user)):
    ex = endgames.BY_ID.get(ex_id)
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found.")
    return endgames.public_exercise(ex, full=True)


class MoveBody(BaseModel):
    fen: str = Field(max_length=100)
    move: str = Field(max_length=5)


@router.post("/{ex_id}/move")
def play(ex_id: str, body: MoveBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    ex = endgames.BY_ID.get(ex_id)
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found.")
    res = endgames.check_move(ex, body.fen, body.move)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    if res["solved"] or not res["accepted"]:
        learning.record(db, user, "endgame", ex_id, correct=bool(res["solved"]))
    res["explanation"] = ex["explanation"] if (res["solved"] or not res["accepted"]) else None
    return res
