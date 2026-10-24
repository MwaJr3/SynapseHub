def bootstrap(auth_client):
    auth_client.post("/api/allowlist", json={"entry": "10.10.0.0/24", "note": "lab range"})
    auth_client.post("/api/assets", json={"hostname": "10.10.0.5", "importance": "high",
                                          "environment": "lab", "owner_name": "team-a"})
    return "10.10.0.5"


def test_scan_requires_allowlist(auth_client):
    target = bootstrap(auth_client)
    r = auth_client.post("/api/scans", json={"targets": ["evil.example.com"], "adapter": "simulated"})
    assert r.status_code == 403
    assert "allowlist" in r.json()["error"]
    audit = auth_client.get("/api/audit").json()["events"]
    assert any(e["action"] == "scan.refused" for e in audit)


def test_scan_and_observations_and_diff(auth_client):
    target = bootstrap(auth_client)
    r1 = auth_client.post("/api/scans", json={"targets": [target], "adapter": "simulated"})
    assert r1.status_code == 200
    assert "SIMULATED" in r1.json()["runs"][0]["limitations"]
    run1 = r1.json()["runs"][0]["id"]
    rows = auth_client.get(f"/api/scans/{run1}/observations").json()["observations"]
    assert {o["port"] for o in rows} >= {22, 80}
    r2 = auth_client.post("/api/scans", json={"targets": [target], "adapter": "import",
        "rows": [{"port": 443, "service": "https", "version": "nginx"}]})
    run2 = r2.json()["runs"][0]["id"]
    d = auth_client.get(f"/api/diff?base_run_id={run2}&compare_run_id={run1}").json()
    assert any(o["port"] == 443 for o in d["newly_observed"])
    assert any(o["port"] == 80 for o in d["no_longer_observed"])


def test_findings_remediation_and_dashboard(auth_client):
    bootstrap(auth_client)
    r = auth_client.post("/api/findings", json={"target": "10.10.0.5", "port": 6379,
        "service": "redis", "severity": "high", "exposure": "internal",
        "business_importance": "critical"})
    tid = auth_client.post("/api/remediation", json={"finding_id": r.json()["id"],
        "owner_name": "team-a", "note": "bind to localhost + firewall"}).json()["id"]
    assert auth_client.patch(f"/api/remediation/{tid}?status=done").json()["status"] == "done"
    dash = auth_client.get("/api/dashboard").json()
    assert dash["assets"] == 1 and dash["open_findings"] == 1


def test_import_requires_rows_and_viewer_role_is_enforced(auth_client):
    target = bootstrap(auth_client)
    assert auth_client.post("/api/scans", json={"targets": [target], "adapter": "import"}).status_code == 422
    # create a second user with viewer role via register is admin; simulate role change
    from app.db import SessionLocal
    from app.models import User
    db = SessionLocal()
    db.query(User).update({"role": "viewer"})
    db.commit(); db.close()
    assert auth_client.post("/api/allowlist", json={"entry": "x"}).status_code == 403
