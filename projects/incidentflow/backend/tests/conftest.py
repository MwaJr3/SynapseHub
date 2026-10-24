import os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(tempfile.mkdtemp(), "if.db")

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


def _login(client, email, role="responder"):
    client.post("/api/auth/register", json={"email": email, "password": "demo-password-123", "role": role})
    r = client.post("/api/auth/login", json={"email": email, "password": "demo-password-123"})
    assert r.status_code == 200
    return client


@pytest.fixture()
def responder():
    return _login(TestClient(app), "responder@example.org", "responder")


@pytest.fixture()
def lead():
    return _login(TestClient(app), "lead@example.org", "lead")


@pytest.fixture()
def observer():
    return _login(TestClient(app), "watcher@example.org", "observer")
