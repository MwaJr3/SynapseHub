"""Seed a demonstration workspace with synthetic files and simulated scan results.

All files are uploaded into this application's workspace only — the demo never
claims to scan a real computer's filesystem.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from . import config, integrity
from .database import SessionLocal, init_db
from .models import Baseline, Finding, Scan, StoredFile, User, Workspace
from .security import hash_password

DEMO_EMAIL = "demo.admin@fileguard.example"
DEMO_PASSWORD = "demo-password-123"

DEMO_FILES = [
    ("nginx.conf", b"# simulated demo config\nworker_processes 1;\n"),
    ("appsettings.json", b'{"mode": "demo", "real": false}\n'),
    ("deploy-notes.md", b"# Deploy notes\nSimulated demonstration content.\n"),
    ("backup-script.sh", b"#!/bin/sh\necho simulated backup\n"),
]


def seed(db: Session) -> dict:
    existing = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if existing:
        return {"skipped": True, "email": DEMO_EMAIL}

    user = User(email=DEMO_EMAIL, display_name="Demo Admin (fictional)", password_hash=hash_password(DEMO_PASSWORD))
    db.add(user)
    db.flush()
    ws = Workspace(user_id=user.id, name="Demo workspace (simulated)", description=config.DEMO_MODE_LABEL)
    db.add(ws)
    db.flush()

    files: dict[str, StoredFile] = {}
    for name, content in DEMO_FILES:
        stored = StoredFile(
            workspace_id=ws.id,
            user_id=user.id,
            display_name=name,
            internal_name=f"seed-{name}",
            size_bytes=len(content),
            file_type=name.rsplit(".", 1)[-1],
            sha256=integrity.sha256_bytes(content),
        )
        db.add(stored)
        db.flush()
        config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        (config.UPLOAD_DIR / stored.internal_name).write_bytes(content)
        files[name] = stored

    entries = [
        integrity.ManifestEntry(
            uid=f.uid, file_id=f.id, display_name=f.display_name, sha256=f.sha256, size_bytes=f.size_bytes
        )
        for f in files.values()
    ]
    baseline = Baseline(
        workspace_id=ws.id,
        user_id=user.id,
        name="Demo baseline v1 (simulated)",
        version=1,
        manifest=integrity.build_manifest(entries),
    )
    db.add(baseline)
    db.flush()

    # Simulate drift after the baseline: change one file, delete one, register one new.
    changed = files["nginx.conf"]
    changed_content = b"# simulated demo config\nworker_processes 4;\n"
    (config.UPLOAD_DIR / changed.internal_name).write_bytes(changed_content)
    changed.sha256 = integrity.sha256_bytes(changed_content)
    changed.size_bytes = len(changed_content)

    removed = files["backup-script.sh"]
    (config.UPLOAD_DIR / removed.internal_name).unlink(missing_ok=True)
    db.delete(removed)
    db.flush()

    new_content = b"# simulated newly registered file\nwatchdog: enabled (demo)\n"
    new_file = StoredFile(
        workspace_id=ws.id,
        user_id=user.id,
        display_name="watchdog.cfg",
        internal_name="seed-watchdog.cfg",
        size_bytes=len(new_content),
        file_type="cfg",
        sha256=integrity.sha256_bytes(new_content),
    )
    db.add(new_file)
    db.flush()
    (config.UPLOAD_DIR / new_file.internal_name).write_bytes(new_content)

    current = [
        integrity.ManifestEntry(
            uid=f.uid, file_id=f.id, display_name=f.display_name, sha256=f.sha256, size_bytes=f.size_bytes
        )
        for f in db.query(StoredFile).filter(StoredFile.workspace_id == ws.id).all()
    ]
    results = integrity.compare_to_baseline(baseline.manifest, current)
    scan = Scan(workspace_id=ws.id, user_id=user.id, baseline_id=baseline.id)
    db.add(scan)
    db.flush()
    matched = 0
    for r in results:
        if r.kind == "matched":
            matched += 1
            continue
        db.add(
            Finding(
                scan_id=scan.id,
                workspace_id=ws.id,
                user_id=user.id,
                file_id=r.file_id,
                display_name=r.display_name,
                kind=r.kind,
                severity=integrity.DEFAULT_SEVERITY[r.kind],
                expected_sha256=r.expected_sha256,
                observed_sha256=r.observed_sha256,
                explanation=r.explanation,
                notes="Simulated result for demonstration purposes.",
            )
        )
    scan.matched_count = matched
    scan.summary = {kind: sum(1 for r in results if r.kind == kind) for kind in ("matched", "changed", "missing", "new")}
    db.commit()
    return {"skipped": False, "email": DEMO_EMAIL, "workspace_id": ws.id, "scan": scan.summary}


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        print(seed(db))
    finally:
        db.close()


if __name__ == "__main__":
    main()
