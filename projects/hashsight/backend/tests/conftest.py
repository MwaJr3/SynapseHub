import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import os
os.environ.setdefault("DATABASE_URL", "sqlite:///./data/test_hashsight.db")


import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path):
    from app import config
    config.settings.database_url = f"sqlite:///{tmp_path}/t.db"
    from app import db as dbmod
    dbmod.engine = dbmod.create_engine(config.settings.database_url,
                                       connect_args={"check_same_thread": False})
    dbmod.SessionLocal.configure(bind=dbmod.engine)
    dbmod.Base.metadata.create_all(bind=dbmod.engine)
    from app.main import app
    c = TestClient(app)
    c.post("/api/auth/register", json={"email": "analyst@example.test", "password": "Str0ng!Passw0rd"})
    c.post("/api/auth/login", json={"email": "analyst@example.test", "password": "Str0ng!Passw0rd"})
    yield c

@pytest.fixture()
def auth_client(client):
    client.post("/api/auth/register", json={"email": "ops@example.org", "password": "demo-password-123"})
    r = client.post("/api/auth/login", json={"email": "ops@example.org", "password": "demo-password-123"})
    assert r.status_code == 200
    return client
