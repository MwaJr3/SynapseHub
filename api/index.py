"""Vercel ASGI entrypoint; the same application also runs in the Docker profile."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from synapsehub.main import app  # noqa: E402,F401
