"""API: auth, analyze flows, verdict states, CRUD, reports, retention."""
from __future__ import annotations

import base64


def test_auth_required(client):
    import app.main as m
    from fastapi.testclient import TestClient
    anon = TestClient(m.app)
    r = anon.get("/api/records")
    assert r.status_code == 401


def test_generic_login_error(client):
    r = client.post("/api/auth/login", json={"email": "nosuch@example.test", "password": "Str0ng!Passw0rd"})
    assert r.status_code == 401
    r2 = client.post("/api/auth/login", json={"email": "analyst@example.test", "password": "WrongPassw0rd!"})
    assert r2.json() == r.json()                       # no username enumeration


def test_analyze_small_payload(client):
    data = base64.b64encode(b"hello").decode()
    r = client.post("/api/analyze", json={"filename": "h.txt", "data_b64": data})
    body = r.json()
    assert body["sha256"] == "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    assert body["combined_verdict"] in ("KNOWN_MALICIOUS", "NO_KNOWN_DETECTION", "UNKNOWN", "CONFLICTING")
    assert "does NOT prove" in body["disclaimer"]


def test_upload_with_size_limit(client):
    import app.main as m
    from app.config import settings
    old = settings.max_upload_bytes
    settings.max_upload_bytes = 64
    try:
        r = client.post("/api/analyze/upload", files={"file": ("big.bin", b"x" * 128)})
        assert r.status_code == 413
    finally:
        settings.max_upload_bytes = old


def test_verdict_states_and_history(client):
    for name in ("a.bin", "b.bin", "c.bin", "d.bin", "e.bin"):
        client.post("/api/analyze", json={"filename": name, "data_b64": base64.b64encode(name.encode()).decode()})
    r = client.get("/api/records")
    assert len(r.json()["records"]) == 5
    verdicts = {rec["combined_verdict"] for rec in r.json()["records"]}
    assert verdicts <= {"KNOWN_MALICIOUS", "NO_KNOWN_DETECTION", "UNKNOWN", "CONFLICTING"}
    q = client.get("/api/records", params={"q": "a.bin"})
    assert len(q.json()["records"]) == 1


def test_disposition_notes_case_report(client):
    data = base64.b64encode(b"hello").decode()
    rec = client.post("/api/analyze", json={"filename": "h.txt", "data_b64": data}).json()
    rid = rec["id"]
    r = client.patch(f"/api/records/{rid}", json={"disposition": "suspicious"})
    assert r.json()["disposition"] == "suspicious"
    case = client.post("/api/cases", json={"title": "Investigate h.txt", "record_id": rid}).json()
    client.post(f"/api/cases/{case['id']}/notes", json={"body": "matches ticket IR-5"})
    notes = client.get(f"/api/cases/{case['id']}/notes").json()
    assert notes["notes"][0]["body"] == "matches ticket IR-5"
    report = client.get(f"/api/records/{rid}/report").json()
    assert "not a safety determination" in report["report_note"]
    assert report["lookups"]


def test_retention_delete(client):
    data = base64.b64encode(b"bye").decode()
    rec = client.post("/api/analyze", json={"filename": "b.bin", "data_b64": data}).json()
    assert client.delete(f"/api/records/{rec['id']}").status_code == 200
    assert client.get(f"/api/records/{rec['id']}").status_code == 404
