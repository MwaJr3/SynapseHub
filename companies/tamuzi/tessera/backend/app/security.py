"""Password hashing (stdlib scrypt) and DB-backed cookie sessions."""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from . import config
from .models import SessionToken, User

SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware(value: datetime | None) -> datetime | None:
    """SQLite drops timezone info on write; treat stored values as UTC.

    Without this, comparing a stored expiry with an aware `now` raises TypeError
    and every authenticated request fails.
    """
    if value is None:
        return None
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt_hex, digest_hex = stored.split("$")
        if scheme != "scrypt":
            return False
        digest = hashlib.scrypt(
            password.encode("utf-8"), salt=bytes.fromhex(salt_hex), n=int(n), r=int(r), p=int(p)
        )
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def create_session(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    db.add(
        SessionToken(
            token=token,
            user_id=user.id,
            expires_at=_utcnow() + timedelta(seconds=config.SESSION_MAX_AGE_SECONDS),
        )
    )
    db.commit()
    return token


def destroy_session(db: Session, token: str) -> None:
    db.query(SessionToken).filter(SessionToken.token == token).delete()
    db.commit()


def get_session_user(db: Session, token: str | None) -> User | None:
    if not token:
        return None
    record = db.query(SessionToken).filter(SessionToken.token == token).first()
    if not record:
        return None
    expires_at = _as_aware(record.expires_at)
    if expires_at is not None and expires_at < _utcnow():
        db.delete(record)
        db.commit()
        return None
    return db.get(User, record.user_id)


def require_user(db: Session, token: str | None) -> User:
    user = get_session_user(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user
