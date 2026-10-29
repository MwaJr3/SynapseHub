RAW_LEGIT = """From: IT Desk <it@training.example>
To: staff@training.example
Subject: Reminder

Please review the policy at https://intranet.training.example/policy
"""


def test_auth_flow_and_generic_errors(auth_client):
    from fastapi.testclient import TestClient
    from app.main import app
    anon = TestClient(app)
    assert anon.get("/api/messages").status_code == 401
    assert anon.post("/api/auth/login", json={"email": "analyst@example.org",
                                              "password": "wrong-password-1"}).status_code == 401


def test_password_reset_flow_revokes_sessions(auth_client):
    r = auth_client.post("/api/auth/reset/request", json={"email": "analyst@example.org"})
    token = r.json()["dev_token"]
    assert "no email is sent" in r.json()["dev_note"]
    assert auth_client.post("/api/auth/reset/confirm",
                            json={"token": token, "new_password": "brand-new-password-1"}).status_code == 200
    # old session revoked
    assert auth_client.get("/api/me").status_code == 401
    # old password no longer works, new one does
    assert auth_client.post("/api/auth/login", json={"email": "analyst@example.org",
                                                     "password": "demo-password-123"}).status_code == 401
    assert auth_client.post("/api/auth/login", json={"email": "analyst@example.org",
                                                     "password": "brand-new-password-1"}).status_code == 200


def test_mfa_enroll_enable_and_enforced_login(auth_client):
    import time
    from app.security import totp_code
    secret = auth_client.post("/api/auth/mfa/enroll").json()["secret"]
    code = totp_code(secret)
    assert auth_client.post("/api/auth/mfa/enable", json={"code": code}).json()["mfa_enabled"] is True
    # login now requires a code — generic failure without it
    assert auth_client.post("/api/auth/login", json={"email": "analyst@example.org",
                                                     "password": "demo-password-123"}).status_code == 401
    r = auth_client.post("/api/auth/login", json={"email": "analyst@example.org",
                                                  "password": "demo-password-123",
                                                  "mfa_code": totp_code(secret, time.time())})
    assert r.status_code == 200


def test_session_listing_and_revocation(auth_client):
    sessions = auth_client.get("/api/auth/sessions").json()["sessions"]
    assert len(sessions) == 1
    assert auth_client.post("/api/auth/sessions/revoke-others").status_code == 200
    assert len(auth_client.get("/api/auth/sessions").json()["sessions"]) == 1


def test_message_analysis_workflow_with_honest_framing(auth_client):
    r = auth_client.post("/api/messages", json={"raw": RAW_LEGIT, "source_kind": "paste"})
    assert r.status_code == 200
    body = r.json()
    assert "NOT proof" in body["disclaimer"]
    mid = body["id"]
    detail = auth_client.get(f"/api/messages/{mid}").json()
    assert detail["worst_severity"] in ("informational", "low")
    auth_client.patch(f"/api/messages/{mid}", json={"disposition": "suspicious"})
    auth_client.post(f"/api/messages/{mid}/notes", json={"body": "checked sender"})
    notes = auth_client.get(f"/api/messages/{mid}/notes").json()["notes"]
    assert notes and notes[0]["body"] == "checked sender"
    report = auth_client.get(f"/api/messages/{mid}/report").json()
    assert "never visited" in report["disclaimer"]
    assert auth_client.delete(f"/api/messages/{mid}").json()["ok"] is True
    assert auth_client.get(f"/api/messages/{mid}").status_code == 404


def test_phishy_message_stores_findings(auth_client):
    raw = open(__import__("pathlib").Path(__file__).parent / "fixtures" / "phishy.eml").read()
    r = auth_client.post("/api/messages", json={"raw": raw})
    assert r.json()["worst_severity"] == "high"
    mid = r.json()["id"]
    codes = {f["code"] for f in auth_client.get(f"/api/messages/{mid}").json()["findings"]}
    assert "reply-to-mismatch" in codes
