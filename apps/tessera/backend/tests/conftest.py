"""Test fixtures. A temporary database per session, seeded once."""
from __future__ import annotations

import os
import pathlib
import sys
import tempfile

_TMP = tempfile.mkdtemp(prefix="tessera-test-")
os.environ["TESSERA_DATA_DIR"] = _TMP
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import seed  # noqa: E402
from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _catalogue():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed.seed()
    yield


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def learner(client):
    """A signed-in learner with a unique account."""
    import uuid

    email = f"learner-{uuid.uuid4().hex[:8]}@example.test"
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "correct horse battery", "display_name": "Test Learner"},
    )
    assert response.status_code == 200, response.text
    return email
