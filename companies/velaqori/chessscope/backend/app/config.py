"""ChessScope configuration."""
from __future__ import annotations

import os
from pathlib import Path

APP_NAME = "ChessScope"
DATA_DIR = Path(os.environ.get("CHESSSCOPE_DATA_DIR", "data"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'chessscope.db'}")
SESSION_COOKIE = "cs_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7


from .engine import EngineSettings, clamp_depth, resolve_engine_path  # noqa: E402

ENGINE_PATH = resolve_engine_path()
ENGINE_DEPTH = clamp_depth(os.environ.get("CHESSSCOPE_ENGINE_DEPTH", "12"))
