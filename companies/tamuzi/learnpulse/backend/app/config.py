"""LearnPulse configuration."""
from __future__ import annotations

import os
from pathlib import Path

APP_NAME = "LearnPulse"
DATA_DIR = Path(os.environ.get("LEARNPULSE_DATA_DIR", "data"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'learnpulse.db'}")
SESSION_COOKIE = "lp_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
