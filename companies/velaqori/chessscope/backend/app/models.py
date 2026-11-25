"""ChessScope ORM models."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SessionToken(Base):
    __tablename__ = "session_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Game(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uid: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    white: Mapped[str] = mapped_column(String(255), default="")
    black: Mapped[str] = mapped_column(String(255), default="")
    result: Mapped[str] = mapped_column(String(16), default="*")
    headers_json: Mapped[str] = mapped_column(Text, default="{}")
    pgn_text: Mapped[str] = mapped_column(Text)
    analysis_json: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Mistake(Base):
    """One recorded inaccuracy/mistake/blunder from an engine-classified game.

    Immutable evidence row: game, move, evaluation context and theme category.
    Re-analysis of a game replaces that game's rows (never duplicates).
    """
    __tablename__ = "mistakes"
    __table_args__ = ({"sqlite_autoincrement": True},)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"))
    ply: Mapped[int] = mapped_column(Integer)
    san: Mapped[str] = mapped_column(String(16))
    classification: Mapped[str] = mapped_column(String(16))  # inaccuracy | mistake | blunder
    eval_drop_cp: Mapped[int] = mapped_column(Integer, default=0)
    phase: Mapped[str] = mapped_column(String(16), default="middlegame")
    category: Mapped[str] = mapped_column(String(32), default="positional")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class OpeningCard(Base):
    """One opening line a learner is drilling, with its spaced-repetition memory state."""
    __tablename__ = "opening_cards"
    __table_args__ = (UniqueConstraint("user_id", "opening_id", "side", name="uq_card_user_opening_side"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    opening_id: Mapped[int] = mapped_column(Integer)
    side: Mapped[str] = mapped_column(String(5))  # white | black: which side the learner plays
    stability: Mapped[float] = mapped_column(Float, default=1.0)
    difficulty: Mapped[float] = mapped_column(Float, default=3.0)
    reps: Mapped[int] = mapped_column(Integer, default=0)
    lapses: Mapped[int] = mapped_column(Integer, default=0)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
