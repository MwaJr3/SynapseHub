"""ORM models: users, sessions, hash records, lookups, cases, notes."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import ForeignKey, Integer, String, Text, Float
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(128))
    salt: Mapped[str] = mapped_column(String(64))
    role: Mapped[str] = mapped_column(String(32), default="analyst")   # analyst | admin
    created_at: Mapped[str] = mapped_column(String(40), default=now)
    display_name: Mapped[str] = mapped_column(String(120), default="")
    mfa_secret: Mapped[str] = mapped_column(String(64), default="")
    mfa_enabled: Mapped[int] = mapped_column(Integer, default=0)


class SessionToken(Base):
    __tablename__ = "sessions"
    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    label: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[str] = mapped_column(String(40), default=now)
    expires_at: Mapped[str] = mapped_column(String(40))
    revoked: Mapped[int] = mapped_column(Integer, default=0)


class HashRecord(Base):
    __tablename__ = "hash_records"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    filename: Mapped[str] = mapped_column(String(255))
    size: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    sha1: Mapped[str] = mapped_column(String(40))
    md5: Mapped[str] = mapped_column(String(32))
    combined_verdict: Mapped[str] = mapped_column(String(32), default="UNKNOWN")
    disposition: Mapped[str] = mapped_column(String(32), default="unreviewed")  # unreviewed|suspicious|malicious|benign|false-positive
    created_at: Mapped[str] = mapped_column(String(40), default=now)


class Lookup(Base):
    __tablename__ = "lookups"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("hash_records.id"))
    provider: Mapped[str] = mapped_column(String(120))
    verdict: Mapped[str] = mapped_column(String(32))
    detections: Mapped[int] = mapped_column(Integer, nullable=True)
    total_engines: Mapped[int] = mapped_column(Integer, nullable=True)
    looked_up_at: Mapped[str] = mapped_column(String(40))
    raw_summary: Mapped[str] = mapped_column(Text)
    available: Mapped[int] = mapped_column(Integer, default=1)
    error: Mapped[str] = mapped_column(String(255), default="")


class Case(Base):
    __tablename__ = "cases"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(255))
    record_id: Mapped[int | None] = mapped_column(ForeignKey("hash_records.id"), nullable=True)
    disposition: Mapped[str] = mapped_column(String(32), default="open")
    created_at: Mapped[str] = mapped_column(String(40), default=now)


class Note(Base):
    __tablename__ = "notes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id"))
    author: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(String(40), default=now)


class ResetToken(Base):
    __tablename__ = "reset_tokens"
    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    expires_at: Mapped[str] = mapped_column(String(40))
    used: Mapped[int] = mapped_column(Integer, default=0)
