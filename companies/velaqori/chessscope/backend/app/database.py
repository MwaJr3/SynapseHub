"""Database engine and session factory (SQLite locally, Postgres via DATABASE_URL + DB_SCHEMA)."""
from __future__ import annotations

import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from . import config


def _normalise_url(url: str) -> str:
    """Route every Postgres spelling to the installed psycopg2 driver."""
    for prefix in ("postgresql+psycopg://", "postgresql+psycopg2://", "postgresql://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql+psycopg2://" + url[len(prefix):]
    return url


URL = _normalise_url(config.DATABASE_URL)
SCHEMA = os.environ.get("DB_SCHEMA", "").strip()
IS_SQLITE = URL.startswith("sqlite")

if IS_SQLITE:
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    engine = create_engine(URL, connect_args={"check_same_thread": False})
else:
    connect_args: dict[str, object] = {}
    if SCHEMA:
        connect_args["options"] = f"-csearch_path={SCHEMA},public"
    engine = create_engine(URL, connect_args=connect_args, pool_pre_ping=True,
                           pool_size=1, max_overflow=0, pool_recycle=300)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


if SCHEMA and not IS_SQLITE:
    # Poolers may drop search_path options; qualify tables explicitly.
    Base.metadata.schema = SCHEMA


def create_all() -> None:
    if SCHEMA and not IS_SQLITE:
        with engine.begin() as conn:
            conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{SCHEMA}"'))
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
