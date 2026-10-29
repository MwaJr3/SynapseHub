def test_paste_scan_triage_baseline_report(auth_client):
    r = auth_client.post("/api/projects/paste", json={
        "name": "demo-app",
        "files": [{"path": "app.py", "content": "import os\npassword = \"topsecretvalue\"\neval(x)\n"}]})
    assert r.status_code == 200
    assert r.json()["findings"] >= 2
    run_id = r.json()["run_id"]
    findings = auth_client.get(f"/api/runs/{run_id}/findings").json()["findings"]
    assert all("*" in f["evidence"] or "password" not in f["evidence"] or f["rule_id"] != "SEC-GENERIC"
               for f in findings)
    target = findings[0]
    assert auth_client.patch(f"/api/findings/{target['id']}/triage",
                             json={"triage": "suppressed", "note": "test fixture"}).json()["triage"] == "suppressed"
    # baseline suppresses the same fingerprint on a rescan
    r2 = auth_client.post("/api/projects/paste", json={
        "name": "demo-app", "project_id": r.json()["project_id"],
        "files": [{"path": "app.py", "content": "import os\npassword = \"topsecretvalue\"\neval(x)\n"}]})
    run2 = r2.json()["run_id"]
    f2 = auth_client.get(f"/api/runs/{run2}/findings?triage=suppressed").json()["findings"]
    assert any(x["rule_id"] == target["rule_id"] for x in f2)
    report = auth_client.get(f"/api/runs/{run_id}/report").json()
    assert "not proof" in report["limitations"] or "NOT proof" in report["limitations"]
    assert "never executed" in report["limitations"] or "executed" in report["limitations"]
    assert report["summary_by_severity"]


def test_archive_endpoint_enforces_limits(auth_client):
    import io, zipfile
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("../evil.py", "x")
    r = auth_client.post("/api/projects/archive?name=bad",
                         files={"file": ("bad.zip", buf.getvalue(), "application/zip")})
    assert r.status_code == 422
    assert "unsafe" in r.json()["error"]


def test_ai_review_endpoint_records_consent_and_sends_nothing(auth_client):
    r = auth_client.post("/api/projects/paste", json={
        "name": "p", "files": [{"path": "a.py", "content": "eval(x)\n"}]})
    run_id = r.json()["run_id"]
    resp = auth_client.post("/api/ai-review", json={"run_id": run_id, "consent": True})
    assert resp.status_code == 200
    body = resp.json()
    assert body["sent"] is False and body["reason"]


def test_auth_required_and_generic_errors(auth_client):
    from fastapi.testclient import TestClient
    from app.main import app
    anon = TestClient(app)
    assert anon.get("/api/projects").status_code == 401
    assert anon.post("/api/auth/login", json={"email": "x@y.z", "password": "demo-password-123"}).status_code == 401
