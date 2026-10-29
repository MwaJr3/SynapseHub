import uuid

import pytest

from app.demo.ids import PROJECTS, TENANTS

pytestmark = [pytest.mark.postgres, pytest.mark.security]


def test_tenant_a_reads_only_tenant_a(client, acme_headers):
    response = client.get("/api/v1/projects", headers=acme_headers)
    assert response.status_code == 200
    assert len(response.json()["items"]) >= 2
    assert {item["tenant_id"] for item in response.json()["items"]} == {str(TENANTS["acme"])}


def test_tenant_a_to_b_and_b_to_a_resource_access_is_indistinguishable_from_missing(
    client, acme_headers, globex_headers
):
    acme_to_globex = client.get(f"/api/v1/projects/{PROJECTS['globex_a']}", headers=acme_headers)
    globex_to_acme = client.get(f"/api/v1/projects/{PROJECTS['acme_a']}", headers=globex_headers)
    missing = client.get(f"/api/v1/projects/{uuid.uuid4()}", headers=acme_headers)
    assert acme_to_globex.status_code == globex_to_acme.status_code == missing.status_code == 404
    assert acme_to_globex.json()["error"]["code"] == missing.json()["error"]["code"]


def test_malicious_tenant_header_and_query_cannot_switch_identity(client, acme_headers):
    switched = client.get(
        "/api/v1/projects", headers={**acme_headers, "X-Tenant-ID": str(TENANTS["globex"])}
    )
    assert switched.status_code == 403
    assert switched.json()["error"]["code"] == "TENANT_ACCESS_DENIED"
    query = client.get(f"/api/v1/projects?tenant_id={TENANTS['globex']}", headers=acme_headers)
    assert query.status_code == 200
    assert {item["tenant_id"] for item in query.json()["items"]} == {str(TENANTS["acme"])}


def test_client_body_tenant_id_cannot_override_server_context(client, acme_headers):
    response = client.post(
        "/api/v1/projects",
        headers=acme_headers,
        json={"name": "Server-side tenant binding", "tenant_id": str(TENANTS["globex"])},
    )
    if response.status_code == 422:
        return  # Strict schemas may reject the unexpected field; either outcome prevents switching.
    assert response.status_code == 201, response.text
    assert response.json()["tenant_id"] == str(TENANTS["acme"])


def test_normal_member_cannot_perform_admin_operations(client, login):
    tokens = login("acme.member@tenantcore.demo")
    headers = {
        "Authorization": f"Bearer {tokens['access_token']}",
        "X-Tenant-ID": str(TENANTS["acme"]),
    }
    assert client.get("/api/v1/members", headers=headers).status_code == 200
    denied = client.post(
        "/api/v1/members",
        headers=headers,
        json={
            "email": "unauthorized@example.com",
            "full_name": "Unauthorized",
            "role": "tenant_admin",
        },
    )
    assert denied.status_code == 403
    assert client.get("/api/v1/tenants", headers=headers).status_code == 403
    assert client.get("/api/v1/audit-events", headers=headers).status_code == 403


def test_unknown_tenant_context_is_denied(client, acme_headers):
    response = client.get(
        "/api/v1/projects", headers={**acme_headers, "X-Tenant-ID": str(uuid.uuid4())}
    )
    assert response.status_code == 403


def test_provisioning_membership_suspension_and_archive(client, acme_headers, platform_headers):
    plans = client.get("/api/v1/plans", headers=platform_headers)
    assert plans.status_code == 200
    slug = f"tenant-{uuid.uuid4().hex[:10]}"
    created = client.post(
        "/api/v1/tenants",
        headers=platform_headers,
        json={
            "name": "Lifecycle Test Tenant",
            "slug": slug,
            "plan_id": plans.json()["items"][0]["id"],
        },
    )
    assert created.status_code == 201, created.text
    tenant_id = created.json()["id"]
    assert created.json()["status"] == "provisioning"
    assert (
        client.post(f"/api/v1/tenants/{tenant_id}/activate", headers=platform_headers).status_code
        == 200
    )
    member = client.post(
        "/api/v1/members",
        headers={**platform_headers, "X-Tenant-ID": tenant_id},
        json={
            "email": "acme.admin@tenantcore.demo",
            "full_name": "Acme Admin (Demo)",
            "role": "member",
        },
    )
    assert member.status_code == 201, member.text
    scoped = {**acme_headers, "X-Tenant-ID": tenant_id}
    assert client.get("/api/v1/projects", headers=scoped).status_code == 200
    suspended = client.post(f"/api/v1/tenants/{tenant_id}/suspend", headers=platform_headers)
    assert suspended.status_code == 200
    denied = client.get("/api/v1/projects", headers=scoped)
    assert denied.status_code == 403
    assert denied.json()["error"]["code"] == "TENANT_NOT_ACTIVE"
    assert (
        client.post(f"/api/v1/tenants/{tenant_id}/archive", headers=platform_headers).status_code
        == 200
    )
    assert (
        client.post(f"/api/v1/tenants/{tenant_id}/activate", headers=platform_headers).status_code
        == 409
    )


def test_api_key_scopes_membership_and_revocation_are_enforced(client, acme_headers):
    created = client.post(
        "/api/v1/api-keys",
        headers=acme_headers,
        json={"name": f"Read-only integration {uuid.uuid4().hex[:8]}", "scopes": ["read"]},
    )
    assert created.status_code == 201, created.text
    body = created.json()
    key_headers = {
        "X-API-Key": body["secret"],
        "X-Tenant-ID": str(TENANTS["acme"]),
    }
    assert client.get("/api/v1/projects", headers=key_headers).status_code == 200
    write = client.post(
        "/api/v1/projects",
        headers=key_headers,
        json={"name": "Read-only API keys cannot write"},
    )
    assert write.status_code == 403
    assert write.json()["error"]["code"] == "INSUFFICIENT_API_KEY_SCOPE"
    switched = client.get(
        "/api/v1/projects",
        headers={**key_headers, "X-Tenant-ID": str(TENANTS["globex"])},
    )
    assert switched.status_code == 403
    assert (
        client.post(
            f"/api/v1/api-keys/{body['api_key']['id']}/revoke", headers=acme_headers
        ).status_code
        == 200
    )
    assert client.get("/api/v1/projects", headers=key_headers).status_code == 401


def test_platform_admin_authorized_operation_allowed(client, platform_headers):
    response = client.get("/api/v1/platform/dashboard", headers=platform_headers)
    assert response.status_code == 200
    assert response.json()["tenants"]["active"] >= 3
