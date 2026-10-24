"""OpenLearn Commons ORM models."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="contributor")  # contributor|translator|reviewer|admin
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SessionToken(Base):
    __tablename__ = "session_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uid: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    resource_type: Mapped[str] = mapped_column(String(32), default="lesson")  # lesson|reading|worksheet|audio|video|simulation|course_pack
    subject: Mapped[str] = mapped_column(String(100), default="")
    level: Mapped[str] = mapped_column(String(100), default="")
    language: Mapped[str] = mapped_column(String(16), default="en")
    duration_min: Mapped[int] = mapped_column(Integer, default=0)
    connectivity: Mapped[str] = mapped_column(String(64), default="online")  # online|offline_friendly
    accessibility: Mapped[str] = mapped_column(Text, default="")
    # canonical source + rights
    creator: Mapped[str] = mapped_column(String(255), default="")
    license: Mapped[str] = mapped_column(String(128), default="Unknown")
    attribution: Mapped[str] = mapped_column(Text, default="")
    source_url: Mapped[str] = mapped_column(Text, default="")
    imported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    # provenance honesty: hosted_local = file in this catalogue; link_only = just a link
    host_status: Mapped[str] = mapped_column(String(16), default="link_only")
    review_status: Mapped[str] = mapped_column(String(16), default="pending")  # pending|approved|takedown
    description: Mapped[str] = mapped_column(Text, default="")
    body: Mapped[str] = mapped_column(Text, default="")
    uploader_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    rights_confirmed: Mapped[str] = mapped_column(String(8), default="no")


class Adaptation(Base):
    __tablename__ = "adaptations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("resources.id"))
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    license: Mapped[str] = mapped_column(String(128), default="")
    status: Mapped[str] = mapped_column(String(16), default="draft")  # draft|published|archived
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Translation(Base):
    __tablename__ = "translations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    adaptation_id: Mapped[int] = mapped_column(ForeignKey("adaptations.id"))
    language: Mapped[str] = mapped_column(String(16))
    source_text: Mapped[str] = mapped_column(Text, default="")
    target_text: Mapped[str] = mapped_column(Text, default="")
    machine: Mapped[str] = mapped_column(String(8), default="no")  # machine drafts are labelled
    status: Mapped[str] = mapped_column(String(16), default="draft")  # draft|in_review|approved|rejected
    reviewer_note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Collection(Base):
    __tablename__ = "collections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255))
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    items_json: Mapped[str] = mapped_column(Text, default="[]")


class Rating(Base):
    __tablename__ = "ratings"
    __table_args__ = ({"sqlite_autoincrement": True},)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    resource_id: Mapped[int] = mapped_column(ForeignKey("resources.id"))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    stars: Mapped[int] = mapped_column(Integer, default=3)
    comment: Mapped[str] = mapped_column(Text, default="")
    moderated: Mapped[str] = mapped_column(String(16), default="visible")  # visible|hidden


class ModerationReport(Base):
    __tablename__ = "moderation_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    resource_id: Mapped[int] = mapped_column(ForeignKey("resources.id"))
    reporter_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="open")  # open|upheld|dismissed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(64))
    target: Mapped[str] = mapped_column(String(128))
    detail: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
