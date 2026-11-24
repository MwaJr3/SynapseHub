"""Environment-driven settings (12-factor). No secrets or model paths are hard-coded."""
from __future__ import annotations
import os
import secrets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]          # backend/
DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))
STORAGE_DIR = Path(os.getenv("STORAGE_DIR", DATA_DIR / "storage"))

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'vocal-separator.db'}")
QUEUE_BACKEND = os.getenv("QUEUE_BACKEND", "inline")    # inline | redis (see jobs.py)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# No well-known fallback: an unset secret gets a random per-process value (tokens
# stop working on restart) instead of a published string anyone could forge with.
JWT_SECRET = os.getenv("JWT_SECRET") or secrets.token_urlsafe(48)

# Browser origins allowed to call the API (comma-separated). Auth is bearer-token,
# so no cookies are shared, but a wildcard still lets any site probe the API.
CORS_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:3000",
).split(",") if o.strip()]
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
# BS-RoFormer (e.g. viperx ep_317). Both files must exist or the engine reports itself unavailable.
ROFORMER_CKPT = os.getenv("ROFORMER_CKPT", "")
ROFORMER_CONFIG = os.getenv("ROFORMER_CONFIG", "")
ROFORMER_DEVICE = os.getenv("ROFORMER_DEVICE", "auto")       # auto | cpu | cuda
ROFORMER_PRECISION = os.getenv("ROFORMER_PRECISION", "auto") # auto | fp32 | bf16 | fp16 (auto = fastest safe)
FFMPEG = os.getenv("FFMPEG_BINARY", "ffmpeg")

def ensure_dirs() -> None:
    for sub in ("originals", "intermediate", "stems", "analysis", "exports"):
        (STORAGE_DIR / sub).mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
