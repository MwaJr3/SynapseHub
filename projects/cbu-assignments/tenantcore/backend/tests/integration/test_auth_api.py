import uuid

import pytest

from app.demo.ids import TENANTS

pytestmark = pytest.mark.postgres


def test_login_and_me_return_explicit_memberships(client, acme_token):
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {acme_token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == "acme.admin@tenantcore.demo"
    assert [item["tenant_slug"] for item in body["memberships"]] == ["acme"]
    assert body["memberships"][0]["role"] == "tenant_admin"


def test_refresh_tokens_rotate_and_logout_revokes_session(client, login):
    tokens = login("acme.member@tenantcore.demo")
    old_refresh = tokens["refresh_token"]
    refreshed = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert refreshed.status_code == 200, refreshed.text
    assert refreshed.json()["refresh_token"] != old_refresh
    replay = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert replay.status_code == 401
    headers = {"Authorization": f"Bearer {refreshed.json()['access_token']}"}
    assert client.post("/api/v1/auth/logout", headers=headers).status_code == 200
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401


def test_invitation_acceptance_is_one_time(client, acme_headers, login):
    email = f"invited-{uuid.uuid4().hex[:10]}@example.com"
    invited = client.post(
        "/api/v1/members",
        headers=acme_headers,
        json={"email": email, "full_name": "Invited Demo User", "role": "read_only"},
    )
    assert invited.status_code == 201, invited.text
    token = invited.json()["invitation_token"]
    assert token
    accepted = client.post(
        "/api/v1/auth/accept-invitation",
        json={"token": token, "password": "InvitationPass!2026"},
    )
    assert accepted.status_code == 200, accepted.text
    login(email, "InvitationPass!2026")
    replay = client.post(
        "/api/v1/auth/accept-invitation",
        json={"token": token, "password": "InvitationPass!2026"},
    )
    assert replay.status_code == 400


def test_multi_tenant_user_requires_and_validates_selection(client, login):
    tokens = login("multi@tenantcore.demo")
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    assert client.get("/api/v1/projects", headers=headers).status_code == 400
    acme = client.get("/api/v1/projects", headers={**headers, "X-Tenant-ID": str(TENANTS["acme"])})
    assert acme.status_code == 200
    assert {item["tenant_id"] for item in acme.json()["items"]} == {str(TENANTS["acme"])}
    # The same identity has read_only in Globex; role is tenant-specific.
    denied = client.post(
        "/api/v1/projects",
        headers={**headers, "X-Tenant-ID": str(TENANTS["globex"])},
        json={"name": "Read-only users cannot create this"},
    )
    assert denied.status_code == 403
