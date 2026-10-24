import time

from app.security import totp_code


def test_password_reset_flow_revokes_sessions(auth_client):
    r = auth_client.post("/api/auth/reset/request", json={"email": "ops@example.org"})
    if r.status_code != 200:
        r = auth_client.post("/api/auth/reset/request", json={"email": "reviewer@example.org"})
    if r.status_code != 200:
        r = auth_client.post("/api/auth/reset/request", json={"email": "teach@example.org"})
    token = r.json()["dev_token"]
    assert "no email is sent" in r.json()["dev_note"]
    email = None
    for candidate in ("ops@example.org", "reviewer@example.org", "teach@example.org"):
        if auth_client.post("/api/auth/reset/confirm",
                            json={"token": token, "new_password": "brand-new-password-1"}).status_code == 200:
            email = candidate
            break
    assert email is not None
    assert auth_client.get("/api/me").status_code == 401
    assert auth_client.post("/api/auth/login", json={"email": email,
                            "password": "demo-password-123"}).status_code == 401
    assert auth_client.post("/api/auth/login", json={"email": email,
                            "password": "brand-new-password-1"}).status_code == 200


def test_mfa_enroll_enable_and_enforced_login(auth_client):
    secret = auth_client.post("/api/auth/mfa/enroll").json()["secret"]
    assert auth_client.post("/api/auth/mfa/enable", json={"code": totp_code(secret)}).json()["mfa_enabled"] is True
    me = auth_client.get("/api/me").json()
    assert me["mfa_enabled"] is True
    assert auth_client.post("/api/auth/logout").status_code == 200
    email = me["email"]
    assert auth_client.post("/api/auth/login", json={"email": email,
                            "password": "demo-password-123"}).status_code == 401
    r = auth_client.post("/api/auth/login", json={"email": email, "password": "demo-password-123",
                                                  "mfa_code": totp_code(secret, time.time())})
    assert r.status_code == 200


def test_session_listing_and_revocation(auth_client):
    sessions = auth_client.get("/api/auth/sessions").json()["sessions"]
    assert len(sessions) == 1
    assert auth_client.post("/api/auth/sessions/revoke-others").status_code == 200
