"""TutorSpring configuration."""
from __future__ import annotations

import os
from pathlib import Path

APP_NAME = "TutorSpring"
DATA_DIR = Path(os.environ.get("TUTORSPRING_DATA_DIR", "data"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'tutorspring.db'}")
SESSION_COOKIE = "ts_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
