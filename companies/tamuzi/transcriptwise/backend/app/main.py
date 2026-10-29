import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import uuid4

from alembic.config import Config
from alembic.script import ScriptDirectory
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api import analyses, auth, exports, learning, transcripts
from app.config import get_settings
from app.db import SessionLocal, engine
from app.errors import AppError, ServiceError
from app.security import limiter
from app.services.tasks import worker_loop

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not inspect(engine).has_table("alembic_version"):
        raise RuntimeError("Database migrations are missing. Run: alembic upgrade head (from backend/).")
    migration_config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    migration_config.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "alembic"))
    expected = set(ScriptDirectory.from_config(migration_config).get_heads())
    with engine.connect() as connection:
        actual = set(connection.execute(text("SELECT version_num FROM alembic_version")).scalars())
    if actual != expected:
        raise RuntimeError("Database migrations are out of date. Run: alembic upgrade head (from backend/).")
    task = asyncio.create_task(worker_loop()) if settings.worker_enabled else None
    app.state.worker = task
    yield
    if task:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


app = FastAPI(
    docs_url=None if settings.app_env == "production" else "/docs",
    redoc_url=None if settings.app_env == "production" else "/redoc",
    title="TranscriptWise API",
    version="0.1.0",
    description="Transcript input, authorized retrieval, source-grounded analysis and private learning workspaces.",
    lifespan=lifespan,
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts.split(","))
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)


class BodyLimitMiddleware:
    def __init__(self, app):
        self.app = app
        self.limit = max(settings.max_upload_bytes + 65536, settings.max_transcript_chars * 4 + 200000)

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] not in ("POST", "PATCH", "PUT", "DELETE"):
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers", []))
        try:
            too_large = int(headers.get(b"content-length", b"0")) > self.limit
        except ValueError:
            too_large = True
        body = bytearray()
        if not too_large:
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                body.extend(message.get("body", b""))
                if len(body) > self.limit:
                    too_large = True
                    break
                if not message.get("more_body", False):
                    break
        if too_large:
            response = JSONResponse(
                {
                    "error": {
                        "code": "request_too_large",
                        "message": "This request exceeds the server's safe input limit. Use a smaller transcript.",
                    }
                },
                status_code=413,
            )
            return await response(scope, receive, send)
        sent = False

        async def replay():
            nonlocal sent
            if not sent:
                sent = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, replay, send)


app.add_middleware(BodyLimitMiddleware)


@app.middleware("http")
async def response_headers(request: Request, call_next):
    request_id = str(uuid4())
    try:
        if request.url.path.startswith("/api/"):
            ip = request.client.host if request.client else "unknown"
            limiter.check(f"requests:{ip}", settings.requests_per_minute, 60)
        response = await call_next(request)
    except AppError as exc:
        response = JSONResponse(
            {"error": {"code": exc.code, "message": exc.message}},
            status_code=exc.status_code,
            headers={"Retry-After": "60"} if exc.status_code == 429 else None,
        )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Request-ID"] = request_id
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    if settings.app_env == "production" and "Content-Security-Policy" not in response.headers:
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https://*.ytimg.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        )
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.exception_handler(AppError)
async def app_error(request, exc: AppError):
    headers = {"Retry-After": "60"} if exc.status_code == 429 else None
    return JSONResponse({"error": {"code": exc.code, "message": exc.message}}, status_code=exc.status_code, headers=headers)


@app.exception_handler(ServiceError)
async def service_error(request, exc: ServiceError):
    return JSONResponse({"error": {"code": exc.code, "message": exc.message}}, status_code=422)


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc: RequestValidationError):
    fields = [{"field": ".".join(str(i) for i in error["loc"][1:]), "message": error["msg"]} for error in exc.errors()]
    return JSONResponse(
        {"error": {"code": "invalid_input", "message": "Check the highlighted input and try again.", "fields": fields}}, status_code=422
    )


@app.exception_handler(Exception)
async def unexpected_error(request, exc):
    logging.getLogger("transcriptwise").error("Request failed (%s), path=%s", type(exc).__name__, request.url.path)
    return JSONResponse(
        {
            "error": {
                "code": "server_error",
                "message": "An unexpected server error occurred. Your saved records have not been intentionally changed. Try again or contact the administrator.",
            }
        },
        status_code=500,
    )


for router in (auth.router, transcripts.router, analyses.router, learning.router, exports.router):
    app.include_router(router, prefix="/api/v1")


@app.get("/api/v1/health", tags=["Health"])
def health():
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    worker = getattr(app.state, "worker", None)
    worker_status = "disabled" if not settings.worker_enabled else "running" if worker and not worker.done() else "failed"
    payload = {
        "status": "ok" if worker_status != "failed" else "degraded",
        "version": "0.1.0",
        "ai_provider": settings.ai_provider,
        "worker_enabled": settings.worker_enabled,
        "worker_status": worker_status,
    }
    return JSONResponse(payload, status_code=503 if worker_status == "failed" else 200)


if settings.serve_frontend:
    frontend = Path(settings.frontend_path).resolve()
    if not (frontend / "index.html").exists():
        raise RuntimeError("Frontend build not found. Run npm run build in frontend/ first.")
    app.mount("/assets", StaticFiles(directory=frontend / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend_app(path: str):
        if path in ("api", "docs", "redoc") or path.startswith(("api/", "docs/", "redoc/")):
            return JSONResponse({"error": {"code": "not_found", "message": "Endpoint not found."}}, status_code=404)
        requested = (frontend / path).resolve()
        if requested.is_relative_to(frontend) and requested.is_file():
            return FileResponse(requested)
        return FileResponse(frontend / "index.html")
