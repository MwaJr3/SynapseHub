"""ChessScope - ASGI entry point for the Vercel Python runtime (re-exports app.main:app)."""
from __future__ import annotations

import pathlib
import re
import sys
import traceback

ROOT = pathlib.Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def _scrub(text: str) -> str:
    text = re.sub(r"://[^@\s]*@", "://***@", text)
    text = re.sub(r"(?i)(password|secret|token|api[_-]?key)\s*=\s*\S+", r"\1=***", text)
    return text[-2000:]


try:
    from app.main import app  # noqa: E402
except Exception:  # noqa: BLE001
    from fastapi import FastAPI

    _DETAIL = _scrub(traceback.format_exc())
    app = FastAPI(title="ChessScope (import failed)")

    @app.get("/{path:path}")
    def _import_failed(path: str):
        return {"status": "import_failed", "app": "ChessScope", "traceback": _DETAIL}
