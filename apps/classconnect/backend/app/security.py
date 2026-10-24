"""Password hashing (stdlib scrypt) and DB-backed cookie sessions."""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from typing import Callable

from fastapi import HTTPException
from sqlalchemy.orm import Session

from . import config
from .models import SessionToken, User

SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1


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
            password.encode("utf-8"),
            salt=bytes.fromhex(salt_hex),
            n=int(n),
            r=int(r),
            p=int(p),
        )
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def create_session(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    db.add(SessionToken(user_id=user.id, token=token))
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
    return db.get(User, record.user_id)


def require_user(db: Session, token: str | None) -> User:
    user = get_session_user(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user


def require_role(user: User, *roles: str) -> User:
    if user.role not in roles:
        raise HTTPException(status_code=403, detail="Your role cannot perform this action.")
    return user
