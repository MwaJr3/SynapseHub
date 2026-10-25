"""netscope — ASGI entry point for the Vercel Python runtime.

Vercel serves this file at every path routed by ../vercel.json. The backend
directory is added to sys.path so the application package imports exactly as it
does locally (from app.main import app) with no duplicated code.

If the package import fails, a fallback ASGI app answers with the scrubbed
traceback instead of an opaque 500. On a serverless platform an import-time
failure is otherwise invisible without a log session, and this text contains no
credentials - only module paths and exception types.
"""

from __future__ import annotations

import json
import pathlib
import re
import sys
import traceback

BACKEND_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _scrub(text: str) -> str:
    """Remove anything credential-shaped before it can reach a response."""
    text = re.sub(r"://[^@\s]*@", "://***@", text)
    text = re.sub(r"(?i)(password|secret|token|api[_-]?key)\s*=\s*\S+", r"\1=***", text)
    return text[-2000:]


try:
    from app.main import app as application  # noqa: E402

    # The runtime looks for `app` (ASGI) or `handler`.
    app = application
    handler = application

except Exception:  # noqa: BLE001 - surface the real import failure
    _DETAIL = _scrub(traceback.format_exc())

    async def app(scope, receive, send):  # type: ignore[misc]
        body = json.dumps(
            {
                "status": "import_failed",
                "app": "netscope",
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

    handler = app
