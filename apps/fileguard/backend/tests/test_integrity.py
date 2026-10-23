"""Hashing, baseline and comparison tests."""
from app import integrity

from conftest import upload


def test_sha256_matches_known_vector():
    # Independently checked: sha256("abc").
    assert integrity.sha256_bytes(b"abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"


def test_compare_detects_changed_missing_new_and_matched():
    manifest = [
        {"uid": "aaa", "file_id": 1, "display_name": "a.conf", "sha256": "aa" * 32, "size_bytes": 1},
        {"uid": "bbb", "file_id": 2, "display_name": "b.conf", "sha256": "bb" * 32, "size_bytes": 1},
        {"uid": "ccc", "file_id": 3, "display_name": "c.conf", "sha256": "cc" * 32, "size_bytes": 1},
    ]
    current = [
        integrity.ManifestEntry(uid="aaa", file_id=1, display_name="a.conf", sha256="aa" * 32, size_bytes=1),
        integrity.ManifestEntry(uid="bbb", file_id=2, display_name="b.conf", sha256="dd" * 32, size_bytes=1),
        integrity.ManifestEntry(uid="zzz", file_id=9, display_name="new.conf", sha256="ee" * 32, size_bytes=1),
    ]
    results = {r.kind: r for r in integrity.compare_to_baseline(manifest, current)}
    assert set(results) == {"matched", "changed", "missing", "new"}
    assert "expected" in results["changed"].explanation and "observed" in results["changed"].explanation
    assert "no longer registered" in results["missing"].explanation
    assert "not part of" in results["new"].explanation
    # Honest framing on matches:
    assert "not that the file is safe" in results["matched"].explanation


def test_baseline_and_scan_workflow(authed_client, workspace):
    upload(authed_client, workspace, "one.conf", b"content-1\n")
    upload(authed_client, workspace, "two.conf", b"content-2\n")
    baseline_id = authed_client.post(f"/api/workspaces/{workspace}/baselines?name=b1").json()["id"]
    assert authed_client.get(f"/api/workspaces/{workspace}/baselines").json()[0]["version"] == 1

    # No drift yet: scan reports 2 matched, no findings.
    scan = authed_client.post(f"/api/baselines/{baseline_id}/scans").json()
    assert scan == {"id": scan["id"], "matched": 2, "changed": 0, "missing": 0, "new": 0}
    assert authed_client.get(f"/api/scans/{scan['id']}/findings").json() == []

    # Drift: change one file's content in place, delete one, register one new.
    files = authed_client.get(f"/api/workspaces/{workspace}/files").json()
    one_id = next(f["id"] for f in files if f["display_name"] == "one.conf")
    two_id = next(f["id"] for f in files if f["display_name"] == "two.conf")
    authed_client.delete(f"/api/files/{one_id}")

    from app import config, integrity as integ

    from app.database import SessionLocal
    from app.models import StoredFile

    db = SessionLocal()
    try:
        stored = db.get(StoredFile, two_id)
        new_content = b"content-2 changed\n"
        (config.UPLOAD_DIR / stored.internal_name).write_bytes(new_content)
        stored.sha256 = integ.sha256_bytes(new_content)
        stored.size_bytes = len(new_content)
        db.commit()
    finally:
        db.close()

    upload(authed_client, workspace, "three.conf", b"content-3\n")
    scan2 = authed_client.post(f"/api/baselines/{baseline_id}/scans").json()
    findings = authed_client.get(f"/api/scans/{scan2['id']}/findings").json()
    kinds = sorted(f["kind"] for f in findings)
    assert kinds == ["changed", "missing", "new"]
    assert scan2["matched"] == 0


def test_changed_file_detection_with_same_name(authed_client, workspace):
    file_id = upload(authed_client, workspace, "app.conf", b"original\n")
    baseline_id = authed_client.post(f"/api/workspaces/{workspace}/baselines?name=b1").json()["id"]
    # Replace the stored content of the same registered file (simulating an edit).
    from app import config, integrity as integ

    from app.database import SessionLocal
    from app.models import StoredFile

    db = SessionLocal()
    try:
        stored = db.get(StoredFile, file_id)
        new_content = b"tampered\n"
        (config.UPLOAD_DIR / stored.internal_name).write_bytes(new_content)
        stored.sha256 = integ.sha256_bytes(new_content)
        stored.size_bytes = len(new_content)
        db.commit()
    finally:
        db.close()

    scan = authed_client.post(f"/api/baselines/{baseline_id}/scans").json()
    assert scan["changed"] == 1 and scan["matched"] == 0
    findings = authed_client.get(f"/api/scans/{scan['id']}/findings").json()
    assert findings[0]["kind"] == "changed"
    assert findings[0]["expected_sha256"] != findings[0]["observed_sha256"]

    # Mark reviewed with a note.
    updated = authed_client.patch(
        f"/api/findings/{findings[0]['id']}", json={"reviewed": True, "notes": "expected change"}
    ).json()
    assert updated["reviewed"] is True


def test_id_reuse_after_deletion_still_reports_missing_and_new(authed_client, workspace):
    """Regression: SQLite may reuse a deleted row id — identity must not collide."""
    upload(authed_client, workspace, "keep.conf", b"stable\n")
    highest_id = upload(authed_client, workspace, "going-away.conf", b"bye\n")
    baseline_id = authed_client.post(f"/api/workspaces/{workspace}/baselines?name=b1").json()["id"]
    authed_client.delete(f"/api/files/{highest_id}")
    upload(authed_client, workspace, "fresh.conf", b"hello\n")

    scan = authed_client.post(f"/api/baselines/{baseline_id}/scans").json()
    findings = authed_client.get(f"/api/scans/{scan['id']}/findings").json()
    kinds = sorted(f["kind"] for f in findings)
    assert kinds == ["missing", "new"]
    assert scan["matched"] == 1 and scan["changed"] == 0


def test_baseline_requires_files(authed_client, workspace):
    response = authed_client.post(f"/api/workspaces/{workspace}/baselines?name=b1")
    assert response.status_code == 400


def test_upload_rejects_unsupported_type(authed_client, workspace):
    response = authed_client.post(
        f"/api/workspaces/{workspace}/files", files={"file": ("evil.exe", b"MZ", "application/octet-stream")}
    )
    assert response.status_code == 400


def test_baseline_manifest_download(authed_client, workspace):
    upload(authed_client, workspace, "one.conf", b"content-1\n")
    baseline_id = authed_client.post(f"/api/workspaces/{workspace}/baselines?name=b1").json()["id"]
    manifest = authed_client.get(f"/api/baselines/{baseline_id}/manifest.json").json()
    assert manifest["version"] == 1
    assert manifest["manifest"][0]["display_name"] == "one.conf"
    assert len(manifest["manifest"][0]["sha256"]) == 64
