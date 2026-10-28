"""Serve the built frontend from the API process.

Tessera ships as one container: the React build is copied next to the Python
app, and this module makes the API host it. Doing it here rather than behind a
separate web server means there is one origin — so the session cookie is
first-party, CORS never enters the picture in production, and `ALLOWED_ORIGINS`
is only needed for local development where Vite serves on its own port.

Three rules the code keeps:

* **API paths never fall through to the SPA.** `/api/does-not-exist` must be a
  404 JSON error, not the HTML shell: a client parsing JSON would otherwise get
  a page and fail with a parse error that hides the real status.
* **Only files inside the build directory are served.** The path is resolved and
  checked against the root, so `..%2f..%2fetc/passwd` cannot escape it.
* **`index.html` is never cached.** The assets carry content hashes in their
  names, so they can be cached forever; the document that points at them cannot,
  or a deploy would leave browsers loading a bundle that no longer exists.
"""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

#: Paths the API owns. A request under any of these that reached the catch-all
#: is a missing API route (or a missing static asset), never a page.
RESERVED_PREFIXES = ("api/", "docs", "redoc", "openapi.json", "health")


def mount_frontend(app: FastAPI, directory: str | Path) -> Path:
    """Attach the built frontend to `app`. Returns the directory it served."""
    root = Path(directory).resolve()
    index = root / "index.html"
    if not index.is_file():
        raise RuntimeError(
            f"TESSERA_FRONTEND_DIR points at {root}, which has no index.html. "
            "Run `npm run build` in apps/tessera/frontend first."
        )

    assets = root / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="frontend-assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        if path.startswith(RESERVED_PREFIXES):
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = (root / path).resolve()
        if candidate.is_file() and candidate.is_relative_to(root) and candidate != index:
            return FileResponse(candidate)
        return FileResponse(index, headers={"Cache-Control": "no-cache"})

    return root
