"""Auth (§83/84) + signed download URLs (§55/84). Passwords: PBKDF2-HMAC-SHA256.
Uploaded audio is private by default; storage paths are never predictable URLs.
"""
from __future__ import annotations
import base64, datetime as dt, hashlib, hmac, os
import jwt
from .config import JWT_SECRET, JWT_TTL_HOURS, DOWNLOAD_TOKEN_TTL

_PBKDF2_ROUNDS = 210_000


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ROUNDS)
    return f"pbkdf2${_PBKDF2_ROUNDS}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, rounds, salt_b64, dk_b64 = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), base64.b64decode(salt_b64), int(rounds))
        return hmac.compare_digest(base64.b64encode(dk).decode(), dk_b64)
    except Exception:
        return False


def make_token(user_id: int, email: str, is_admin: bool) -> str:
    payload = {"sub": str(user_id), "email": email, "admin": is_admin,
               "exp": dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=JWT_TTL_HOURS)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])


def sign_download(storage_key: str, user_id: int) -> str:
    """Short-lived HMAC capability token bound to one object + user (§84).

    The user ID is embedded in the token because browser media elements and
    ordinary download anchors cannot attach an Authorization header. It is
    not trusted on its own: the HMAC covers the storage key, user ID and
    expiry, and the route still checks that this user owns the underlying
    job/export before returning bytes.
    """
    exp = int(dt.datetime.now(dt.timezone.utc).timestamp()) + DOWNLOAD_TOKEN_TTL
    msg = f"{storage_key}|{user_id}|{exp}".encode()
    sig = hmac.new(JWT_SECRET.encode(), msg, hashlib.sha256).hexdigest()
    return f"{user_id}.{exp}.{sig}"


def verify_download(storage_key: str, token: str) -> int | None:
    """Return the authenticated owner ID for a valid capability token, else None."""
    try:
        user_id_s, exp_s, sig = token.split(".")
        user_id = int(user_id_s)
        if int(exp_s) < int(dt.datetime.now(dt.timezone.utc).timestamp()):
            return None
        msg = f"{storage_key}|{user_id}|{exp_s}".encode()
        expect = hmac.new(JWT_SECRET.encode(), msg, hashlib.sha256).hexdigest()
        return user_id if hmac.compare_digest(sig, expect) else None
    except Exception:
        return None
