"""Set isolated test configuration before importing any application module."""

# ruff: noqa: E402
import os
import tempfile
from pathlib import Path

# This opt-in is deliberately separate from DATABASE_URL: tests erase their DB.
external_db = os.environ.get("TW_TEST_DATABASE_URL")
if external_db:
    from sqlalchemy.engine import make_url

    if not (make_url(external_db).database or "").endswith("_test"):
        raise RuntimeError("TW_TEST_DATABASE_URL must point to a disposable database ending in _test.")
os.environ["DATABASE_URL"] = external_db or "sqlite:///" + str(Path(tempfile.mkdtemp(prefix="transcriptwise-tests-")) / "test.db")
os.environ["APP_ENV"] = "test"
os.environ["COOKIE_SECURE"] = "false"
os.environ["ALLOWED_HOSTS"] = "testserver,127.0.0.1,localhost"
os.environ["ALLOWED_ORIGINS"] = "http://testserver"
os.environ["MAX_TRANSCRIPT_CHARS"] = "300000"
os.environ["MAX_UPLOAD_BYTES"] = "2000000"
os.environ["AI_CHUNK_CHARS"] = "18000"
os.environ["WORKER_ENABLED"] = "false"
os.environ["AI_PROVIDER"] = "local"
os.environ["YOUTUBE_ACCESS_TOKEN"] = ""
os.environ["YOUTUBE_REFRESH_TOKEN"] = ""
os.environ["YOUTUBE_ALLOWED_VIDEO_IDS"] = ""
os.environ["REQUESTS_PER_MINUTE"] = "10000"
os.environ["EXPENSIVE_REQUESTS_PER_HOUR"] = "10000"

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import delete
from app.db import Base, SessionLocal
from app.main import app
from app.security import limiter


@pytest.fixture(scope="session", autouse=True)
def migrated_database():
    command.upgrade(Config(str(Path(__file__).resolve().parents[1] / "alembic.ini")), "head")


@pytest.fixture(autouse=True)
def clean_database(migrated_database):
    limiter.buckets.clear()
    with SessionLocal() as db:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(delete(table))
        db.commit()


def initialized_client():
    client = TestClient(app)
    response = client.get("/api/v1/session")
    assert response.status_code == 200
    client.headers["X-CSRF-Token"] = response.json()["csrf_token"]
    return client


@pytest.fixture
def client():
    with initialized_client() as value:
        yield value
