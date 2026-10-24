"""ReachLearn configuration."""
from __future__ import annotations

import os
from pathlib import Path

APP_NAME = "ReachLearn"
DATA_DIR = Path(os.environ.get("REACHLEARN_DATA_DIR", "data"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'reachlearn.db'}")
SESSION_COOKIE = "rl_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
