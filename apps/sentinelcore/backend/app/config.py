"""SentinelCore configuration."""
from __future__ import annotations

import os
from pathlib import Path

APP_NAME = "SentinelCore"
DATA_DIR = Path(os.environ.get("SENTINELCORE_DATA_DIR", "data"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'sentinelcore.db'}")
SESSION_COOKIE = "sc_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
ROLES = ("admin", "analyst", "viewer")
INCIDENT_STATUSES = ("new", "triaged", "contained", "resolved", "closed")
SEVERITIES = ("low", "medium", "high", "critical")
