"""Role enforcement tests: admin, analyst, viewer."""


def test_viewer_is_read_only(viewer, admin, scenario):
    # reads work
    assert viewer.get("/api/events").status_code == 200
    assert viewer.get("/api/incidents").status_code == 200
    assert viewer.get("/api/dashboard").status_code == 200
    # writes do not
    assert viewer.post("/api/events", json={"occurred_at": "t", "summary": "s"}).status_code == 403
    assert viewer.post("/api/incidents", json={"title": "x"}).status_code == 403
    assert viewer.post("/api/rules/evaluate").status_code == 403
    assert viewer.post(f"/api/incidents/{scenario['incident']['id']}/transition", json={"status": "triaged"}).status_code == 403
    assert viewer.patch(f"/api/alerts/1", json={"note": "x"}).status_code == 403


def test_analyst_works_incidents_but_cannot_admin(analyst, admin, scenario):
    inc_id = scenario["incident"]["id"]
    assert analyst.post(f"/api/incidents/{inc_id}/transition", json={"status": "triaged"}).status_code == 200
    assert analyst.post("/api/incidents", json={"title": "A"}).status_code == 200
    assert analyst.post("/api/events", json={"occurred_at": "t", "summary": "s"}).status_code == 200
    assert analyst.post("/api/rules/evaluate").status_code == 200
    # admin-only:
    assert analyst.post("/api/rules", json={"name": "n", "category_match": "x"}).status_code == 403
    assert analyst.patch("/api/users/1/role", json={"role": "admin"}).status_code == 403
    assert analyst.get("/api/audit").status_code == 403


def test_admin_only_audit_and_roles(admin, analyst, scenario):
    assert admin.get("/api/audit").status_code == 200
    analyst_id = analyst.get("/api/auth/me").json()["id"]
    assert admin.patch(f"/api/users/{analyst_id}/role", json={"role": "viewer"}).status_code == 200
    # role change takes effect
    assert analyst.post("/api/incidents", json={"title": "x"}).status_code == 403


def test_self_register_is_viewer(admin):
    from fastapi.testclient import TestClient
    from app import main

    client = TestClient(main.app)
    client.post("/api/auth/register", json={"email": "new@example.com", "password": "strong-pass-1"})
    me = client.get("/api/auth/me").json()
    assert me["role"] == "viewer"


def test_requires_authentication(admin):
    from fastapi.testclient import TestClient
    from app import main

    anon = TestClient(main.app)
    assert anon.get("/api/events").status_code == 401
    assert anon.get("/api/dashboard").status_code == 401


def test_mutations_are_audited(admin, scenario):
    admin.post("/api/incidents", json={"title": "Audited incident"})
    actions = {e["action"] for e in admin.get("/api/audit").json()}
    assert "incident.create" in actions
    assert "event.create" in actions
    assert "rule.create" in actions


def test_demo_seed_works_end_to_end(app_env):
    """The seeded demo dataset must work reliably (flagship requirement)."""
    from app.seed import seed

    result = seed()
    assert result["skipped"] is False
    assert result["events"] == 7 and result["rules"] == 3

    from fastapi.testclient import TestClient

    client = TestClient(app_env)
    client.post("/api/auth/login", json={"email": "demo.admin@sentinelcore.example", "password": "demo-password-123"})
    dashboard = client.get("/api/dashboard").json()
    assert dashboard["demo_data"] is True
    assert dashboard["events"] == 7
    assert dashboard["incidents_by_status"]["triaged"] == 1
    incidents = client.get("/api/incidents").json()
    assert incidents and "not proof of an attack" in incidents[0]["description"]
    events = client.get("/api/events").json()
    assert any("simulated" in e["summary"].lower() or "Simulated" in str(e) for e in events)
