from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from . import learning, tactics
from .database import get_db
from .endgames_routes import MoveBody
from .models import User
from .routes import current_user

router = APIRouter(prefix="/api/tactics")


@router.get("")
def list_puzzles(user: User = Depends(current_user), db: Session = Depends(get_db)):
    prog = learning.progress_map(db, user, "tactic")
    themes = sorted({p["theme"] for p in tactics.PUZZLES})
    return {"themes": themes, "puzzles": [{**tactics.public(p), "progress": prog.get(p["id"])} for p in tactics.PUZZLES]}


@router.get("/next")
def next_puzzle(user: User = Depends(current_user), db: Session = Depends(get_db)):
    p, reason = tactics.select_next(learning.progress_map(db, user, "tactic"))
    return {"puzzle": tactics.public(p, full=True), "reason": reason}


@router.post("/{pid}/move")
def move(pid: str, body: MoveBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = tactics.BY_ID.get(pid)
    if not p:
        raise HTTPException(status_code=404, detail="Puzzle not found.")
    res = tactics.check(p, body.fen, body.move)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    if res["solved"] or not res["accepted"]:
        learning.record(db, user, "tactic", pid, correct=bool(res["solved"]))
    res["explanation"] = p["explanation"] if (res["solved"] or not res["accepted"]) else None
    return res
