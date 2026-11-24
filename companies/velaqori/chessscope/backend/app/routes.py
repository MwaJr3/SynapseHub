"""ChessScope HTTP routes: auth, games, analysis, insights, reports."""
from __future__ import annotations

import json
import uuid
from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from .engine import engine_status
from . import analysis, config, recommendations, security
from .database import get_db
from .models import Game, Mistake, User

router = APIRouter()

DISCLAIMER = (
    "Heuristic flags mark suspicious patterns for review — they are NOT proof "
    "that a move is a mistake or that an attack/injury occurred. Engine "
    "evaluations are shown only when a local UCI engine is available."
)


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(config.SESSION_COOKIE)
    return security.require_user(db, token)


# ---------------------------------------------------------------- auth ----


class RegisterBody(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)
    display_name: str = ""

    @field_validator("email")
    @classmethod
    def _email_shape(cls, value: str) -> str:
        if "@" not in value or value.startswith("@") or value.endswith("@") or "." not in value.split("@")[-1]:
            raise ValueError("Enter a valid email address.")
        return value.lower()


class LoginBody(BaseModel):
    email: str
    password: str


@router.post("/api/auth/register")
def register(body: RegisterBody, response: Response, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(
        email=body.email.lower(),
        display_name=body.display_name or body.email.split("@")[0],
        password_hash=security.hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = security.create_session(db, user)
    response.set_cookie(config.SESSION_COOKIE, token, httponly=True, samesite="lax", max_age=config.SESSION_MAX_AGE_SECONDS)
    return {"id": user.id, "email": user.email, "display_name": user.display_name}


@router.post("/api/auth/login")
def login(body: LoginBody, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not security.verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    token = security.create_session(db, user)
    response.set_cookie(config.SESSION_COOKIE, token, httponly=True, samesite="lax", max_age=config.SESSION_MAX_AGE_SECONDS)
    return {"id": user.id, "email": user.email, "display_name": user.display_name}


@router.post("/api/auth/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(config.SESSION_COOKIE)
    if token:
        security.destroy_session(db, token)
    response.delete_cookie(config.SESSION_COOKIE)
    return {"ok": True}


@router.get("/api/auth/me")
def me(user: User = Depends(current_user)):
    return {"id": user.id, "email": user.email, "display_name": user.display_name}


# ---------------------------------------------------------------- games ---


class GameBody(BaseModel):
    pgn_text: str = Field(min_length=1)


def _game_row(game: Game) -> dict:
    return {
        "id": game.id,
        "uid": game.uid,
        "white": game.white,
        "black": game.black,
        "result": game.result,
        "created_at": game.created_at.isoformat() if game.created_at else None,
        "analysed": bool(game.analysis_json),
    }


@router.get("/api/games")
def list_games(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(Game).filter(Game.user_id == user.id).order_by(Game.id.desc()).all()
    return [_game_row(g) for g in rows]


@router.post("/api/games")
def upload_game(body: GameBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        parsed, _moves = analysis.parse_pgn(body.pgn_text)
    except analysis.PgnError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    headers = {key: parsed.headers.get(key, "") for key in ("White", "Black", "Result", "Date", "Event", "Opening")}
    game = Game(
        uid=uuid.uuid4().hex,
        user_id=user.id,
        white=headers.get("White", "") or "White",
        black=headers.get("Black", "") or "Black",
        result=headers.get("Result", "*"),
        headers_json=json.dumps(headers),
        pgn_text=body.pgn_text,
    )
    db.add(game)
    db.commit()
    db.refresh(game)
    return _game_row(game)


@router.get("/api/games/{game_id}")
def get_game(game_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    game = db.get(Game, game_id)
    if not game or game.user_id != user.id:
        raise HTTPException(status_code=404, detail="Game not found.")
    body = _game_row(game)
    body["headers"] = json.loads(game.headers_json)
    body["pgn_text"] = game.pgn_text
    body["analysis"] = json.loads(game.analysis_json) if game.analysis_json else None
    body["disclaimer"] = DISCLAIMER
    return body


@router.delete("/api/games/{game_id}")
def delete_game(game_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    game = db.get(Game, game_id)
    if not game or game.user_id != user.id:
        raise HTTPException(status_code=404, detail="Game not found.")
    db.delete(game)
    db.commit()
    return {"ok": True}


@router.post("/api/games/{game_id}/analyze")
def analyze_game(game_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    game = db.get(Game, game_id)
    if not game or game.user_id != user.id:
        raise HTTPException(status_code=404, detail="Game not found.")
    try:
        result = analysis.analyse_game(game.pgn_text, engine_path=config.ENGINE_PATH, depth=config.ENGINE_DEPTH)
    except analysis.PgnError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    # Record every classified move as durable training evidence (re-analysis replaces).
    db.query(Mistake).filter(Mistake.game_id == game.id).delete()
    for stat in result.moves:
        if not stat.classification:
            continue
        phase = recommendations.phase_of(stat.ply, stat.material_total)
        category = recommendations.categorise(list(stat.flags), bool(stat.is_capture), phase)
        db.add(Mistake(
            user_id=user.id, game_id=game.id, ply=stat.ply, san=stat.san,
            classification=stat.classification, eval_drop_cp=stat.eval_drop_cp or 0,
            phase=phase, category=category,
        ))
    payload = {
        "headers": result.headers,
        "result": result.result,
        "stats": result.stats,
        "engine": result.engine,
        "flags_summary": result.flags_summary,
        "disclaimer": DISCLAIMER,
        "moves": [asdict(m) for m in result.moves],
    }
    game.analysis_json = json.dumps(payload)
    db.commit()
    return payload


@router.get("/api/games/{game_id}/report.json")
def game_report(game_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    game = db.get(Game, game_id)
    if not game or game.user_id != user.id:
        raise HTTPException(status_code=404, detail="Game not found.")
    if not game.analysis_json:
        raise HTTPException(status_code=400, detail="Run an analysis before exporting a report.")
    return json.loads(game.analysis_json)


# -------------------------------------------------------------- training --


@router.get("/api/training/mistakes")
def training_mistakes(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Mistake, Game.pgn_text)
        .join(Game, Mistake.game_id == Game.id)
        .filter(Mistake.user_id == user.id)
        .order_by(Mistake.created_at, Mistake.ply)
        .all()
    )
    return {
        "mistakes": [
            {
                "id": m.id,
                "gameId": m.game_id,
                "pgnText": pgn,
                "ply": m.ply,
                "san": m.san,
                "classification": m.classification,
                "evalDropCp": m.eval_drop_cp,
                "phase": m.phase,
                "category": m.category,
                "createdAt": m.created_at.isoformat(),
            }
            for m, pgn in rows
        ]
    }


@router.get("/api/training/plan")
def training_plan(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(Mistake).filter(Mistake.user_id == user.id).order_by(Mistake.created_at).all()
    mistakes = [
        {"classification": m.classification, "category": m.category, "phase": m.phase,
         "created_at": m.created_at.isoformat()}
        for m in rows
    ]
    plan = recommendations.build_plan(mistakes)
    return {
        "totalMistakes": plan.total_mistakes,
        "byClassification": plan.by_classification,
        "byCategory": plan.by_category,
        "focusAreas": [
            {"category": f.category, "title": f.title, "advice": f.advice,
             "count": f.count, "phases": f.phases}
            for f in plan.focus_areas
        ],
        "note": plan.note,
        "progress": recommendations.progress_summary(mistakes),
    }


# -------------------------------------------------------------- insights --


@router.get("/api/insights")
def insights(user: User = Depends(current_user), db: Session = Depends(get_db)):
    games = db.query(Game).filter(Game.user_id == user.id).all()
    results = {"white_wins": 0, "black_wins": 0, "draws": 0, "unterminated": 0}
    openings: dict[str, int] = {}
    flagged = 0
    for game in games:
        if game.result == "1-0":
            results["white_wins"] += 1
        elif game.result == "0-1":
            results["black_wins"] += 1
        elif game.result == "1/2-1/2":
            results["draws"] += 1
        else:
            results["unterminated"] += 1
        headers = json.loads(game.headers_json)
        opening = headers.get("Opening") or "Unlabelled opening"
        openings[opening] = openings.get(opening, 0) + 1
        if game.analysis_json:
            summary = json.loads(game.analysis_json).get("flags_summary", {})
            flagged += sum(summary.values())
    return {
        "games": len(games),
        "results": results,
        "openings": sorted(openings.items(), key=lambda kv: -kv[1]),
        "heuristic_flags_total": flagged,
        "engine_available": bool(config.ENGINE_PATH),
        "engine": engine_status(),
        "disclaimer": DISCLAIMER,
    }
