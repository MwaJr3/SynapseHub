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
    monkeypatch.setenv("CAMPUSFLOW_DATA_DIR", str(data_dir))
    monkeypatch.setenv("CAMPUSFLOW_SKIP_SEED", "1")
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{data_dir / 'test.db'}")

    from app import database, main

    database.engine.dispose()
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    database.engine = create_engine(os.environ["DATABASE_URL"], connect_args={"check_same_thread": False})
    database.SessionLocal = sessionmaker(bind=database.engine, autoflush=False, expire_on_commit=False)
    database.Base.metadata.create_all(bind=database.engine)
    return main.app


def register(app, email: str, role: str, name: str = "") -> TestClient:
    client = TestClient(app)
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "strong-pass-1", "display_name": name or email.split("@")[0], "role": role},
    )
    assert response.status_code == 200
    return client


@pytest.fixture()
def admin(app_env) -> TestClient:
    return register(app_env, "admin@example.com", "admin", "Registrar")


@pytest.fixture()
def teacher(app_env) -> TestClient:
    return register(app_env, "teacher@example.com", "teacher", "Teacher One")


@pytest.fixture()
def teacher2(app_env) -> TestClient:
    return register(app_env, "teacher2@example.com", "teacher", "Teacher Two")


@pytest.fixture()
def student_user(app_env) -> TestClient:
    return register(app_env, "student@example.com", "student", "Student User")


@pytest.fixture()
def parent_user(app_env) -> TestClient:
    return register(app_env, "parent@example.com", "parent", "Parent User")


@pytest.fixture()
def scenario(app_env, admin, teacher, teacher2):
    """A school: one course, one section taught by `teacher`, one student, one enrollment."""
    student = admin.post(
        "/api/students",
        json={"first_name": "Ada", "last_name": "Sim", "enrollment_no": "T-001", "email": "student@example.com"},
    ).json()
    course = admin.post("/api/courses", json={"code": "MATH101", "title": "Math", "credit_hours": 3}).json()
    teachers = {c.get("/api/auth/me").json()["email"]: c.get("/api/auth/me").json()["id"] for c in (teacher, teacher2)}
    section = admin.post(
        "/api/sections",
        json={"course_id": course["id"], "teacher_id": teachers["teacher@example.com"], "term": "2026-Fall", "capacity": 2},
    ).json()
    other_section = admin.post(
        "/api/sections",
        json={"course_id": course["id"], "teacher_id": teachers["teacher2@example.com"], "term": "2026-Fall", "capacity": 2},
    ).json()
    enrollment = admin.post("/api/enrollments", json={"student_id": student["id"], "section_id": section["id"]}).json()
    return {
        "student": student,
        "course": course,
        "section": section,
        "other_section": other_section,
        "enrollment": enrollment,
        "teacher_id": teachers["teacher@example.com"],
        "teacher2_id": teachers["teacher2@example.com"],
    }
