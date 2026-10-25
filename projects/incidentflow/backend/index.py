"""incidentflow — ASGI entry point for the Vercel Python runtime.

Vercel detects a FastAPI `app` exported from index.py in the project root and
serves the whole application with its own routing, so no rewrites are needed.
The repository layout keeps the code in the `app/` package; this file only
re-exports it, so local development (`uvicorn app.main:app`) is unchanged.

If the import fails, a minimal FastAPI fallback answers with the scrubbed
traceback instead of an opaque FUNCTION_INVOCATION_FAILED. An import-time
failure is otherwise invisible on a serverless platform, and this text contains
no credentials - only module paths and exception types. (A bare ASGI callable is
not accepted here; the fallback must be a real application object.)
"""

from __future__ import annotations

import pathlib
import re
import sys
import traceback

BACKEND_ROOT = pathlib.Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _scrub(text: str) -> str:
    """Remove anything credential-shaped before it can reach a response."""
    text = re.sub(r"://[^@\s]*@", "://***@", text)
    text = re.sub(r"(?i)(password|secret|token|api[_-]?key)\s*=\s*\S+", r"\1=***", text)
    return text[-2000:]


try:
    from app.main import app  # noqa: E402

except Exception:  # noqa: BLE001 - surface the real import failure
    from fastapi import FastAPI  # imported here so the happy path stays clean

    _DETAIL = _scrub(traceback.format_exc())
    app = FastAPI(title="incidentflow (import failed)")

    @app.get("/{path:path}")
    def _import_failed(path: str):
        return {"status": "import_failed", "app": "incidentflow", "traceback": _DETAIL}
