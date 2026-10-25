from __future__ import annotations

import os

from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

def _engine():
    url = settings.database_url
    if url.startswith("sqlite:///"):
        # ensure the data directory exists (fresh checkouts have none)
        Path(url.removeprefix("sqlite:///")).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)
        return create_engine(url, connect_args={"check_same_thread": False})

    # PostgreSQL (Supabase in production).
    #
    # Each application owns a schema: DB_SCHEMA is applied as the connection's
    # search_path so the models stay unqualified and applications can share one
    # database without seeing each other's tables. `public` stays as a fallback
    # for extensions and the Alembic version table.
    connect_args: dict[str, object] = {}
    schema = os.environ.get("DB_SCHEMA", "").strip()
    if schema:
        connect_args["options"] = f"-csearch_path={schema},public"

    # Serverless: one request per instance, so a single pooled connection is
    # enough; recycling avoids stale connections after an instance is frozen.
    return create_engine(
        url,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_size=1,
        max_overflow=0,
        pool_recycle=300,
    )


engine = _engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
