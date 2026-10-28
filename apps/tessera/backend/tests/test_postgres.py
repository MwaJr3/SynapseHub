"""The PostgreSQL path, executed against a real server.

Most of the suite runs on SQLite because that is what a checkout has. That is
precisely the problem: SQLite accepts a great deal that PostgreSQL refuses, and a
schema that has only ever been rendered as DDL has not been run. Stage 4 made
PostgreSQL the target, so this file runs the migration history against an actual
server and inspects what the server built.

It is opt-in, because a test that needs a database server cannot pretend to run
without one:

    export TESSERA_POSTGRES_URL='postgresql+psycopg2://postgres:@/scratch?host=/tmp/pgdata'
    python -m pytest tests/test_postgres.py -q

The URL points at a *scratch* database. The test creates a uniquely named database
on the same server, migrates it, inspects it, and drops it, so it never touches the
database in the URL itself.

When the variable is not set the tests skip with a message that says what is not
being proved, rather than passing silently.
"""

from __future__ import annotations

import os
import subprocess
import sys
import uuid
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
URL_ENV = "TESSERA_POSTGRES_URL"

pytestmark = pytest.mark.skipif(
    not os.environ.get(URL_ENV),
    reason=(
        f"{URL_ENV} is not set, so the live PostgreSQL path is not exercised: "
        "jsonb column types, the named CHECK constraints and `alembic check` "
        "against a real server remain unproved in this run."
    ),
)

#: Columns that must be `jsonb`, not `json`. `json` keeps text and re-parses on
#: every read; `jsonb` is decomposed and indexable.
JSONB_COLUMNS = (
    ("questions", "choices"),
    ("goals", "concept_ids"),
    ("chess_puzzles", "solution_uci"),
    ("chess_attempts", "moves_uci"),
    ("learning_sessions", "activities"),
)

#: Every CHECK the two stage-4 revisions add. A constraint that exists in the model
#: but not in the server is documentation, so the names are asserted individually.
STAGE_FOUR_CHECKS = (
    "ck_attempts_confidence_range",
    "ck_attempts_latency_non_negative",
    "ck_concept_edges_relation_vocabulary",
    "ck_concept_states_counts_non_negative",
    "ck_concept_states_difficulty_range",
    "ck_concept_states_mastery_range",
    "ck_concept_states_stability_positive",
    "ck_concepts_difficulty_range",
    "ck_concepts_threshold_range",
    "ck_learning_sessions_minutes_spent",
    "ck_learning_sessions_planned_minutes",
    "ck_learning_sessions_status",
    "ck_questions_correct_index",
    "ck_questions_difficulty_range",
    "ck_retrieval_graded_by",
    "ck_retrieval_latency_non_negative",
    "ck_retrieval_score_range",
    "ck_retrieval_weight_range",
    "ck_assessments_not_self_superseding",
    "ck_assessments_reported_by",
    "ck_assessments_scale_order",
)


def _connect(dbname: str):
    psycopg2 = pytest.importorskip("psycopg2", reason="psycopg2 is needed to inspect a scratch database")
    from sqlalchemy.engine import make_url

    url = make_url(os.environ[URL_ENV])
    kwargs: dict[str, object] = {"dbname": dbname, "user": url.username or "postgres"}
    if url.password:
        kwargs["password"] = url.password
    # A unix-socket connection puts the directory in the query string, not in `host`.
    host = url.query.get("host") or url.host
    if host:
        kwargs["host"] = host
    if url.port:
        kwargs["port"] = url.port
    connection = psycopg2.connect(**kwargs)
    connection.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
    return connection


def _scratch_url() -> tuple[str, str]:
    from sqlalchemy.engine import make_url

    base = make_url(os.environ[URL_ENV])
    name = f"tessera_test_{uuid.uuid4().hex[:10]}"
    scratch = base.set(database=name)
    return name, scratch.render_as_string(hide_password=False)


def _alembic(*args: str, database_url: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=BACKEND,
        env={**os.environ, "DATABASE_URL": database_url},
        capture_output=True,
        text=True,
        timeout=300,
    )


@pytest.fixture(scope="module")
def server():
    """A scratch database, migrated to head, dropped afterwards."""
    name, scratch = _scratch_url()
    admin = _connect("postgres")
    with admin.cursor() as cursor:
        cursor.execute(f'create database "{name}"')
    try:
        result = _alembic("upgrade", "head", database_url=scratch)
        assert result.returncode == 0, result.stderr
        yield {"name": name, "url": scratch, "connect": lambda: _connect(name)}
    finally:
        with admin.cursor() as cursor:
            cursor.execute(f'drop database if exists "{name}" with (force)')
        admin.close()


