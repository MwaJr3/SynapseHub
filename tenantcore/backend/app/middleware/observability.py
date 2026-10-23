import logging
import time
import uuid

import structlog
from fastapi import FastAPI, Request
from prometheus_client import Counter, Histogram
from starlette.middleware.base import RequestResponseEndpoint

REQUESTS = Counter("tenantcore_http_requests_total", "HTTP requests", ["method", "route", "status"])
LATENCY = Histogram(
    "tenantcore_http_request_duration_seconds", "HTTP request latency", ["method", "route"]
)
logger = structlog.get_logger(__name__)


def configure_logging(level: str = "INFO") -> None:
    logging.basicConfig(format="%(message)s", level=getattr(logging, level.upper(), logging.INFO))
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, level.upper(), logging.INFO)
        ),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def install_observability(app: FastAPI) -> None:
    @app.middleware("http")
    async def observe_request(request: Request, call_next: RequestResponseEndpoint):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as exc:
            logger.exception("request_failed", method=request.method, path=request.url.path)
            raise exc
        duration = time.perf_counter() - started
        route = request.scope.get("route")
        route_path = getattr(route, "path", request.url.path)
        REQUESTS.labels(request.method, route_path, str(response.status_code)).inc()
        LATENCY.labels(request.method, route_path).observe(duration)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        logger.info(
            "request_completed",
            method=request.method,
            route=route_path,
            status=response.status_code,
            duration_ms=round(duration * 1000, 2),
            tenant_id=getattr(request.state, "tenant_id", None),
            user_id=getattr(request.state, "user_id", None),
        )

        return response
