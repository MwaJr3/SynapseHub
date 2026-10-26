"""The migration history must build the schema the models describe.

`Base.metadata.create_all()` is convenient and completely useless as a record of
what changed: it silently produces whatever the models say today, so a database
built three months ago and one built this morning can differ while both look
healthy. These tests run the real Alembic history against an empty database and
compare the result with the models.

They also check the PostgreSQL path without a PostgreSQL server: `--sql` renders
the DDL, which proves the history is executable on that dialect. It does *not*
prove the app has ever run against a live PostgreSQL — that claim would need a
server, and there is none in this environment.
"""

from __future__ import annotations

import os
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest

from app import config
from app.database import Base

BACKEND = Path(__file__).resolve().parents[1]


def _alembic(*args: str, database_url: str) -> subprocess.CompletedProcess[str]:
    environment = {**os.environ, "DATABASE_URL": database_url}
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=BACKEND,
        env=environment,
        capture_output=True,
        text=True,
        timeout=180,
    )


@pytest.fixture()
def migrated(tmp_path):
    url = f"sqlite:///{tmp_path / 'migrated.db'}"
    result = _alembic("upgrade", "head", database_url=url)
    assert result.returncode == 0, result.stderr
    return tmp_path / "migrated.db"


def test_the_history_builds_every_table_the_models_declare(migrated):
    connection = sqlite3.connect(migrated)
    built = {row[0] for row in connection.execute("select name from sqlite_master where type='table'")}
    expected = set(Base.metadata.tables)
    missing = expected - built
    assert not missing, f"migrations do not create: {sorted(missing)}"
    # The version table is Alembic's, not the domain's.
    assert built - expected == {"alembic_version"}


def test_the_migrated_schema_has_not_drifted_from_the_models(migrated):
    """`alembic check` fails when a model change was never written into a revision.

    This is the test that stops "it works on my machine because create_all ran"
    from being the way a schema change ships.
    """
    result = _alembic("check", database_url=f"sqlite:///{migrated}")
    assert result.returncode == 0, result.stdout + result.stderr
    assert "No new upgrade operations detected" in (result.stdout + result.stderr)


def test_the_history_runs_on_a_fresh_database_twice_without_complaint(migrated):
    """A second upgrade is a no-op, not an error: deploys re-run their migrations."""
    result = _alembic("upgrade", "head", database_url=f"sqlite:///{migrated}")
    assert result.returncode == 0, result.stderr


def test_the_history_renders_postgresql_ddl_without_a_server():
    result = _alembic("upgrade", "head", "--sql", database_url="postgresql://u:p@localhost/tessera")
    assert result.returncode == 0, result.stderr
    ddl = result.stdout
    assert "CREATE TABLE users" in ddl
    assert "CREATE TABLE assessment_scores" in ddl
    # Sequences/autoincrement must not leak in from the SQLite dialect.
    assert "AUTOINCREMENT" not in ddl
    # JSON columns stay JSON rather than degrading to TEXT.
    assert "JSON" in ddl


def test_a_bare_postgres_url_is_given_an_installed_driver():
    """`postgresql://` alone resolves to psycopg 3 on SQLAlchemy 2.1, which is absent.

    The failure looks like a database outage, so the URL is normalised instead of
    documented around.
    """
    assert config.normalise_database_url("postgresql://u:p@host/db") == "postgresql+psycopg2://u:p@host/db"
    assert config.normalise_database_url("postgres://u:p@host/db") == "postgresql+psycopg2://u:p@host/db"
    # Explicit drivers are respected, and SQLite is untouched.
    assert config.normalise_database_url("postgresql+psycopg://u@h/d") == "postgresql+psycopg://u@h/d"
    assert config.normalise_database_url("sqlite:///data/tessera.db") == "sqlite:///data/tessera.db"


def test_a_migrated_database_can_be_seeded_and_read(tmp_path):
    """The history is only useful if the app works on top of it."""
    database = tmp_path / "fresh.db"
    url = f"sqlite:///{database}"
    assert _alembic("upgrade", "head", database_url=url).returncode == 0

    environment = {**os.environ, "DATABASE_URL": url, "TESSERA_DATA_DIR": str(tmp_path)}
    seeded = subprocess.run(
        [sys.executable, "-m", "app.seed"],
        cwd=BACKEND,
        env=environment,
        capture_output=True,
        text=True,
        timeout=300,
    )
    assert seeded.returncode == 0, seeded.stderr

    connection = sqlite3.connect(database)
    concepts = connection.execute("select count(*) from concepts").fetchone()[0]
    sources = connection.execute("select count(*) from sources").fetchone()[0]
    assert concepts >= 10
    assert sources >= 1
