"""ChessScope configuration."""
from __future__ import annotations

import os
from pathlib import Path

APP_NAME = "ChessScope"
DATA_DIR = Path(os.environ.get("CHESSSCOPE_DATA_DIR", "data"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'chessscope.db'}")
SESSION_COOKIE = "cs_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7


def _discover_engine() -> str:
    """Engine resolution order: explicit env var → bundled binary → PATH."""
    explicit = os.environ.get("CHESSSCOPE_ENGINE", "").strip()
    if explicit:
        return explicit
    bundled = Path(__file__).resolve().parent.parent / "engine" / "stockfish"
    if bundled.exists():
        return str(bundled)
    return ""


ENGINE_PATH = _discover_engine()
ENGINE_DEPTH = int(os.environ.get("CHESSSCOPE_ENGINE_DEPTH", "12"))
