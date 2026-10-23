import hashlib

import redis
import structlog
from fastapi import Request

from app.config import get_settings
from app.errors import AppError

logger = structlog.get_logger(__name__)


def enforce_login_rate_limit(request: Request, email: str) -> None:
    """Redis fixed-window limit keyed by IP and normalized email.

    Development can fail open when Redis is unavailable. Production should set
    RATE_LIMIT_FAIL_OPEN=false so the limiter fails closed with a retryable 503.
    """
    settings = get_settings()
    client_ip = request.client.host if request.client else "unknown"
    digest = hashlib.sha256(f"{client_ip}:{email.lower()}".encode()).hexdigest()
    key = f"rate:login:{digest}"
    try:
        client = redis.Redis.from_url(settings.redis_url, socket_timeout=0.5)
        with client.pipeline(transaction=True) as pipe:
            pipe.incr(key)
            pipe.expire(key, settings.login_rate_window_seconds, nx=True)
            attempts, _ = pipe.execute()
        if int(attempts) > settings.login_rate_limit:
            raise AppError(
                429,
                "RATE_LIMITED",
                "Too many sign-in attempts. Try again later.",
                {"retry_after_seconds": settings.login_rate_window_seconds},
            )
    except AppError:
        raise
    except redis.RedisError as exc:
        logger.warning("rate_limiter_unavailable", error=type(exc).__name__)
        if not settings.rate_limit_fail_open:
            raise AppError(
                503, "RATE_LIMITER_UNAVAILABLE", "Sign-in is temporarily unavailable"
            ) from exc
