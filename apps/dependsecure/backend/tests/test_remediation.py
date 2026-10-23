"""Remediation-workflow tests: statuses, exceptions, separation from scanner output."""
from conftest import upload_manifest


def seed_scan(client, project, monkeypatch):
    def fake_scan(text, filename, timeout=None, runner=None):
        from app.audit import AuditFinding, AuditResult

        return AuditResult(
            status="completed",
            findings=[
                AuditFinding(package="requests", version="2.19.0", advisory_id="X-1", aliases=["CVE-1"], description="d", fix_versions=["2.20.0"]),
                AuditFinding(package="urllib3", version="1.26.5", advisory_id="X-2", aliases=[], description="d2", fix_versions=[]),
            ],
            raw={"note": "raw scanner payload preserved"},
        )

    monkeypatch.setattr("app.audit.run_pip_audit", fake_scan)
    m = upload_manifest(client, project, "requirements.txt", b"requests==2.19.0\nurllib3==1.26.5\n")
    scan = client.post(f"/api/manifests/{m}/scans").json()
    findings = client.get(f"/api/scans/{scan['id']}/findings").json()
    return scan, findings


def test_scanner_output_stays_separate_from_remediation(authed_client, project, monkeypatch):
    scan, findings = seed_scan(authed_client, project, monkeypatch)
    assert findings[0]["source"] == "pip-audit"
    assert findings[0]["remediation"] == {"status": "Open", "assignee": "", "notes": "", "exception_reason": ""}

    authed_client.put(
        f"/api/findings/{findings[0]['id']}/remediation",
        json={"status": "Under Review", "assignee": "Alice", "notes": "checking", "exception_reason": ""},
    )
    after = authed_client.get(f"/api/scans/{scan['id']}/findings").json()
    # Scanner portion untouched:
    assert after[0]["advisory_id"] == "X-1" and after[0]["version"] == "2.19.0"
    assert after[0]["remediation"]["status"] == "Under Review"
    assert after[0]["remediation"]["assignee"] == "Alice"


def test_accepted_risk_requires_exception_reason(authed_client, project, monkeypatch):
    _, findings = seed_scan(authed_client, project, monkeypatch)
    response = authed_client.put(
        f"/api/findings/{findings[0]['id']}/remediation",
        json={"status": "Accepted Risk", "assignee": "", "notes": "", "exception_reason": "   "},
    )
    assert response.status_code == 400
    ok = authed_client.put(
        f"/api/findings/{findings[0]['id']}/remediation",
        json={"status": "Accepted Risk", "assignee": "", "notes": "", "exception_reason": "mitigated by WAF; reviewed 2026-10"},
    )
    assert ok.status_code == 200


def test_invalid_status_rejected(authed_client, project, monkeypatch):
    _, findings = seed_scan(authed_client, project, monkeypatch)
    response = authed_client.put(
        f"/api/findings/{findings[0]['id']}/remediation",
        json={"status": "Ignored", "assignee": "", "notes": "", "exception_reason": ""},
    )
    assert response.status_code == 400


def test_report_includes_remediation_and_disclaimer(authed_client, project, monkeypatch):
    scan, findings = seed_scan(authed_client, project, monkeypatch)
    authed_client.put(
        f"/api/findings/{findings[1]['id']}/remediation",
        json={"status": "Resolved", "assignee": "Bob", "notes": "upgraded", "exception_reason": ""},
    )
    report = authed_client.get(f"/api/scans/{scan['id']}/report.json").json()
    assert report["counts"]["findings"] == 2
    assert report["counts"]["by_remediation_status"] == {"Resolved": 1, "Open": 1}
    resolved = next(f for f in report["findings"] if f["remediation"]["status"] == "Resolved")
    assert resolved["remediation"]["assignee"] == "Bob"
    assert "does not" in report["disclaimer"] and "separate" in report["disclaimer"]

    csv_body = authed_client.get(f"/api/scans/{scan['id']}/report.csv").text
    assert "finding,requests==2.19.0" in csv_body
    assert "status=Resolved" in csv_body
