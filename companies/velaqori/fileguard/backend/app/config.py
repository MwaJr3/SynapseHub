"""Runtime configuration for FileGuard."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("FILEGUARD_DATA_DIR", BASE_DIR / "data"))
UPLOAD_DIR = Path(os.environ.get("FILEGUARD_UPLOAD_DIR", DATA_DIR / "files"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'fileguard.db'}")

MAX_UPLOAD_BYTES = int(os.environ.get("FILEGUARD_MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))
# Extensions accepted as monitorable text-like files in this MVP. Uploads are
# never executed; binary executables are intentionally not accepted.
ALLOWED_UPLOAD_SUFFIXES = {".txt", ".log", ".csv", ".json", ".yaml", ".yml", ".ini", ".cfg", ".conf", ".md", ".py", ".sh"}

SESSION_COOKIE_NAME = "fg_session"
SESSION_TTL_HOURS = 12

DEMO_MODE_LABEL = "Simulated demonstration data — files were uploaded to this application workspace only."
