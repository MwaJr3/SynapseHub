"""Runtime configuration for SentinelLog. Values come from the environment."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("SENTINELLOG_DATA_DIR", BASE_DIR / "data"))
UPLOAD_DIR = Path(os.environ.get("SENTINELLOG_UPLOAD_DIR", DATA_DIR / "uploads"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'sentinellog.db'}")

# Uploaded files are untrusted input: size and type are enforced server-side.
MAX_UPLOAD_BYTES = int(os.environ.get("SENTINELLOG_MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))
ALLOWED_UPLOAD_SUFFIXES = {".log", ".txt", ".csv"}
MAX_PARSE_ERRORS_SHOWN = 200

SESSION_COOKIE_NAME = "sl_session"
SESSION_TTL_HOURS = 12

DEMO_MODE_LABEL = "Simulated demonstration data — not from a real environment."
