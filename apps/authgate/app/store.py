"""SQLite user/session store with PBKDF2 hashing and lockout counters."""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone

PBKDF2_ITERATIONS = 200_000

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, salt TEXT NOT NULL, role TEXT NOT NULL,
    mfa_secret TEXT DEFAULT '', failed_attempts INTEGER DEFAULT 0,
    locked_until TEXT DEFAULT '', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL, csrf TEXT NOT NULL, ip TEXT DEFAULT ''
);
"""


def connect(path: str) -> sqlite3.Connection:
    # FastAPI runs sync endpoints in a worker thread; allow cross-thread use
    # in this single-process demo (one connection, short queries).
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ITERATIONS)
    return digest.hex(), salt


def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    digest, _ = hash_password(password, salt)
    return hmac.compare_digest(digest, stored_hash)


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Store:
    def __init__(self, db_path: str, max_attempts: int = 5, lockout_minutes: int = 15) -> None:
        self.conn = connect(db_path)
        self.max_attempts = max_attempts
        self.lockout_minutes = lockout_minutes

    def create_user(self, username: str, password: str, role: str = "user",
                    mfa_secret: str = "") -> int:
        pw_hash, salt = hash_password(password)
        cur = self.conn.execute(
            "INSERT INTO users(username, password_hash, salt, role, mfa_secret, created_at) VALUES (?,?,?,?,?,?)",
            (username, pw_hash, salt, role, mfa_secret, _now().isoformat()))
        self.conn.commit()
        return cur.lastrowid

    def get_user(self, username: str) -> sqlite3.Row | None:
        return self.conn.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()

    def register_failed(self, username: str) -> int:
        user = self.get_user(username)
        if user is None:
            return 0
        attempts = user["failed_attempts"] + 1
        locked_until = ""
        if attempts >= self.max_attempts:
            locked_until = (_now() + timedelta(minutes=self.lockout_minutes)).isoformat()
        self.conn.execute("UPDATE users SET failed_attempts=?, locked_until=? WHERE id=?",
                          (attempts, locked_until, user["id"]))
        self.conn.commit()
        return attempts

    def clear_failures(self, username: str) -> None:
        self.conn.execute("UPDATE users SET failed_attempts=0, locked_until='' WHERE username=?", (username,))
        self.conn.commit()

    def is_locked(self, username: str) -> bool:
        user = self.get_user(username)
        if user is None or not user["locked_until"]:
            return False
        return datetime.fromisoformat(user["locked_until"]) > _now()

    def create_session(self, user_id: int, ip: str = "", ttl_minutes: int = 60) -> dict:
        token = secrets.token_urlsafe(32)
        csrf = secrets.token_urlsafe(24)
        expires = (_now() + timedelta(minutes=ttl_minutes)).isoformat()
        self.conn.execute("INSERT INTO sessions(token, user_id, created_at, expires_at, csrf, ip) VALUES (?,?,?,?,?,?)",
                          (token, user_id, _now().isoformat(), expires, csrf, ip))
        self.conn.commit()
        return {"token": token, "csrf": csrf, "expires_at": expires}

    def get_session(self, token: str) -> sqlite3.Row | None:
        row = self.conn.execute("SELECT * FROM sessions WHERE token=?", (token,)).fetchone()
        if row is None or datetime.fromisoformat(row["expires_at"]) < _now():
            return None
        return row

    def drop_session(self, token: str) -> None:
        self.conn.execute("DELETE FROM sessions WHERE token=?", (token,))
        self.conn.commit()
