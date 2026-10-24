"""Shared fixtures: isolated database + independent clients per user."""
from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def app_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("REACHLEARN_DATA_DIR", str(data_dir))
    monkeypatch.setenv("REACHLEARN_SKIP_SEED", "1")
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{data_dir / 'test.db'}")

    from app import database, main

    database.engine.dispose()
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    database.engine = create_engine(os.environ["DATABASE_URL"], connect_args={"check_same_thread": False})
    database.SessionLocal = sessionmaker(bind=database.engine, autoflush=False, expire_on_commit=False)
    database.Base.metadata.create_all(bind=database.engine)
    return main.app


def register(app, email: str, role: str = "learner", name: str = "") -> TestClient:
    client = TestClient(app)
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "strong-pass-1", "display_name": name or email.split("@")[0], "role": role},
    )
    assert response.status_code == 200
    return client


@pytest.fixture()
def client(app_env) -> TestClient:
    return TestClient(app_env)


@pytest.fixture()
def authed_client(app_env) -> TestClient:
    return register(app_env, "user@example.com")
