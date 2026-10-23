"""CampusFlow configuration: environment variables only; secrets are never hardcoded."""
from __future__ import annotations

import os
from pathlib import Path

APP_NAME = "CampusFlow"
DATA_DIR = Path(os.environ.get("CAMPUSFLOW_DATA_DIR", "data"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'campusflow.db'}")
SESSION_COOKIE = "cf_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
MAX_UPLOAD_BYTES = 2 * 1024 * 1024
ALLOWED_GRADE_STATUSES = ("draft", "final")
ATTENDANCE_STATUSES = ("present", "absent", "late", "excused")
