"""OpenLearn Commons configuration."""
from __future__ import annotations

import os
from pathlib import Path

APP_NAME = "OpenLearn Commons"
DATA_DIR = Path(os.environ.get("OPENLEARN_DATA_DIR", "data"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'openlearn-commons.db'}")
SESSION_COOKIE = "ol_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
