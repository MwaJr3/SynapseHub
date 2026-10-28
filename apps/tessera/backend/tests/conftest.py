"""Test fixtures. A temporary database per session, seeded once."""
from __future__ import annotations

import os
import pathlib
import sys
import tempfile

_TMP = tempfile.mkdtemp(prefix="tessera-test-")
os.environ["TESSERA_DATA_DIR"] = _TMP
# The transcribed baseline is a demo affordance, off by default. Most profile
# tests exercise loading it; the test that checks the disabled state removes it.
os.environ["TESSERA_DEMO_BASELINE"] = "1"
# The quizzes the profile links to are configuration; set them so the payload is
# exercised, and let the tests that care about "unconfigured" remove them.
os.environ["TESSERA_QUIZ_LEARNER_TYPE_URL"] = "https://quiz.icanstudy.com/learner-type"
os.environ["TESSERA_QUIZ_DIAGNOSTIC_URL"] = "https://quiz.icanstudy.com/learning-diagnostic"
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
