"""Password hashing (PBKDF2-SHA256) and session tokens. No plaintext passwords."""
from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

PBKDF2_ITERATIONS = 200_000


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    return hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ITERATIONS).hex(), salt


def verify_password(password: str, stored: str, salt: str) -> bool:
    digest, _ = hash_password(password, salt)
    return hmac.compare_digest(digest, stored)


def new_token() -> str:
    return secrets.token_urlsafe(32)


def expiry(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