def test_the_history_reaches_head_on_a_live_server(server):
    result = _alembic("current", database_url=server["url"])
    assert result.returncode == 0, result.stderr
    assert "head" in (result.stdout + result.stderr)


def test_the_server_agrees_the_schema_has_not_drifted(server):
    """This is the check that fails when a model change never became a revision."""
    result = _alembic("check", database_url=server["url"])
    assert result.returncode == 0, result.stdout + result.stderr
    assert "No new upgrade operations detected" in (result.stdout + result.stderr)


def test_every_list_column_is_jsonb_and_not_json(server):
    connection = server["connect"]()
    try:
        cursor = connection.cursor()
        for table, column in JSONB_COLUMNS:
            cursor.execute(
                "select data_type from information_schema.columns "
                "where table_schema = 'public' and table_name = %s and column_name = %s",
                (table, column),
            )
            row = cursor.fetchone()
            assert row is not None, f"{table}.{column} does not exist"
            assert row[0] == "jsonb", f"{table}.{column} is {row[0]}, not jsonb"
        cursor.close()
    finally:
        connection.close()


def test_every_stage_four_check_exists_on_the_server(server):
    connection = server["connect"]()
    try:
        with connection.cursor() as cursor:
            cursor.execute("select conname from pg_constraint where contype = 'c'")
            present = {row[0] for row in cursor.fetchall()}
    finally:
        connection.close()
    missing = [name for name in STAGE_FOUR_CHECKS if name not in present]
    assert not missing, f"checks declared but not enforced on the server: {missing}"


def test_the_server_refuses_a_score_outside_the_unit_interval(server):
    """The same rule the SQLite run proves, proved on the engine that ships."""
    connection = server["connect"]()
    with connection.cursor() as cursor:
        cursor.execute(
            "insert into concepts (id, title, subject, summary, explanation, difficulty, mastery_threshold, ordering)"
            " values ('pg.rules', 'PG', 'Test', '', '', 3.0, 0.75, 0) on conflict (id) do nothing"
        )
        cursor.execute(
            "insert into users (id, email, display_name, password_hash, created_at)"
            " values ('pg-user', 'pg@example.test', '', 'x', now()) on conflict (id) do nothing"
        )
    with connection.cursor() as cursor:
        try:
            cursor.execute(
                "insert into retrieval_attempts"
                " (id, user_id, concept_id, prompt_id, prompt_text, format, answer_text, expected,"
                "  score, evidence_weight, graded_by, correct, latency_ms, created_at)"
                " values ('pg-bad', 'pg-user', 'pg.rules', 'p#cloze#0', '_____', 'cloze', 'x', 'y',"
                "         1.4, 1.0, 'auto', false, 0, now())"
            )
        except Exception as error:  # psycopg2.errors.CheckViolation without importing it
            assert "ck_retrieval_score_range" in str(error)
        else:  # pragma: no cover - the constraint exists
            pytest.fail("PostgreSQL accepted a retrieval score of 1.4")
    connection.close()


def test_the_reassessment_column_and_its_unique_key_exist(server):
    connection = server["connect"]()
    with connection.cursor() as cursor:
        cursor.execute(
            "select data_type, is_nullable from information_schema.columns "
            "where table_schema = 'public' and table_name = 'assessments' and column_name = 'supersedes_id'"
        )
        column = cursor.fetchone()
        assert column is not None, "assessments.supersedes_id is missing"
        assert column[0] == "character varying" and column[1] == "YES"
        cursor.execute("select conname from pg_constraint where conname = 'uq_assessments_supersedes'")
        assert cursor.fetchone() is not None
    connection.close()


def test_the_migration_round_trips_on_the_server(server):
    """Down one revision and back up: a downgrade that cannot run is not a
    downgrade, and this is the only place the PostgreSQL branch is exercised."""
    down = _alembic("downgrade", "-1", database_url=server["url"])
    assert down.returncode == 0, down.stderr
    up = _alembic("upgrade", "head", database_url=server["url"])
    assert up.returncode == 0, up.stderr
    check = _alembic("check", database_url=server["url"])
    assert check.returncode == 0, check.stdout + check.stderr
