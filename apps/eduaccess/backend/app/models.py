"""EduAccess ORM models."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    # learner | provider | reviewer | finance | admin | sponsor
    role: Mapped[str] = mapped_column(String(32), default="learner")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SessionToken(Base):
    __tablename__ = "session_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255))
    provider: Mapped[str] = mapped_column(String(255), default="")
    description: Mapped[str] = mapped_column(Text, default="")


class AccessPlan(Base):
    """free | subsidized | scholarship | sponsor | paid"""
    __tablename__ = "access_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"))
    kind: Mapped[str] = mapped_column(String(32))
    price: Mapped[float] = mapped_column(Float, default=0.0)
    evidence_required: Mapped[str] = mapped_column(Text, default="")
    window_start: Mapped[str] = mapped_column(String(40), default="")
    window_end: Mapped[str] = mapped_column(String(40), default="")
    active: Mapped[str] = mapped_column(String(8), default="yes")


class FundingPool(Base):
    __tablename__ = "funding_pools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    sponsor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    seats_total: Mapped[int] = mapped_column(Integer, default=0)
    seats_committed: Mapped[int] = mapped_column(Integer, default=0)
    cash_total: Mapped[float] = mapped_column(Float, default=0.0)
    criteria: Mapped[str] = mapped_column(Text, default="")
    window_start: Mapped[str] = mapped_column(String(40), default="")
    window_end: Mapped[str] = mapped_column(String(40), default="")


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uid: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    learner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("access_plans.id"))
    statement: Mapped[str] = mapped_column(Text, default="")  # minimal data: no sensitive documents in demo
    # submitted | needs_info | under_review | approved | waitlisted | declined |
    # enrolled | completed | withdrawn
    status: Mapped[str] = mapped_column(String(16), default="submitted")
    decision_reason: Mapped[str] = mapped_column(Text, default="")
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    pool_id: Mapped[int | None] = mapped_column(ForeignKey("funding_pools.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SeatAllocation(Base):
    __tablename__ = "seat_allocations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"))
    pool_id: Mapped[int] = mapped_column(ForeignKey("funding_pools.id"))
    seats: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Transaction(Base):
    """Financial ledger. pending is NOT settled; reversals are distinct rows."""
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pool_id: Mapped[int | None] = mapped_column(ForeignKey("funding_pools.id"), nullable=True)
    kind: Mapped[str] = mapped_column(String(32))  # payment | invoice | refund | reversal
    amount: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(16), default="pending")  # pending | settled | reversed
    reference: Mapped[str] = mapped_column(String(64), default="")
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Appeal(Base):
    __tablename__ = "appeals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"))
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="open")  # open | upheld | denied
    decision_note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(64))
    target: Mapped[str] = mapped_column(String(128))
    detail: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
