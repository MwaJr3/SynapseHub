"""Alembic environment.

The migration history is the source of truth for the schema, not
`Base.metadata.create_all()`. The app still calls `create_all` when it starts
against SQLite, because that is a single-file local convenience; every other
deployment runs `alembic upgrade head` and gets the same tables in a known order.

The database URL is read from the application config (`DATABASE_URL`, or the
SQLite default), so there is never a second copy of the connection string to keep
in step. `-x url=...` overrides it for a one-off run.
"""

from __future__ import annotations

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# Import the app so the models are registered on Base.metadata. `backend/` is the
# working directory for alembic, but a run from elsewhere must still work.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import config as app_config  # noqa: E402
from app import models  # noqa: E402,F401  (import registers the tables)
from app.database import Base  # noqa: E402

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _database_url() -> str:
    override = context.get_x_argument(as_dictionary=True).get("url")
    if override:
        return override
    # An alembic.ini value would be a second place to hide a credential; the
    # application config is the only source unless -x url= is passed explicitly.
    return app_config.DATABASE_URL


def run_migrations_offline() -> None:
    """Emit SQL instead of executing it.

    This is how the PostgreSQL DDL is checked without a server: `--sql` with a
    postgres URL prints exactly what would run.
    """
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    section = config.get_section(config.config_ini_section, {})
    section["sqlalchemy.url"] = _database_url()
    connectable = engine_from_config(section, prefix="sqlalchemy.", poolclass=pool.NullPool)

    with connectable.connect() as connection:
        is_sqlite = connection.dialect.name == "sqlite"
        if is_sqlite:
            # Batch mode rewrites a table by creating a copy, copying the rows,
            # dropping the original and renaming. With foreign keys enforced that
            # DROP fires ON DELETE CASCADE into every child table: adding a column
            # to `concepts` silently deleted all of `concept_edges`, and the
            # migration then copied nothing into the rebuilt table. PostgreSQL
            # never rebuilds for this, so the loss was SQLite-only — exactly the
            # kind of divergence that stays hidden until a real database is used.
            # Enforcement is therefore suspended for the duration and the schema
            # is checked for dangling references afterwards.
            connection.exec_driver_sql("PRAGMA foreign_keys=OFF")

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            # SQLite cannot ALTER most things, so batch mode rewrites the table.
            # It is a no-op for PostgreSQL.
            render_as_batch=is_sqlite,
        )
        with context.begin_transaction():
            context.run_migrations()

        if is_sqlite:
            # Runs outside the migration's own transaction, so it is committed
            # explicitly: the version row is written with the same connection and
            # a pending transaction here is rolled back on close.
            connection.exec_driver_sql("PRAGMA foreign_key_check").fetchall()
            connection.commit()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
