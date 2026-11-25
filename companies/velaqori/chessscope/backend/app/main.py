"""ChessScope FastAPI application entry point."""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .chess_tools import InputError, parse_input
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import config
from .database import create_all
from .routes import router
from .seed import seed

create_all()

app = FastAPI(title=config.APP_NAME, version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5178", "http://127.0.0.1:5178"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
from .openings_routes import games_router, router as openings_router  # noqa: E402
app.include_router(openings_router)
app.include_router(games_router)
from .endgames_routes import router as endgames_router  # noqa: E402
app.include_router(endgames_router)


@app.get("/api/engine/status")
def engine_status_route():
    """Which evaluation sources exist: server UCI (optional) and browser WASM (always offered)."""
    from .engine import engine_status

    return {
        "server": engine_status(),
        "browser": {"available": True, "source": "stockfish.js WASM (in-browser)",
                    "message": "A WebAssembly Stockfish runs in your browser; nothing is sent to a server."},
    }


class ParseBody(BaseModel):
    text: str = Field(max_length=200_000)


@app.post("/api/chess/parse")
def chess_parse(body: ParseBody):
    """Authoritative FEN/PGN validation (python-chess). Pure function; stores nothing."""
    try:
        return parse_input(body.text)
    except InputError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/api/health")
def health():
    return {"status": "ok", "app": config.APP_NAME}


@app.on_event("startup")
def _startup() -> None:
    if not os.environ.get("CHESSSCOPE_SKIP_SEED"):
        seed()


_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if _dist.exists():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="frontend")
