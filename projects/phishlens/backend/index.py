"""TEMPORARY deployment probe.

Self-contained: imports nothing from the application package, so a 200 here
proves the platform is serving this file at all. /probe then attempts the real
import and reports the scrubbed traceback. Replaced by the real entry point as
soon as routing is confirmed.
"""

from __future__ import annotations

import json
import pathlib
import re
import sys
import traceback

from fastapi import FastAPI
from fastapi.responses import JSONResponse

BACKEND_ROOT = pathlib.Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

app = FastAPI(title="probe")


@app.get("/health")
def health():
    return {"status": "ok", "probe": True, "file": __file__}


@app.get("/probe")
def probe():
    try:
        from app.main import app as real_app
    except Exception:  # noqa: BLE001
        detail = traceback.format_exc()
        detail = re.sub(r"://[^@\s]*@", "://***@", detail)
        detail = re.sub(r"(?i)(password|secret|token|api[_-]?key)\s*=\s*\S+", r"\1=***", detail)
        return JSONResponse({"status": "import_failed", "traceback": detail[-2000:]}, status_code=500)
    return {"status": "import_ok", "routes": len(real_app.routes), "sys_path": sys.path[:4]}


@app.get("/{path:path}")
def fallback(path: str):
    return {"status": "probe_routed", "path": path, "warnings": json.dumps({})}
