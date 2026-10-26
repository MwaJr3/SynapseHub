import os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(tempfile.mkdtemp(), "ti.db")

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
def auth_client():
    c = TestClient(app)
    c.post("/api/auth/register", json={"email": "analyst@example.org", "password": "demo-password-123"})
    r = c.post("/api/auth/login", json={"email": "analyst@example.org", "password": "demo-password-123"})
    assert r.status_code == 200
    return c
