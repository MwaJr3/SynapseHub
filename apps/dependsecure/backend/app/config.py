"""Runtime configuration for DependSecure."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("DEPENDSECURE_DATA_DIR", BASE_DIR / "data"))
UPLOAD_DIR = Path(os.environ.get("DEPENDSECURE_UPLOAD_DIR", DATA_DIR / "manifests"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'dependsecure.db'}")

MAX_UPLOAD_BYTES = int(os.environ.get("DEPENDSECURE_MAX_UPLOAD_BYTES", str(256 * 1024)))
ALLOWED_UPLOAD_SUFFIXES = {".txt", ".toml"}

# Scanner safety limits: never a shell, hard timeout, no dependency installs.
PIP_AUDIT_BIN = os.environ.get("DEPENDSECURE_PIP_AUDIT", "pip-audit")
SCAN_TIMEOUT_SECONDS = int(os.environ.get("DEPENDSECURE_SCAN_TIMEOUT", "90"))

SESSION_COOKIE_NAME = "ds_session"
SESSION_TTL_HOURS = 12

DEMO_MODE_LABEL = "Demonstration data. Findings obtained from a reproducible pip-audit scan are labelled with their advisory identifiers; illustrative records are explicitly marked."
