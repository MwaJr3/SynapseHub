"""PathWise configuration."""
from __future__ import annotations

import os
from pathlib import Path

APP_NAME = "PathWise"
DATA_DIR = Path(os.environ.get("PATHWISE_DATA_DIR", "data"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'pathwise.db'}")
SESSION_COOKIE = "pw_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
