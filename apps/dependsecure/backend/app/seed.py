"""Seed demo data.

The demo project's findings come from a **reproducible pip-audit scan** of a
manifest of deliberately old pinned versions, executed at seed time and stored
verbatim (raw result preserved). If the scanner or network is unavailable, the
seed falls back to clearly-labelled *illustrative* records whose identifiers
are explicitly NOT real advisories.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from . import audit, config, manifests
from .database import SessionLocal, init_db
from .models import Finding, Manifest, Project, RemediationTask, Scan, User
from .security import hash_password

DEMO_EMAIL = "demo.dev@dependsecure.example"
DEMO_PASSWORD = "demo-password-123"

DEMO_MANIFEST = "requests==2.19.0\npyyaml==5.3.1\njinja2==2.10\n"

ILLUSTRATIVE = [
    ("demo-pkg-a", "0.1.0", "ILLUSTRATIVE-001", ["ILLUSTRATIVE-CVE-0001"], "Illustrative record only — not a real advisory. A dependency pinned to a version with a known issue would appear here.", ["1.0.0"]),
    ("demo-pkg-b", "2.3.4", "ILLUSTRATIVE-002", [], "Illustrative record only — not a real advisory. Demonstrates the remediation workflow without claiming a real vulnerability.", ["2.3.5"]),
]


def seed(db: Session) -> dict:
    existing = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if existing:
        return {"skipped": True, "email": DEMO_EMAIL}

    user = User(email=DEMO_EMAIL, display_name="Demo Developer (fictional)", password_hash=hash_password(DEMO_PASSWORD))
    db.add(user)
    db.flush()
    project = Project(
        user_id=user.id,
        name="Demo supply-chain workspace",
        description="Demonstration project. The manifest pins deliberately old package versions so a reproducible audit returns real advisory identifiers.",
        repository_ref="(demo — no repository configured)",
    )
    db.add(project)
    db.flush()

    parsed = manifests.parse_manifest("requirements.txt", DEMO_MANIFEST)
    manifest = Manifest(
        project_id=project.id,
        user_id=user.id,
        filename="requirements.txt",
        kind="requirements",
        content=DEMO_MANIFEST,
        packages=[{"name": p.name, "version_spec": p.version_spec} for p in parsed.packages],
        errors=parsed.errors,
        selected=1,
    )
    db.add(manifest)
    db.flush()

    result = audit.run_pip_audit(DEMO_MANIFEST, "requirements.txt")
    scan = Scan(
        manifest_id=manifest.id,
        project_id=project.id,
        user_id=user.id,
        status=result.status if result.status == "failed" else ("completed" if result.findings else "no-findings"),
        tool="pip-audit (reproducible demo scan)" if result.status == "completed" else "pip-audit",
        error=result.error,
        raw_result=result.raw,
        finished_at=datetime.now(timezone.utc),
    )
    db.add(scan)
    db.flush()

    created = 0
    if result.status == "completed":
        for item in result.findings:
            db.add(
                Finding(
                    scan_id=scan.id,
                    project_id=project.id,
                    user_id=user.id,
                    package=item.package,
                    version=item.version,
                    advisory_id=item.advisory_id,
                    aliases=item.aliases,
                    source="pip-audit",
                    description=item.description,
                    fix_versions=item.fix_versions,
                )
            )
            created += 1
    else:
        for package, version, advisory, aliases, description, fixes in ILLUSTRATIVE:
            db.add(
                Finding(
                    scan_id=scan.id,
                    project_id=project.id,
                    user_id=user.id,
                    package=package,
                    version=version,
                    advisory_id=advisory,
                    aliases=aliases,
                    source="demo-illustrative (NOT a real advisory)",
                    description=description,
                    fix_versions=fixes,
                )
            )
            created += 1

    db.flush()
    first = db.query(Finding).filter(Finding.scan_id == scan.id).first()
    if first is not None:
        db.add(
            RemediationTask(
                finding_id=first.id,
                user_id=user.id,
                status="Under Review",
                assignee="Demo Developer (fictional)",
                notes="Example remediation record demonstrating the review workflow.",
            )
        )
    db.commit()
    return {
        "skipped": False,
        "email": DEMO_EMAIL,
        "scan_status": scan.status,
        "findings": created,
        "source": "reproducible pip-audit scan" if result.status == "completed" else "illustrative fallback",
    }


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        print(seed(db))
    finally:
        db.close()


if __name__ == "__main__":
    main()
