"""The write probe must stay closed unless explicitly enabled."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def test_write_probe_is_hidden_by_default(monkeypatch):
    monkeypatch.delenv("HEALTH_WRITE_PROBE", raising=False)
    response = TestClient(app).get("/health/write")
    assert response.status_code == 404
