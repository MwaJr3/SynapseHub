"""Report generation tests."""
from conftest import upload


def run_scan_with_drift(client, workspace):
    upload(client, workspace, "keep.conf", b"stable\n")
    file_id = upload(client, workspace, "drift.conf", b"original\n")
    baseline_id = client.post(f"/api/workspaces/{workspace}/baselines?name=b1").json()["id"]

    from app import config, integrity as integ

    from app.database import SessionLocal
    from app.models import StoredFile

    db = SessionLocal()
    try:
        stored = db.get(StoredFile, file_id)
        (config.UPLOAD_DIR / stored.internal_name).write_bytes(b"drifted\n")
        stored.sha256 = integ.sha256_bytes(b"drifted\n")
        db.commit()
    finally:
        db.close()

    return client.post(f"/api/baselines/{baseline_id}/scans").json()


def test_json_report_contains_counts_and_disclaimer(authed_client, workspace):
    scan = run_scan_with_drift(authed_client, workspace)
    report = authed_client.get(f"/api/scans/{scan['id']}/report.json").json()
    assert report["counts"] == {"matched": 1, "changed": 1, "missing": 0, "new": 0}
    assert "does not" in report["disclaimer"] and "safe" in report["disclaimer"]
    assert "filesystem" in report["disclaimer"]
    assert report["scan"]["generated_at"]
    assert report["findings"][0]["kind"] == "changed"


def test_csv_report_export(authed_client, workspace):
    scan = run_scan_with_drift(authed_client, workspace)
    response = authed_client.get(f"/api/scans/{scan['id']}/report.csv")
    assert response.status_code == 200
    assert "counts,changed,1" in response.text
    assert "finding,drift.conf" in response.text


def test_reports_require_auth(client):
    assert client.get("/api/scans/1/report.json").status_code == 401
