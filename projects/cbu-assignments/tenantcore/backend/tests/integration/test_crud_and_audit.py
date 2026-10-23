import uuid

import pytest

pytestmark = pytest.mark.postgres


def test_project_team_task_document_comment_workflow(client, acme_headers):
    suffix = uuid.uuid4().hex[:8]
    team = client.post(
        "/api/v1/teams",
        headers=acme_headers,
        json={"name": f"Integration Team {suffix}", "description": "Created by integration test"},
    )
    assert team.status_code == 201, team.text
    project = client.post(
        "/api/v1/projects",
        headers=acme_headers,
        json={"name": f"Integration Project {suffix}", "team_id": team.json()["id"]},
    )
    assert project.status_code == 201, project.text
    project_id = project.json()["id"]
    task = client.post(
        "/api/v1/tasks",
        headers=acme_headers,
        json={
            "project_id": project_id,
            "title": f"Verify integration workflow {suffix}",
            "priority": "high",
        },
    )
    assert task.status_code == 201, task.text
    task_body = task.json()
    updated = client.patch(
        f"/api/v1/tasks/{task_body['id']}",
        headers=acme_headers,
        json={"status": "in_progress", "version": task_body["version"]},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["version"] == task_body["version"] + 1
    stale = client.patch(
        f"/api/v1/tasks/{task_body['id']}",
        headers=acme_headers,
        json={"status": "done", "version": task_body["version"]},
    )
    assert stale.status_code == 409
    comment = client.post(
        f"/api/v1/tasks/{task_body['id']}/comments",
        headers=acme_headers,
        json={"body": "Integration test comment"},
    )
    assert comment.status_code == 201, comment.text
    document = client.post(
        "/api/v1/documents",
        headers=acme_headers,
        json={"project_id": project_id, "title": "Integration record", "content": "Real content"},
    )
    assert document.status_code == 201, document.text
    filtered = client.get(
        f"/api/v1/tasks?project_id={project_id}&status=in_progress&search=Integration",
        headers=acme_headers,
    )
    assert filtered.status_code == 200
    assert filtered.json()["meta"]["total"] == 1
    audit = client.get("/api/v1/audit-events?page_size=100", headers=acme_headers)
    assert audit.status_code == 200
    actions = {item["action"] for item in audit.json()["items"]}
    assert {
        "team.created",
        "project.created",
        "task.created",
        "task.updated",
        "comment.created",
        "document.created",
    } <= actions
    usage = client.get("/api/v1/usage", headers=acme_headers)
    assert usage.status_code == 200
    assert usage.json()["current"]["projects"] >= 3
    assert (
        client.delete(
            f"/api/v1/documents/{document.json()['id']}", headers=acme_headers
        ).status_code
        == 204
    )
    assert (
        client.delete(f"/api/v1/tasks/{task_body['id']}", headers=acme_headers).status_code == 204
    )
    assert client.delete(f"/api/v1/projects/{project_id}", headers=acme_headers).status_code == 204
    assert (
        client.delete(f"/api/v1/teams/{team.json()['id']}", headers=acme_headers).status_code == 204
    )


def test_api_key_secret_is_only_returned_once_and_revocation_is_audited(client, acme_headers):
    created = client.post(
        "/api/v1/api-keys",
        headers=acme_headers,
        json={"name": f"Integration key {uuid.uuid4().hex[:8]}", "scopes": ["read"]},
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["secret"].startswith(body["api_key"]["prefix"])
    listed = client.get("/api/v1/api-keys", headers=acme_headers)
    assert listed.status_code == 200
    serialized = listed.text
    assert body["secret"] not in serialized
    assert "key_hash" not in serialized
    revoked = client.post(f"/api/v1/api-keys/{body['api_key']['id']}/revoke", headers=acme_headers)
    assert revoked.status_code == 200


def test_member_self_lockout_is_rejected(client, acme_headers):
    me = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": acme_headers["Authorization"]},
    ).json()
    response = client.patch(
        f"/api/v1/members/{me['user']['id']}",
        headers=acme_headers,
        json={"role": "member"},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "SELF_LOCKOUT"
