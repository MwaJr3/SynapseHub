"""Frontpage FastAPI application entry point."""
from __future__ import annotations

import logging
import os
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import config, service
from .database import Base, SessionLocal, engine
from .routes import router

logging.basicConfig(level=logging.INFO)
config.DATA_DIR.mkdir(parents=True, exist_ok=True)
Base.metadata.create_all(bind=engine)


def _warm_guest_template() -> None:
    """Pre-fetch the guest feeds so the first "Try as Guest" click is instant."""
    try:
        with SessionLocal() as db:
            has_items, fresh = service.template_is_fresh(db)
        if not (has_items and fresh):
            service.refresh_template()
    except Exception:  # pragma: no cover
        logging.getLogger("frontpage").exception("Guest template warm-up failed")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if not os.environ.get("FRONTPAGE_SKIP_WARM"):
        threading.Thread(target=_warm_guest_template, daemon=True).start()
    yield


app = FastAPI(title=config.APP_NAME, version="1.0.0", lifespan=lifespan)
# Compress JSON bodies of 1 KB or more; smaller ones are not worth the CPU.
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5189", "http://127.0.0.1:5189"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "DENY")
    if request.url.path.startswith("/api/"):
        response.headers.setdefault("Cache-Control", "no-store")
    return response


@app.exception_handler(RequestValidationError)
async def validation_handler(_request: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    message = str(first.get("msg", "Invalid input.")).removeprefix("Value error, ")
    field = ".".join(str(p) for p in first.get("loc", []) if p not in ("body", "query"))
    return JSONResponse(status_code=422, content={"detail": f"{field}: {message}" if field else message})


app.include_router(router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": config.APP_NAME}


_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if _dist.exists():
    app.mount("/assets", StaticFiles(directory=str(_dist / "assets")), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "Not found."})
        candidate = (_dist / path).resolve()
        if path and candidate.is_file() and _dist.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(_dist / "index.html")
