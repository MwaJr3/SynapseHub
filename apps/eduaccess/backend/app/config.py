"""EduAccess configuration."""
from __future__ import annotations

import os
from pathlib import Path

APP_NAME = "EduAccess"
DATA_DIR = Path(os.environ.get("EDUACCESS_DATA_DIR", "data"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'eduaccess.db'}")
SESSION_COOKIE = "ea_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
