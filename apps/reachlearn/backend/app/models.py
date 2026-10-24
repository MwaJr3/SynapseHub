"""ReachLearn ORM models."""
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
    role: Mapped[str] = mapped_column(String(32), default="learner")  # learner|educator|admin|provider_admin
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SessionToken(Base):
    __tablename__ = "session_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Cohort(Base):
    __tablename__ = "cohorts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    educator_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)


class CohortMember(Base):
    __tablename__ = "cohort_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cohort_id: Mapped[int] = mapped_column(ForeignKey("cohorts.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))


class Lesson(Base):
    """Channel-neutral micro-lesson: renders for web, SMS, USSD and IVR."""
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cohort_id: Mapped[int | None] = mapped_column(ForeignKey("cohorts.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    topic: Mapped[str] = mapped_column(String(128), default="")
    sequence: Mapped[int] = mapped_column(Integer, default=1)
    body: Mapped[str] = mapped_column(Text)
    question: Mapped[str] = mapped_column(Text, default="")
    options_json: Mapped[str] = mapped_column(Text, default="[]")
    answer_index: Mapped[int] = mapped_column(Integer, default=0)
    language: Mapped[str] = mapped_column(String(16), default="en")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    cohort_id: Mapped[int] = mapped_column(ForeignKey("cohorts.id"))
    # consent is explicit and recorded; non-essential sends require it
    consent: Mapped[str] = mapped_column(String(8), default="no")
    phone: Mapped[str] = mapped_column(String(32), default="")  # redacted in logs
    language: Mapped[str] = mapped_column(String(16), default="en")
    timezone: Mapped[str] = mapped_column(String(64), default="Africa/Lusaka")
    quiet_start: Mapped[str] = mapped_column(String(8), default="21:00")
    quiet_end: Mapped[str] = mapped_column(String(8), default="07:00")
    max_per_day: Mapped[int] = mapped_column(Integer, default=3)
    state: Mapped[str] = mapped_column(String(16), default="active")  # new|active|paused|completed|opted_out


class LearnerState(Base):
    """Per-learner delivery state machine."""
    __tablename__ = "learner_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    current_lesson_id: Mapped[int | None] = mapped_column(ForeignKey("lessons.id"), nullable=True)
    retries: Mapped[int] = mapped_column(Integer, default=0)
    completed_count: Mapped[int] = mapped_column(Integer, default=0)
    next_due_at: Mapped[str] = mapped_column(String(40), default="")


class MessageJob(Base):
    __tablename__ = "message_jobs"
    __table_args__ = ({"sqlite_autoincrement": True},)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    channel: Mapped[str] = mapped_column(String(16), default="sms")  # sms|ussd|ivr|web
    kind: Mapped[str] = mapped_column(String(32), default="lesson")  # lesson|nudge|reminder|review
    body: Mapped[str] = mapped_column(Text)
    # queued | sent | delivered | failed | unknown
    state: Mapped[str] = mapped_column(String(16), default="queued")
    simulator: Mapped[str] = mapped_column(String(8), default="yes")
    provider_uid: Mapped[str] = mapped_column(String(64), default="", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class DeliveryReceipt(Base):
    __tablename__ = "delivery_receipts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("message_jobs.id"))
    status: Mapped[str] = mapped_column(String(16))
    provider_uid: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class WebhookEvent(Base):
    """Provider callbacks — provider_uid unique so retries are idempotent."""
    __tablename__ = "webhook_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider_uid: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    processed: Mapped[str] = mapped_column(String(8), default="no")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
