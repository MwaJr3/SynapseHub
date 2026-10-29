"""Authorization tests: per-user isolation of workspaces, files, baselines, scans."""
from conftest import upload


def test_requires_authentication(client):
    assert client.get("/api/workspaces").status_code == 401
    assert client.post("/api/workspaces", json={"name": "x"}).status_code == 401
    assert client.get("/api/workspaces/1/files").status_code == 401


def test_foreign_workspace_not_visible(authed_client, second_client, workspace):
    assert second_client.get("/api/workspaces").json() == []
    assert second_client.get(f"/api/workspaces/{workspace}/files").status_code == 404
    assert second_client.post(f"/api/workspaces/{workspace}/files", files={"file": ("a.conf", b"x", "text/plain")}).status_code == 404
    assert second_client.delete(f"/api/workspaces/{workspace}").status_code == 404


def test_foreign_file_not_accessible(authed_client, second_client, workspace):
    file_id = upload(authed_client, workspace, "secret.conf", b"private content\n")
    assert second_client.get(f"/api/files/{file_id}").status_code == 404
    assert second_client.get(f"/api/files/{file_id}/download").status_code == 404
    assert second_client.delete(f"/api/files/{file_id}").status_code == 404
    # Owner can download.
    body = authed_client.get(f"/api/files/{file_id}/download")
    assert body.status_code == 200 and body.content == b"private content\n"


def test_foreign_baseline_and_scan_not_accessible(authed_client, second_client, workspace):
    upload(authed_client, workspace, "one.conf", b"content-1\n")
    baseline_id = authed_client.post(f"/api/workspaces/{workspace}/baselines?name=b1").json()["id"]
    scan_id = authed_client.post(f"/api/baselines/{baseline_id}/scans").json()["id"]

    assert second_client.get(f"/api/baselines/{baseline_id}/manifest.json").status_code == 404
    assert second_client.post(f"/api/baselines/{baseline_id}/scans").status_code == 404
    assert second_client.get(f"/api/scans/{scan_id}/findings").status_code == 404
    assert second_client.get(f"/api/scans/{scan_id}/report.json").status_code == 404
    assert second_client.delete(f"/api/baselines/{baseline_id}").status_code == 404


def test_foreign_finding_not_editable(authed_client, second_client, workspace):
    file_id = upload(authed_client, workspace, "one.conf", b"content-1\n")
    baseline_id = authed_client.post(f"/api/workspaces/{workspace}/baselines?name=b1").json()["id"]
    from app import config, integrity as integ

    from app.database import SessionLocal
    from app.models import StoredFile

    db = SessionLocal()
    try:
        stored = db.get(StoredFile, file_id)
        (config.UPLOAD_DIR / stored.internal_name).write_bytes(b"changed\n")
        stored.sha256 = integ.sha256_bytes(b"changed\n")
        db.commit()
    finally:
        db.close()
    scan_id = authed_client.post(f"/api/baselines/{baseline_id}/scans").json()["id"]
    findings = authed_client.get(f"/api/scans/{scan_id}/findings").json()
    assert findings
    assert second_client.patch(
        f"/api/findings/{findings[0]['id']}", json={"reviewed": True, "notes": "x"}
    ).status_code == 404
