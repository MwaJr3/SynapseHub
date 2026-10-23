"""Authorization tests: per-user isolation enforced server-side."""


def test_requires_authentication(client):
    for path in ("/api/datasets", "/api/rules", "/api/reports"):
        assert client.get(path).status_code == 401
    assert client.get("/api/datasets/1/events").status_code == 401


def test_second_user_cannot_access_foreign_dataset(authed_client, second_client):
    text = b"Oct 21 08:00:00 host sshd[1]: Failed password for x from 1.2.3.4\n"
    created = authed_client.post("/api/datasets", files={"file": ("a.log", text, "text/plain")}).json()
    dataset_id = created["id"]

    assert second_client.get(f"/api/datasets/{dataset_id}").status_code == 404
    assert second_client.get(f"/api/datasets/{dataset_id}/events").status_code == 404
    assert second_client.delete(f"/api/datasets/{dataset_id}").status_code == 404
    assert second_client.post(f"/api/datasets/{dataset_id}/analyze").status_code == 404
    # Owner still has it.
    assert authed_client.get(f"/api/datasets/{dataset_id}").status_code == 200


def test_second_user_cannot_edit_foreign_rule(authed_client, second_client):
    rule_id = authed_client.post(
        "/api/rules",
        json={"name": "r", "rule_type": "repeated_failures", "threshold": 5, "window_minutes": 15, "severity": "high"},
    ).json()["id"]
    assert second_client.put(
        f"/api/rules/{rule_id}",
        json={"name": "hacked", "rule_type": "repeated_failures", "threshold": 9, "window_minutes": 15, "severity": "low"},
    ).status_code == 404
    assert second_client.delete(f"/api/rules/{rule_id}").status_code == 404
    rules = authed_client.get("/api/rules").json()
    assert any(r["name"] == "r" for r in rules)
    assert not any(r["name"] == "hacked" for r in rules)


def test_second_user_cannot_read_foreign_findings_or_reports(authed_client, second_client):
    text = b"Oct 21 08:00:00 host sshd[1]: Failed password for x from 1.2.3.4\n"
    dataset_id = authed_client.post("/api/datasets", files={"file": ("a.log", text, "text/plain")}).json()["id"]
    authed_client.post(f"/api/datasets/{dataset_id}/analyze")
    findings = authed_client.get(f"/api/datasets/{dataset_id}/findings").json()
    report_id = authed_client.post(f"/api/datasets/{dataset_id}/reports").json()["id"]

    for finding in findings:
        assert second_client.patch(
            f"/api/findings/{finding['id']}", json={"status": "closed", "notes": "x"}
        ).status_code == 404
    assert second_client.get("/api/reports").json() == []
    assert second_client.get(f"/api/reports/{report_id}/export.json").status_code == 404
    assert second_client.get(f"/api/reports/{report_id}/export.csv").status_code == 404


def test_logout_invalidates_session(authed_client):
    assert authed_client.get("/api/auth/me").status_code == 200
    authed_client.post("/api/auth/logout")
    assert authed_client.get("/api/auth/me").status_code == 401


def test_login_rejects_bad_password(client):
    client.post("/api/auth/register", json={"email": "x@example.com", "password": "password-123"})
    client.cookies.clear()
    response = client.post("/api/auth/login", json={"email": "x@example.com", "password": "wrong-password"})
    assert response.status_code == 401
