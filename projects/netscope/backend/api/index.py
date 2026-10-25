"""netscope — ASGI entry point for the Vercel Python runtime.

Vercel serves this file at every path routed by ../vercel.json. The backend
directory is added to sys.path so the application package imports exactly as it
does locally (from app.main import app) with no duplicated code.
"""

from __future__ import annotations

import pathlib
import sys

BACKEND_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app as application  # noqa: E402

# The runtime looks for `app` (ASGI) or `handler`.
app = application
handler = application
