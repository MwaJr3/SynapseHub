"""Tests: password policy, lockout, generic errors, MFA, roles, headers, sessions."""
from __future__ import annotations

import pyotp
from fastapi.testclient import TestClient

import app.main as main
from app.passwords import check_password
from app.security import security_headers
from app.store import Store, hash_password, verify_password


def fresh_client(tmp_path):
    from app.security import RateLimiter
    main.store = Store(str(tmp_path / "auth.db"))
    main.login_limiter = RateLimiter(max_per_window=50, window_seconds=60)  # fresh limiter per test
    return TestClient(main.app)


def test_password_policy():
    assert any("at least 12" in p for p in check_password("Ab1!x"))
    assert any("uppercase" in p for p in check_password("alllowercase1!"))
    assert any("common-password" in p for p in check_password("password1"))
    assert any("username" in p for p in check_password("alice-Alice-123!", "alice"))
    assert check_password("Str0ng!Passw0rd", "bob") == []


def test_pbkdf2_round_trip():
    h, salt = hash_password("Str0ng!Passw0rd")
    assert verify_password("Str0ng!Passw0rd", h, salt)
    assert not verify_password("wrong", h, salt)


def test_register_and_generic_login_error(tmp_path):
    c = fresh_client(tmp_path)
    r = c.post("/register", data={"username": "alice", "password": "Str0ng!Passw0rd"})
    assert r.status_code == 200 and "created" in r.text
    bad_user = c.post("/login", data={"username": "nosuch", "password": "Str0ng!Passw0rd"})
    bad_pass = c.post("/login", data={"username": "alice", "password": "WrongPassw0rd!"})
    assert bad_user.text == bad_pass.text          # identical generic failure
    assert "nosuch" not in bad_user.text


def test_account_lockout(tmp_path):
    c = fresh_client(tmp_path)
    main.store.max_attempts = 3
    c.post("/register", data={"username": "bob", "password": "Str0ng!Passw0rd"})
    for _ in range(3):
        c.post("/login", data={"username": "bob", "password": "WrongPassw0rd!"})
    assert main.store.is_locked("bob")
    r = c.post("/login", data={"username": "bob", "password": "Str0ng!Passw0rd"})
    assert "failed" in r.text.lower()               # correct password refused while locked


def test_mfa_required_when_enabled(tmp_path):
    c = fresh_client(tmp_path)
    c.post("/register", data={"username": "carol", "password": "Str0ng!Passw0rd"})
    secret = pyotp.random_base32()
    code = pyotp.TOTP(secret).now()
    main.store.conn.execute("UPDATE users SET mfa_secret=? WHERE username='carol'", (secret,))
    main.store.conn.commit()
    r = c.post("/login", data={"username": "carol", "password": "Str0ng!Passw0rd"})
    assert "failed" in r.text.lower()               # missing OTP
    r = c.post("/login", data={"username": "carol", "password": "Str0ng!Passw0rd", "otp": code},
               follow_redirects=False)
    assert r.status_code == 303                     # success redirects


def test_role_enforcement(tmp_path):
    c = fresh_client(tmp_path)
    main.store.create_user("admin1", "Str0ng!Passw0rd", role="admin")
    main.store.create_user("user1", "Str0ng!Passw0rd", role="user")
    c.post("/login", data={"username": "user1", "password": "Str0ng!Passw0rd"})
    assert c.get("/admin").status_code == 403
    c.get("/logout")
    c.post("/login", data={"username": "admin1", "password": "Str0ng!Passw0rd"})
    r = c.get("/admin")
    assert r.status_code == 200 and "admin1" in r.text


def test_security_headers_and_session_cookie(tmp_path):
    c = fresh_client(tmp_path)
    r = c.get("/login")
    assert r.headers["X-Frame-Options"] == "DENY"
    assert "default-src 'none'" in r.headers["Content-Security-Policy"]
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["Referrer-Policy"] == "no-referrer"
    c.post("/register", data={"username": "dave", "password": "Str0ng!Passw0rd"})
    r = c.post("/login", data={"username": "dave", "password": "Str0ng!Passw0rd"},
               follow_redirects=False)
    assert r.status_code == 303
    assert r.headers.get("set-cookie", "").find("HttpOnly") >= 0
    c.get("/logout")
    assert c.get("/profile", follow_redirects=False).status_code == 303  # session invalidated


def test_hsts_config_flag():
    assert "Strict-Transport-Security" not in security_headers(include_hsts=False)
    assert "Strict-Transport-Security" in security_headers(include_hsts=True)
