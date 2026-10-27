"""Password hashing (stdlib scrypt), hashed session tokens and a small in-memory rate limiter."""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from . import config
from .models import PasswordReset, SessionToken, User, utcnow

SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str | None) -> bool:
    if not stored:
        return False
    try:
        scheme, n, r, p, salt_hex, digest_hex = stored.split("$")
        if scheme != "scrypt":
            return False
        digest = hashlib.scrypt(
            password.encode(), salt=bytes.fromhex(salt_hex), n=int(n), r=int(r), p=int(p)
        )
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def _digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(db: Session, user: User, max_age: int | None = None) -> tuple[str, int]:
    token = secrets.token_urlsafe(32)
    age = max_age or config.SESSION_MAX_AGE_SECONDS
    db.add(
        SessionToken(
            user_id=user.id, token_hash=_digest(token), expires_at=utcnow() + timedelta(seconds=age)
        )
    )
    db.commit()
    return token, age


def destroy_session(db: Session, token: str | None) -> None:
    if token:
        db.query(SessionToken).filter(SessionToken.token_hash == _digest(token)).delete()
        db.commit()


def get_session_user(db: Session, token: str | None) -> User | None:
    if not token:
        return None
    record = db.query(SessionToken).filter(SessionToken.token_hash == _digest(token)).first()
    if not record or record.expires_at < utcnow():
        return None
    user = db.get(User, record.user_id)
    if user and user.expires_at and user.expires_at < utcnow():
        return None
    return user


def issue_reset_token(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    db.add(
        PasswordReset(
            user_id=user.id,
            token_hash=_digest(token),
            expires_at=utcnow() + timedelta(seconds=config.RESET_TOKEN_TTL_SECONDS),
        )
    )
    db.commit()
    return token


def consume_reset_token(db: Session, token: str) -> User | None:
    record = db.query(PasswordReset).filter(PasswordReset.token_hash == _digest(token)).first()
    if not record or record.used or record.expires_at < utcnow():
        return None
    record.used = True
    user = db.get(User, record.user_id)
    db.commit()
    return user


class RateLimiter:
    """Sliding-window limiter keyed by (bucket, key). In-memory: per-process, resets on restart."""

    def __init__(self) -> None:
        self._hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, bucket: str, key: str, limit: int, window: float) -> None:
        if not config.RATE_LIMIT_ENABLED:
            return
        now = time.monotonic()
        with self._lock:
            hits = self._hits[(bucket, key)]
            while hits and now - hits[0] > window:
                hits.popleft()
            if len(hits) >= limit:
                retry = int(window - (now - hits[0])) + 1
                raise HTTPException(
                    status_code=429,
                    detail=f"Too many requests. Try again in {retry}s.",
                    headers={"Retry-After": str(retry)},
                )
            hits.append(now)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = RateLimiter()
