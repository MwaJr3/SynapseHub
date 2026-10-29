from fastapi.testclient import TestClient

from app.main import app


def test_health_validation_and_consistent_errors_do_not_need_database():
    client = TestClient(app)
    assert client.get("/health/live").json() == {"status": "ok"}
    unauthenticated = client.get("/api/v1/projects")
    assert unauthenticated.status_code == 401
    assert unauthenticated.json()["error"]["code"] == "AUTH_REQUIRED"
    invalid = client.post("/api/v1/auth/login", json={})
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "VALIDATION_ERROR"
    assert "password" not in invalid.text.lower() or "field required" in invalid.text.lower()


def test_openapi_contains_versioned_resources():
    client = TestClient(app)
    paths = client.get("/openapi.json").json()["paths"]
    assert "/api/v1/projects" in paths
    assert "/api/v1/tasks" in paths
    assert "/api/v1/auth/login" in paths
