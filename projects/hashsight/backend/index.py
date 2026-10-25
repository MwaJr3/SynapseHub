"""hashsight — ASGI entry point.

Vercel detects a FastAPI app exported as `app` from index.py at the project
root and serves the whole application with its own routing, so no rewrites are
needed (the earlier explicit rewrites conflicted with that detection).

The repository layout keeps the code in the `app/` package; this file only
re-exports it, so local development (`uvicorn app.main:app`) is unchanged.

If the import fails, a fallback ASGI app answers with the scrubbed traceback
rather than an opaque 500 - an import-time failure is otherwise invisible on a
serverless platform, and the text contains no credentials.
"""

from __future__ import annotations

import json
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
    from app.main import app as application  # noqa: E402

    app = application

except Exception:  # noqa: BLE001 - surface the real import failure
    _DETAIL = _scrub(traceback.format_exc())

    async def app(scope, receive, send):  # type: ignore[misc]
        body = json.dumps(
            {
                "status": "import_failed",
                "app": "hashsight",
                "traceback": _DETAIL,
            }
        ).encode("utf-8")
        await send(
            {
                "type": "http.response.start",
                "status": 500,
                "headers": [
                    (b"content-type", b"application/json; charset=utf-8"),
                    (b"cache-control", b"no-store"),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})
