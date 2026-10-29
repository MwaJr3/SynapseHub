"""Shared fixtures: isolated temp database + independent test clients per user."""
from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def app_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "manifests").mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("DEPENDSECURE_DATA_DIR", str(data_dir))
    monkeypatch.setenv("DEPENDSECURE_UPLOAD_DIR", str(data_dir / "manifests"))
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{data_dir / 'test.db'}")

    from app import database, main

    database.engine.dispose()
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    database.engine = create_engine(os.environ["DATABASE_URL"], connect_args={"check_same_thread": False})
    database.SessionLocal = sessionmaker(bind=database.engine, autoflush=False, expire_on_commit=False)
    database.Base.metadata.create_all(bind=database.engine)
    return main.app


def _register_client(app, email: str, password: str, name: str) -> TestClient:
    client = TestClient(app)
    response = client.post("/api/auth/register", json={"email": email, "password": password, "display_name": name})
    assert response.status_code == 200
    return client


@pytest.fixture()
def client(app_env) -> TestClient:
    return TestClient(app_env)


@pytest.fixture()
def authed_client(app_env) -> TestClient:
    return _register_client(app_env, "dev@example.com", "strong-pass-1", "Dev")


@pytest.fixture()
def second_client(app_env) -> TestClient:
    return _register_client(app_env, "other@example.com", "strong-pass-2", "Other")


@pytest.fixture()
def project(authed_client: TestClient) -> int:
    response = authed_client.post("/api/projects", json={"name": "svc", "description": "", "repository_ref": ""})
    assert response.status_code == 200
    return response.json()["id"]


def upload_manifest(client: TestClient, project_id: int, filename: str, content: bytes) -> int:
    response = client.post(f"/api/projects/{project_id}/manifests", files={"file": (filename, content, "text/plain")})
    assert response.status_code == 200
    return response.json()["id"]
