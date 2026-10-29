"""ClassConnect configuration."""
from __future__ import annotations

import os
from pathlib import Path

APP_NAME = "ClassConnect"
DATA_DIR = Path(os.environ.get("CLASSCONNECT_DATA_DIR", "data"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'classconnect.db'}")
SESSION_COOKIE = "cc_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
