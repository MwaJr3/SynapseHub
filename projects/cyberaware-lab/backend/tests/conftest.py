import os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(tempfile.mkdtemp(), "cal.db")

import pytest
from fastapi.testclient import TestClient
from app.db import Base, engine
from app.main import app


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def instructor(client):
    client.post("/api/auth/register", json={"email": "teach@example.org", "password": "demo-password-123",
                                            "role": "instructor", "display_name": "T. Eacher"})
    r = client.post("/api/auth/login", json={"email": "teach@example.org", "password": "demo-password-123"})
    assert r.status_code == 200
    return client


@pytest.fixture()
def learner():
    # separate client so the learner's session cookie never clobbers the instructor's
    c = TestClient(app)
    c.post("/api/auth/register", json={"email": "learn@example.org", "password": "demo-password-123",
                                       "role": "learner", "display_name": "L. Earner"})
    r = c.post("/api/auth/login", json={"email": "learn@example.org", "password": "demo-password-123"})
    assert r.status_code == 200
    return c
