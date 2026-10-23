"""CircuitLab Calc configuration."""
from __future__ import annotations

import os
from pathlib import Path

APP_NAME = "CircuitLab Calc"
DATA_DIR = Path(os.environ.get("CIRCUITLAB_DATA_DIR", "data"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'circuitlab.db'}")
SESSION_COOKIE = "cl_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
