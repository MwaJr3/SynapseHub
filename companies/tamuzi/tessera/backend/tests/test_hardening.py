"""Stage 6: the parts of production that are easy to leave as a promise.

Each test here corresponds to a sentence someone would otherwise have to take on
trust:

* the API sends the headers a browser relies on, and sends HSTS only where it is
  true;
* the session cookie carries the flags its configuration says it does;
* a production setup with a demo database is reported as a *problem*, with the fix
  in the message;
* `python3 -m app.preflight` exits non-zero when a check fails, so a pipeline can
  believe it.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

from app import config, preflight

BACKEND = Path(__file__).resolve().parents[1]


def test_the_api_sends_the_headers_a_browser_relies_on(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert response.headers["cross-origin-opener-policy"] == "same-origin"
    assert "camera=()" in response.headers["permissions-policy"]


def test_hsts_is_sent_over_tls_and_not_over_plain_http(client):
    from fastapi.testclient import TestClient

    from app.main import app

    assert "strict-transport-security" not in client.get("/health").headers
    with TestClient(app, base_url="https://testserver") as secure:
        assert secure.get("/health").headers["strict-transport-security"].startswith("max-age=")


def test_the_session_cookie_follows_its_configuration(client, learner, monkeypatch):
    monkeypatch.setattr(config, "SESSION_COOKIE_SECURE", True)
    monkeypatch.setattr(config, "SESSION_COOKIE_SAMESITE", "strict")
    response = client.post(
        "/api/auth/login",
        json={"email": learner, "password": "correct horse battery"},
    )
    assert response.status_code == 200
    cookie = response.headers["set-cookie"]
    assert "Secure" in cookie
    assert "SameSite=strict" in cookie.replace("samesite", "SameSite")
    assert "HttpOnly" in cookie


def test_production_with_a_demo_database_is_a_problem_not_a_surprise(monkeypatch):
    monkeypatch.setattr(config, "PRODUCTION", True)
    monkeypatch.setattr(config, "DATABASE_URL", "sqlite:///data/tessera.db")
    monkeypatch.setattr(config, "SESSION_COOKIE_SECURE", False)
    monkeypatch.setattr(config, "ALLOWED_ORIGINS", ["http://localhost:5197"])

    problems = config.production_problems()
    joined = " ".join(problems)
    assert "SQLite" in joined and "PostgreSQL" in joined
    assert "not Secure" in joined
    assert "local address" in joined
    # Every problem says what to change, not only what is wrong.
    assert all(len(problem) > 60 for problem in problems)


def test_a_production_setup_with_nothing_wrong_has_no_problems(monkeypatch):
    monkeypatch.setattr(config, "PRODUCTION", True)
    monkeypatch.setattr(config, "DATABASE_URL", "postgresql+psycopg2://tessera@db/tessera")
    monkeypatch.setattr(config, "SESSION_COOKIE_SECURE", True)
    monkeypatch.setattr(config, "ALLOWED_ORIGINS", ["https://tessera.example.test"])
    assert config.production_problems() == []


def test_a_nonsense_samesite_value_refuses_to_load():
    """A typo must stop the process, not become a cookie the browser ignores."""
    environment = {**os.environ, "TESSERA_COOKIE_SAMESITE": "sometimes"}
    result = subprocess.run(
        [sys.executable, "-c", "import app.config"],
        cwd=BACKEND,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode != 0
    assert "TESSERA_COOKIE_SAMESITE" in result.stderr


# ------------------------------------------------------------------ preflight


def test_preflight_passes_on_a_working_local_database(client):
    checks = preflight.run_checks()
    assert [check for check in checks if check.status == "fail"] == []
    names = {check.name for check in checks}
    assert {"database", "schema revision", "curriculum", "quests", "production config"} <= names
    # The data-directory check exists because SQLite writes a file; on PostgreSQL
    # there is no directory of ours to probe.
    assert ("data directory" in names) == config.DATABASE_URL.startswith("sqlite")


@pytest.mark.skipif(
    not config.DATABASE_URL.startswith("sqlite"),
    reason="create_all is only the SQLite convenience; a PostgreSQL test database was migrated",
)
def test_preflight_warns_about_create_all_instead_of_claiming_a_migrated_schema(client):
    """The SQLite test database is built with create_all, and the check says so."""
    checks = {check.name: check for check in preflight.run_checks()}
    revision = checks["schema revision"]
    assert revision.status == "warn"
    assert "create_all" in revision.detail
    assert "alembic upgrade head" in revision.fix


def test_preflight_exits_non_zero_when_a_check_fails(monkeypatch):
    failing = [preflight.Check("database", "fail", "cannot connect", "start the database")]
    monkeypatch.setattr(preflight, "run_checks", lambda: failing)
    assert preflight.main([]) == 1

    passing = [preflight.Check("database", "ok", "reachable")]
    monkeypatch.setattr(preflight, "run_checks", lambda: passing)
    assert preflight.main([]) == 0


def test_preflight_renders_the_fix_next_to_the_failure():
    text = preflight.render(
        [
            preflight.Check("database", "ok", "reachable"),
            preflight.Check("schema revision", "fail", "at 3, head is 4", "run alembic upgrade head"),
        ]
    )
    assert "FAIL  schema revision" in text
    assert "run alembic upgrade head" in text
    assert "2 checks: 1 ok, 0 warning(s), 1 failure(s)" in text


@pytest.mark.parametrize(
    "url,expected",
    [
        ("postgresql+psycopg2://tessera:sup3rsecret@db.internal/tessera", "db.internal/tessera"),
        # A password containing '@' must not defeat the split.
        ("postgresql+psycopg2://tessera:p@ss@db.internal/tessera", "db.internal/tessera"),
        ("sqlite:////var/lib/tessera/tessera.db", "sqlite:////var/lib/tessera/tessera.db"),
    ],
)
def test_preflight_never_prints_the_database_password(url, expected):
    """The one line that names the database must not contain the credential."""
    assert preflight.safe_dsn(url) == expected
