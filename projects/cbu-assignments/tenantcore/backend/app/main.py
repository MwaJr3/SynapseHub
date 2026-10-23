import redis
import structlog
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app import __version__
from app.api.router import api_router
from app.config import get_settings
from app.database.session import engine
from app.errors import AppError
from app.middleware.observability import configure_logging, install_observability

settings = get_settings()
configure_logging(settings.log_level)
logger = structlog.get_logger(__name__)
app = FastAPI(
    title="TenantCore API",
    version=__version__,
    description="Multi-tenant SaaS control plane with PostgreSQL Row-Level Security.",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url=None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Tenant-ID", "X-API-Key", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)
install_observability(app)


def error_body(request: Request, code: str, message: str, details=None) -> dict:
    return {
        "error": {"code": code, "message": message, "details": details},
        "request_id": getattr(request.state, "request_id", None),
    }


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(request, exc.code, exc.message, exc.details),
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    details = [
        {"field": ".".join(str(part) for part in error["loc"]), "message": error["msg"]}
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content=error_body(request, "VALIDATION_ERROR", "The request is invalid", details),
    )


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.info("database_constraint_rejected", error=type(exc.orig).__name__)
    return JSONResponse(
        status_code=409,
        content=error_body(request, "CONFLICT", "The operation conflicts with existing data"),
    )


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(request: Request, exc: SQLAlchemyError):
    logger.error("database_operation_failed", error=type(exc).__name__)
    return JSONResponse(
        status_code=500,
        content=error_body(
            request, "DATABASE_ERROR", "The database operation could not be completed"
        ),
    )


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(request: Request, exc: StarletteHTTPException):
    codes = {
        401: "AUTH_REQUIRED",
        403: "PERMISSION_DENIED",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
    }
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(request, codes.get(exc.status_code, "HTTP_ERROR"), str(exc.detail)),
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, exc: Exception):
    logger.exception("unhandled_application_error", error=type(exc).__name__)
    return JSONResponse(
        status_code=500,
        content=error_body(request, "INTERNAL_ERROR", "An unexpected error occurred"),
    )


app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/", include_in_schema=False)
def root():
    return {"name": "TenantCore", "version": __version__, "api": settings.api_prefix}


@app.get("/health/live", tags=["health"])
def liveness():
    return {"status": "ok"}


@app.get("/health/ready", tags=["health"])
def readiness():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return JSONResponse(
            status_code=503, content={"status": "unavailable", "database": "failed"}
        )
    redis_status = "not_checked"
    redis_required = settings.environment == "production" or not settings.rate_limit_fail_open
    try:
        redis.Redis.from_url(settings.redis_url, socket_timeout=0.3).ping()
        redis_status = "ok"
    except redis.RedisError:
        redis_status = "unavailable"
        if redis_required:
            return JSONResponse(
                status_code=503,
                content={"status": "unavailable", "database": "ok", "redis": "failed"},
            )
    return {"status": "ok", "database": "ok", "redis": redis_status}


@app.get("/metrics", include_in_schema=False)
def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
