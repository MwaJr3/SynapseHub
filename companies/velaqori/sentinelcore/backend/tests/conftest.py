"""Shared fixtures: isolated database + independent clients per role."""
from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def app_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("SENTINELCORE_DATA_DIR", str(data_dir))
    monkeypatch.setenv("SENTINELCORE_SKIP_SEED", "1")
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{data_dir / 'test.db'}")

    from app import database, main

    database.engine.dispose()
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    database.engine = create_engine(os.environ["DATABASE_URL"], connect_args={"check_same_thread": False})
    database.SessionLocal = sessionmaker(bind=database.engine, autoflush=False, expire_on_commit=False)
    database.Base.metadata.create_all(bind=database.engine)
    return main.app


def register(app, email: str) -> TestClient:
    client = TestClient(app)
    response = client.post(
        "/api/auth/register", json={"email": email, "password": "strong-pass-1", "display_name": email.split("@")[0]}
    )
    assert response.status_code == 200
    return client


def set_role(client: TestClient, user_id: int, role: str) -> None:
    # Direct DB update: the API path is exercised in test_authz; fixtures must
    # not depend on an admin already existing (bootstrap problem).
    from app.database import SessionLocal
    from app.models import User

    db = SessionLocal()
    user = db.get(User, user_id)
    user.role = role
    db.commit()
    db.close()


@pytest.fixture()
def admin(app_env) -> TestClient:
    client = register(app_env, "admin@example.com")
    set_role(client, client.get("/api/auth/me").json()["id"], "admin")
    return client


@pytest.fixture()
def analyst(app_env) -> TestClient:
    client = register(app_env, "analyst@example.com")
    set_role(client, client.get("/api/auth/me").json()["id"], "analyst")
    return client


@pytest.fixture()
def viewer(app_env) -> TestClient:
    return register(app_env, "viewer@example.com")  # default role


@pytest.fixture()
def scenario(admin):
    """One rule, two events (one matches), one incident in 'new'."""
    rule = admin.post(
        "/api/rules",
        json={"name": "Failures", "category_match": "auth", "summary_contains": "failed", "severity": "medium"},
    )
    assert rule.status_code == 200
    matching = admin.post(
        "/api/events",
        json={"occurred_at": "2026-10-23T10:00:00Z", "category": "auth", "summary": "Failed sign-in burst", "severity": "low"},
    ).json()
    other = admin.post(
        "/api/events",
        json={"occurred_at": "2026-10-23T11:00:00Z", "category": "network", "summary": "Benign traffic", "severity": "low"},
    ).json()
    incident = admin.post(
        "/api/incidents",
        json={"title": "Test incident", "description": "d", "severity": "high", "event_ids": [matching["id"]]},
    ).json()
    return {"matching": matching, "other": other, "incident": incident}
