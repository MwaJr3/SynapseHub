"""Authorization tests: per-user isolation of projects, manifests, scans, findings."""
import json
from types import SimpleNamespace

from conftest import upload_manifest


def test_requires_authentication(client):
    assert client.get("/api/projects").status_code == 401
    assert client.post("/api/projects", json={"name": "x"}).status_code == 401
    assert client.get("/api/projects/1/manifests").status_code == 401


def test_foreign_project_and_manifests_hidden(authed_client, second_client, project):
    assert second_client.get("/api/projects").json() == []
    assert second_client.get(f"/api/projects/{project}/manifests").status_code == 404
    m = upload_manifest(authed_client, project, "requirements.txt", b"requests==2.19.0\n")
    assert second_client.delete(f"/api/manifests/{m}").status_code == 404
    assert second_client.post(f"/api/manifests/{m}/select").status_code == 404
    assert second_client.delete(f"/api/projects/{project}").status_code == 404


def test_foreign_scan_and_findings_hidden(authed_client, second_client, project, monkeypatch):
    def fake_scan(text, filename, timeout=None, runner=None):
        payload = {"dependencies": [{"name": "requests", "version": "2.19.0", "vulns": [{"id": "X-1", "aliases": [], "description": "d", "fix_versions": ["2.0"]}]}]}
        from app.audit import AuditFinding, AuditResult

        return AuditResult(
            status="completed",
            findings=[AuditFinding(package="requests", version="2.19.0", advisory_id="X-1", aliases=[], description="d", fix_versions=["2.0"])],
            raw=payload,
        )

    monkeypatch.setattr("app.audit.run_pip_audit", fake_scan)
    m = upload_manifest(authed_client, project, "requirements.txt", b"requests==2.19.0\n")
    scan = authed_client.post(f"/api/manifests/{m}/scans").json()
    assert scan["findings"] == 1

    assert second_client.get(f"/api/scans/{scan['id']}/findings").status_code == 404
    assert second_client.get(f"/api/scans/{scan['id']}/report.json").status_code == 404
    assert second_client.get(f"/api/scans/{scan['id']}/report.csv").status_code == 404
    assert second_client.get(f"/api/projects/{project}/findings").status_code == 404
    assert second_client.get(f"/api/projects/{project}/scans").status_code == 404


def test_foreign_remediation_not_editable(authed_client, second_client, project, monkeypatch):
    def fake_scan(text, filename, timeout=None, runner=None):
        from app.audit import AuditFinding, AuditResult

        return AuditResult(
            status="completed",
            findings=[AuditFinding(package="requests", version="2.19.0", advisory_id="X-1", aliases=[], description="d", fix_versions=[])],
            raw={},
        )

    monkeypatch.setattr("app.audit.run_pip_audit", fake_scan)
    m = upload_manifest(authed_client, project, "requirements.txt", b"requests==2.19.0\n")
    authed_client.post(f"/api/manifests/{m}/scans")
    findings = authed_client.get(f"/api/projects/{project}/findings").json()
    assert findings
    response = second_client.put(
        f"/api/findings/{findings[0]['id']}/remediation",
        json={"status": "Resolved", "assignee": "x", "notes": "", "exception_reason": ""},
    )
    assert response.status_code == 404
