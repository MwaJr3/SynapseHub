"""Domain model: knowledge graph, learner model, and evidence.

The two central tables are `concepts` (the graph) and `concept_states` (the
learner model). Everything else is either evidence feeding the learner model
(`attempts`) or material attached to the graph (`lessons`, `questions`).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return uuid.uuid4().hex


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120), default="")
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class SessionToken(Base):
    __tablename__ = "session_tokens"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SourceRow(Base):
    """Provenance for one piece of material (see app.content for the gate)."""

    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(300))
    author: Mapped[str] = mapped_column(String(200), default="")
    url: Mapped[str] = mapped_column(String(600))
    license_class: Mapped[str] = mapped_column(String(20))
    license_name: Mapped[str] = mapped_column(String(120), default="")
    commercial_use_ok: Mapped[bool] = mapped_column(Boolean, default=False)
    attribution: Mapped[str] = mapped_column(Text, default="")
    retrieved_at: Mapped[str] = mapped_column(String(20), default="")
    #: False for catalogue entries: metadata and a link only, no reproduced text.
    holds_copy: Mapped[bool] = mapped_column(Boolean, default=True)


class Concept(Base):
    __tablename__ = "concepts"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    subject: Mapped[str] = mapped_column(String(80), index=True)
    summary: Mapped[str] = mapped_column(Text, default="")
    explanation: Mapped[str] = mapped_column(Text, default="")
    difficulty: Mapped[float] = mapped_column(Float, default=3.0)
    mastery_threshold: Mapped[float] = mapped_column(Float, default=0.75)
    #: Position used only to keep the map readable; it is not a dependency.
    ordering: Mapped[int] = mapped_column(Integer, default=0)


class ConceptEdge(Base):
    """A typed edge between concepts. `prerequisite` gates recommendations."""

    __tablename__ = "concept_edges"
    __table_args__ = (UniqueConstraint("from_concept_id", "to_concept_id", "relation"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    from_concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    to_concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    relation: Mapped[str] = mapped_column(String(20), default="prerequisite")


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    hook: Mapped[str] = mapped_column(Text, default="")
    explanation: Mapped[str] = mapped_column(Text, default="")
    example: Mapped[str] = mapped_column(Text, default="")
    application: Mapped[str] = mapped_column(Text, default="")
    recap: Mapped[str] = mapped_column(Text, default="")
    est_minutes: Mapped[int] = mapped_column(Integer, default=5)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"), nullable=True)


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    prompt: Mapped[str] = mapped_column(Text)
    choices: Mapped[list] = mapped_column(JSON, default=list)
    correct_index: Mapped[int] = mapped_column(Integer)
    explanation: Mapped[str] = mapped_column(Text, default="")
    difficulty: Mapped[float] = mapped_column(Float, default=3.0)
    #: The wrong belief this question is designed to detect.
    misconception: Mapped[str] = mapped_column(Text, default="")
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"), nullable=True)


class Attempt(Base):
    """One graded piece of evidence. Never mutated, never deleted on review."""

    __tablename__ = "attempts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    correct: Mapped[bool] = mapped_column(Boolean)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    confidence: Mapped[int] = mapped_column(Integer, default=3)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)


class ConceptState(Base):
    """The learner model for one concept."""

    __tablename__ = "concept_states"
    __table_args__ = (UniqueConstraint("user_id", "concept_id"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    mastery: Mapped[float] = mapped_column(Float, default=0.0)
    stability_days: Mapped[float] = mapped_column(Float, default=1.0)
    difficulty: Mapped[float] = mapped_column(Float, default=3.0)
    reps: Mapped[int] = mapped_column(Integer, default=0)
    lapses: Mapped[int] = mapped_column(Integer, default=0)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_review_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    concept_ids: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class ChessPuzzle(Base):
    """A tactical position. `solution_uci` is the full winning line, in UCI."""

    __tablename__ = "chess_puzzles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    fen: Mapped[str] = mapped_column(String(120))
    solution_uci: Mapped[list] = mapped_column(JSON, default=list)
    theme: Mapped[str] = mapped_column(String(80), default="tactics")
    difficulty: Mapped[float] = mapped_column(Float, default=3.0)
    concept_id: Mapped[str | None] = mapped_column(ForeignKey("concepts.id"), nullable=True)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"), nullable=True)


# --------------------------------------------------------------------- AI tutor
#
# Threads and items are stored as JSON payloads so ChatKit's own wire models can
# evolve without a migration of their internals. `owner` keeps conversations
# private: the store filters on it, so a guessed id reveals nothing.

class TutorThreadRow(Base):
    __tablename__ = "tutor_threads"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(300), default="")
    status: Mapped[str] = mapped_column(String(40), default="active")
    payload: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)


class TutorItemRow(Base):
    __tablename__ = "tutor_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    thread_id: Mapped[str] = mapped_column(ForeignKey("tutor_threads.id", ondelete="CASCADE"), index=True)
    owner: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(40), default="message")
    payload: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)


# ---------------------------------------------------------------- chess openings
#
# Opening names and ECO codes are factual reference data. Lines are stored as a
# normalised UCI sequence so a transposition (same position, different order)
# resolves to the same opening.

class OpeningRow(Base):
    __tablename__ = "openings"

    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    eco: Mapped[str] = mapped_column(String(3), index=True)
    name: Mapped[str] = mapped_column(String(200))
    family: Mapped[str] = mapped_column(String(80), index=True)
    moves_san: Mapped[str] = mapped_column(Text)
    moves_uci: Mapped[str] = mapped_column(Text, index=True)
    #: Short study note written for this project.
    idea: Mapped[str] = mapped_column(Text, default="")
    concept_id: Mapped[str | None] = mapped_column(ForeignKey("concepts.id"), nullable=True)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"), nullable=True)


class ChessAttempt(Base):
    __tablename__ = "chess_attempts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    puzzle_id: Mapped[str] = mapped_column(ForeignKey("chess_puzzles.id", ondelete="CASCADE"))
    solved: Mapped[bool] = mapped_column(Boolean, default=False)
    moves_uci: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
