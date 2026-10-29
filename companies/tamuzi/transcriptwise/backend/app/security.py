import hashlib
import secrets
import time
from collections import defaultdict, deque
from datetime import timedelta
from threading import BoundedSemaphore, Lock
from urllib.parse import urlsplit

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, Request, Response
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db, utcnow
from app.errors import AppError
from app.models import SessionRecord, User

COOKIE = "tw_session"
password_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2)
password_slots = BoundedSemaphore(4)
DUMMY_HASH = password_hasher.hash("a-dummy-password-that-is-never-used")


def token_hash(value: str):
    return hashlib.sha256(value.encode()).hexdigest()


def issue_session(db: Session, user: User, response: Response):
    settings = get_settings()
    token = secrets.token_urlsafe(48)
    record = SessionRecord(
        token_hash=token_hash(token),
        user_id=user.id,
        csrf_token=secrets.token_hex(32),
        expires_at=utcnow() + timedelta(days=settings.guest_retention_days if user.email is None else settings.session_days),
    )
    db.add(record)
    db.commit()
    response.set_cookie(
        COOKIE,
        token,
        max_age=int((record.expires_at - utcnow()).total_seconds()),
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    return record


def find_session(request: Request, db: Session):
    token = request.cookies.get(COOKIE, "")
    if not token:
        return None
    record = db.get(SessionRecord, token_hash(token))
    if record is None or record.expires_at <= utcnow():
        return None
    user = db.get(User, record.user_id)
    if not user or (user.expires_at and user.expires_at <= utcnow()):
        return None
    return record


def current_session(request: Request, db: Session = Depends(get_db)) -> SessionRecord:
    record = find_session(request, db)
    if record is None:
        raise AppError(401, "session_expired", "Your session expired. Refresh this page to start a new guest workspace, or sign in.")
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        supplied = request.headers.get("x-csrf-token", "")
        if not supplied or not secrets.compare_digest(supplied, record.csrf_token):
            raise AppError(403, "csrf_failed", "This request could not be verified. Refresh the page and try again.")
        origin = request.headers.get("origin")
        if origin:
            same_host = urlsplit(origin).netloc == request.headers.get("host") and origin.startswith(("https://", "http://"))
            if (get_settings().app_env == "production" and not origin.startswith("https://")) or (
                not same_host and origin not in get_settings().allowed_origins.split(",")
            ):
                raise AppError(403, "origin_rejected", "Requests must come from this application's origin.")
    return record


def current_user(session: SessionRecord = Depends(current_session), db: Session = Depends(get_db)) -> User:
    return db.get(User, session.user_id)


def require_account(user: User):
    if not user.email:
        raise AppError(403, "account_required", "Create a free account or sign in to save this guide to your personal library.")


def hash_password(password: str) -> str:
    with password_slots:
        return password_hasher.hash(password)


def verify_password(encoded: str, password: str) -> bool:
    try:
        with password_slots:
            return password_hasher.verify(encoded, password)
    except (VerificationError, InvalidHashError):
        return False


class SlidingWindowLimiter:
    """Bounded, single-process limiter. Deploy behind an ingress limiter."""

    def __init__(self):
        self.buckets = defaultdict(deque)
        self.lock = Lock()

    def check(self, key: str, maximum: int, seconds: int):
        now = time.monotonic()
        with self.lock:
            bucket = self.buckets[key]
            while bucket and bucket[0] <= now - seconds:
                bucket.popleft()
            if len(bucket) >= maximum:
                raise AppError(429, "rate_limit", "Too many requests. Please wait a little before trying again.")
            bucket.append(now)
            if len(self.buckets) > 10000:
                # Hard memory bound. An ingress limiter remains necessary under a distributed flood.
                self.buckets.pop(next(iter(self.buckets)))


limiter = SlidingWindowLimiter()


def expensive_limit(request: Request):
    ip = request.client.host if request.client else "unknown"
    limiter.check(f"expensive:{ip}", get_settings().expensive_requests_per_hour, 3600)


def auth_limit(request: Request):
    ip = request.client.host if request.client else "unknown"
    limiter.check(f"auth:{ip}", 20, 600)
