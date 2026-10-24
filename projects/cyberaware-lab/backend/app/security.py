"""Auth primitives shared across the SynapseHub project apps:
PBKDF2 passwords (200k), DB-backed session tokens, RFC 6238 TOTP MFA
(stdlib-only), and password-reset tokens. Generic errors everywhere."""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import struct
import time
from datetime import datetime, timedelta, timezone

PBKDF2_ITERATIONS = 200_000


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    return hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ITERATIONS).hex(), salt


def verify_password(password: str, stored: str, salt: str) -> bool:
    d, _ = hash_password(password, salt)
    return hmac.compare_digest(d, stored)


def new_token() -> str:
    return secrets.token_urlsafe(32)


def expiry(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def expiry_minutes(minutes: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).isoformat()


# ---- TOTP (RFC 6238, SHA-1 per the standard; stdlib only) ----

def totp_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def totp_code(secret: str, at: float | None = None) -> str:
    key = base64.b32decode(secret + "=" * (-len(secret) % 8))
    counter = int((at if at is not None else time.time()) // 30)
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    off = digest[-1] & 0x0F
    return f"{(struct.unpack('>I', digest[off:off + 4])[0] & 0x7FFFFFFF) % 10 ** 6:06d}"


def totp_verify(secret: str, code: str, window: int = 1) -> bool:
    now = time.time()
    return any(hmac.compare_digest(totp_code(secret, now + 30 * delta), code.strip())
               for delta in range(-window, window + 1))


def otpauth_url(secret: str, email: str, issuer: str) -> str:
    return f"otpauth://totp/{issuer}:{email}?secret={secret}&issuer={issuer}"
