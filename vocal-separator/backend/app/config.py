"""Environment-driven settings (12-factor). No secrets or model paths are hard-coded."""
from __future__ import annotations
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]          # backend/
DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))
STORAGE_DIR = Path(os.getenv("STORAGE_DIR", DATA_DIR / "storage"))

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'vocal-separator.db'}")
QUEUE_BACKEND = os.getenv("QUEUE_BACKEND", "inline")    # inline | redis (see jobs.py)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-change-me")
JWT_TTL_HOURS = int(os.getenv("JWT_TTL_HOURS", "72"))
DOWNLOAD_TOKEN_TTL = int(os.getenv("DOWNLOAD_TOKEN_TTL", "3600"))
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")              # this email becomes admin on register

MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "100"))
MAX_DURATION_S = int(os.getenv("MAX_DURATION_S", "1200"))     # 20 min
RETENTION_DAYS = int(os.getenv("RETENTION_DAYS", "7"))
WORKER_THREADS = int(os.getenv("WORKER_THREADS", "1"))        # audio jobs are RAM-heavy

# Separation engine preference: auto = ML (Demucs) when truly available, else DSP.
ENGINE = os.getenv("SEPARATION_ENGINE", "auto")               # auto | demucs | dsp
DEMUCS_MODEL = os.getenv("DEMUCS_MODEL", "htdemucs")
FFMPEG = os.getenv("FFMPEG_BINARY", "ffmpeg")

def ensure_dirs() -> None:
    for sub in ("originals", "intermediate", "stems", "analysis", "exports"):
        (STORAGE_DIR / sub).mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
