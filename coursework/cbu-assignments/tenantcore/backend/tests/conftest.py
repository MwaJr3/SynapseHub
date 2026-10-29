import os
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
RUN_POSTGRES = os.getenv("RUN_POSTGRES_TESTS") == "1"
if RUN_POSTGRES:
    # Set these before importing app modules, whose engines read settings at import time.
    os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]
    os.environ["MIGRATION_DATABASE_URL"] = os.environ["TEST_MIGRATION_DATABASE_URL"]
    os.environ["DEMO_MODE"] = "true"
    os.environ["RATE_LIMIT_FAIL_OPEN"] = "true"
    os.environ["LOGIN_RATE_LIMIT"] = "1000"
    if os.getenv("TEST_REDIS_URL"):
        os.environ["REDIS_URL"] = os.environ["TEST_REDIS_URL"]
    if os.getenv("TEST_DATABASE_ROLE"):
        os.environ["DATABASE_ROLE"] = os.environ["TEST_DATABASE_ROLE"]


def pytest_collection_modifyitems(items):
    if RUN_POSTGRES:
        return
    skip = pytest.mark.skip(
        reason="requires PostgreSQL: use docker compose and RUN_POSTGRES_TESTS=1; not a passing RLS check"
    )
    for item in items:
        if item.get_closest_marker("postgres"):
            item.add_marker(skip)


@pytest.fixture(scope="session")
def postgres_database():
    if os.getenv("TENANTCORE_TEST_ALLOW_RESET") != "YES":
        raise RuntimeError("Refusing to reset a database without TENANTCORE_TEST_ALLOW_RESET=YES")
    import psycopg

    migration_url = os.environ["TEST_MIGRATION_DATABASE_URL"].replace(
        "postgresql+psycopg://", "postgresql://"
    )
    with psycopg.connect(migration_url, autocommit=True) as connection:
        if os.getenv("TEST_DATABASE_ROLE"):
            connection.execute("RESET ROLE")
        connection.execute("DROP SCHEMA IF EXISTS public CASCADE")
        connection.execute("DROP SCHEMA IF EXISTS app CASCADE")
        connection.execute("CREATE SCHEMA public")
    env = os.environ.copy()
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"], cwd=BACKEND, env=env, check=True
    )
    subprocess.run([sys.executable, "-m", "app.demo.seed"], cwd=BACKEND, env=env, check=True)
    yield
    from app.database.session import engine

    engine.dispose()


@pytest.fixture(scope="session")
def client(postgres_database):
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def login(client) -> Callable:
    def authenticate(email: str, password: str = "DemoPass!2026") -> dict:
        response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert response.status_code == 200, response.text
        return response.json()

    return authenticate


@pytest.fixture(scope="session")
def acme_token(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "acme.admin@tenantcore.demo", "password": "DemoPass!2026"},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture(scope="session")
def globex_token(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "globex.admin@tenantcore.demo", "password": "DemoPass!2026"},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture(scope="session")
def platform_token(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "platform.admin@tenantcore.demo", "password": "PlatformAdmin!2026"},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture
def acme_headers(acme_token):
    from app.demo.ids import TENANTS

    return {"Authorization": f"Bearer {acme_token}", "X-Tenant-ID": str(TENANTS["acme"])}


@pytest.fixture
def globex_headers(globex_token):
    from app.demo.ids import TENANTS

    return {"Authorization": f"Bearer {globex_token}", "X-Tenant-ID": str(TENANTS["globex"])}


@pytest.fixture
def platform_headers(platform_token):
    return {"Authorization": f"Bearer {platform_token}"}


@pytest.fixture
def raw_database_url():
    return os.environ["TEST_DATABASE_URL"].replace("postgresql+psycopg://", "postgresql://")
