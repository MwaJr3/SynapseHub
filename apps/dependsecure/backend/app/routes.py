"""API routes: auth, projects, manifests, scans, findings, remediation, reports.

Server-side authorization everywhere; foreign resources return 404.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from . import audit, config, manifests, reporting
from .database import get_db
from .models import Finding, Manifest, Project, RemediationTask, Scan, User
from .security import create_session, destroy_session, hash_password, require_user, verify_password

api = APIRouter(prefix="/api")

SAFE_FILENAME_RE = re.compile(r"[^A-Za-z0-9._-]")
VALID_STATUSES = ("Open", "Under Review", "Resolved", "Accepted Risk")


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=200)
    display_name: str = Field(default="", max_length=120)


class ProjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    repository_ref: str = Field(default="", max_length=255)


class RemediationIn(BaseModel):
    status: str = "Open"
    assignee: str = Field(default="", max_length=120)
    notes: str = ""
    exception_reason: str = ""


def _owned_project(db: Session, user: User, project_id: int) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


def _owned_manifest(db: Session, user: User, manifest_id: int) -> Manifest:
    manifest = db.get(Manifest, manifest_id)
    if manifest is None or manifest.user_id != user.id:
        raise HTTPException(status_code=404, detail="Manifest not found.")
    return manifest


def _owned_scan(db: Session, user: User, scan_id: int) -> Scan:
    scan = db.get(Scan, scan_id)
    if scan is None or scan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Scan not found.")
    return scan


def _sanitize_filename(name: str) -> str:
    cleaned = SAFE_FILENAME_RE.sub("_", name.replace("\\", "/").split("/")[-1])
    return cleaned[:255] or "requirements.txt"


def _finding_dict(f: Finding, task: RemediationTask | None) -> dict:
    return {
        "id": f.id,
        "scan_id": f.scan_id,
        "package": f.package,
        "version": f.version,
        "advisory_id": f.advisory_id,
        "aliases": f.aliases,
        "source": f.source,
        "description": f.description,
        "fix_versions": f.fix_versions,
        "remediation": {
            "status": task.status if task else "Open",
            "assignee": task.assignee if task else "",
            "notes": task.notes if task else "",
            "exception_reason": task.exception_reason if task else "",
        },
    }


def _task_for(db: Session, finding_id: int) -> RemediationTask | None:
    return db.query(RemediationTask).filter(RemediationTask.finding_id == finding_id).first()


# --- Auth --------------------------------------------------------------------


@api.post("/auth/register")
def register(body: Credentials, response: Response, db: Session = Depends(get_db)) -> dict:
    email = body.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with that email already exists.")
    user = User(
        email=email,
        display_name=(body.display_name or email.split("@")[0])[:120],
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    session = create_session(db, user)
    response.set_cookie(config.SESSION_COOKIE_NAME, session.token, httponly=True, samesite="lax")
    return {"id": user.id, "email": user.email, "display_name": user.display_name}


@api.post("/auth/login")
def login(body: Credentials, response: Response, db: Session = Depends(get_db)) -> dict:
    user = db.query(User).filter(User.email == body.email.strip().lower()).first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    session = create_session(db, user)
    response.set_cookie(config.SESSION_COOKIE_NAME, session.token, httponly=True, samesite="lax")
    return {"id": user.id, "email": user.email, "display_name": user.display_name}


@api.post("/auth/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> dict:
    token = request.cookies.get(config.SESSION_COOKIE_NAME)
    if token:
        destroy_session(db, token)
    response.delete_cookie(config.SESSION_COOKIE_NAME)
    return {"ok": True}


@api.get("/auth/me")
def me(user: User = Depends(require_user)) -> dict:
    return {"id": user.id, "email": user.email, "display_name": user.display_name}


# --- Projects ----------------------------------------------------------------


@api.get("/projects")
def list_projects(user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[dict]:
    rows = db.query(Project).filter(Project.user_id == user.id).order_by(Project.created_at.desc()).all()
    result = []
    for p in rows:
        manifest_count = db.query(Manifest).filter(Manifest.project_id == p.id).count()
        scan_count = db.query(Scan).filter(Scan.project_id == p.id).count()
        finding_count = db.query(Finding).filter(Finding.project_id == p.id).count()
        result.append(
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "repository_ref": p.repository_ref,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "manifest_count": manifest_count,
                "scan_count": scan_count,
                "finding_count": finding_count,
            }
        )
    return result


@api.post("/projects")
def create_project(body: ProjectIn, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    project = Project(user_id=user.id, name=body.name, description=body.description, repository_ref=body.repository_ref)
    db.add(project)
    db.commit()
    return {"id": project.id}


@api.patch("/projects/{project_id}")
def update_project(
    project_id: int, body: ProjectIn, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> dict:
    project = _owned_project(db, user, project_id)
    project.name = body.name
    project.description = body.description
    project.repository_ref = body.repository_ref
    db.commit()
    return {"id": project.id}


@api.delete("/projects/{project_id}")
def delete_project(project_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    project = _owned_project(db, user, project_id)
    db.query(Finding).filter(Finding.project_id == project.id).delete()
    db.query(Scan).filter(Scan.project_id == project.id).delete()
    db.query(Manifest).filter(Manifest.project_id == project.id).delete()
    db.delete(project)
    db.commit()
    return {"ok": True}


# --- Manifests ---------------------------------------------------------------


@api.get("/projects/{project_id}/manifests")
def list_manifests(project_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[dict]:
    project = _owned_project(db, user, project_id)
    rows = db.query(Manifest).filter(Manifest.project_id == project.id).order_by(Manifest.uploaded_at.desc()).all()
    return [
        {
            "id": m.id,
            "filename": m.filename,
            "kind": m.kind,
            "package_count": len(m.packages or []),
            "errors": m.errors,
            "selected": bool(m.selected),
            "uploaded_at": m.uploaded_at.isoformat() if m.uploaded_at else None,
        }
        for m in rows
    ]


@api.post("/projects/{project_id}/manifests")
async def upload_manifest(
    project_id: int, file: UploadFile, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> dict:
    project = _owned_project(db, user, project_id)
    filename = _sanitize_filename(file.filename or "requirements.txt")
    suffix = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    if suffix not in config.ALLOWED_UPLOAD_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported manifest type '{suffix}'. Supported: requirements.txt (.txt) and pyproject.toml (.toml).",
        )
    content = await file.read()
    if len(content) > config.MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Manifest exceeds the size limit.")
    text = content.decode("utf-8", errors="replace")
    parsed = manifests.parse_manifest(filename, text)
    if not parsed.packages:
        raise HTTPException(
            status_code=400,
            detail=f"No usable packages parsed. First error: {parsed.errors[0]['reason'] if parsed.errors else 'empty manifest'}",
        )
    manifest = Manifest(
        project_id=project.id,
        user_id=user.id,
        filename=filename,
        kind=parsed.kind,
        content=text,
        packages=[{"name": p.name, "version_spec": p.version_spec} for p in parsed.packages],
        errors=parsed.errors,
    )
    db.add(manifest)
    db.commit()
    return {"id": manifest.id, "package_count": len(parsed.packages), "errors": parsed.errors}


@api.post("/manifests/{manifest_id}/select")
def select_manifest(manifest_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    manifest = _owned_manifest(db, user, manifest_id)
    db.query(Manifest).filter(Manifest.project_id == manifest.project_id).update({"selected": 0})
    manifest.selected = 1
    db.commit()
    return {"id": manifest.id, "selected": True}


@api.delete("/manifests/{manifest_id}")
def delete_manifest(manifest_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    manifest = _owned_manifest(db, user, manifest_id)
    db.delete(manifest)
    db.commit()
    return {"ok": True}


# --- Scans -------------------------------------------------------------------


@api.post("/manifests/{manifest_id}/scans")
def run_scan(manifest_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    manifest = _owned_manifest(db, user, manifest_id)
    result = audit.run_pip_audit(manifest.content, manifest.filename)
    scan = Scan(
        manifest_id=manifest.id,
        project_id=manifest.project_id,
        user_id=user.id,
        status=result.status,
        tool=result.tool,
        error=result.error,
        raw_result=result.raw,
        finished_at=datetime.now(timezone.utc),
    )
    db.add(scan)
    db.flush()
    if result.status == "completed":
        for item in result.findings:
            db.add(
                Finding(
                    scan_id=scan.id,
                    project_id=manifest.project_id,
                    user_id=user.id,
                    package=item.package,
                    version=item.version,
                    advisory_id=item.advisory_id,
                    aliases=item.aliases,
                    source=item.source,
                    description=item.description,
                    fix_versions=item.fix_versions,
                )
            )
        scan.status = "completed" if result.findings else "no-findings"
    db.commit()
    return {
        "id": scan.id,
        "status": scan.status,
        "findings": len(result.findings) if result.status == "completed" else 0,
        "error": scan.error,
    }


@api.get("/projects/{project_id}/scans")
def list_scans(project_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[dict]:
    project = _owned_project(db, user, project_id)
    rows = db.query(Scan).filter(Scan.project_id == project.id).order_by(Scan.started_at.desc()).all()
    return [
        {
            "id": s.id,
            "manifest_id": s.manifest_id,
            "status": s.status,
            "tool": s.tool,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "finished_at": s.finished_at.isoformat() if s.finished_at else None,
            "error": s.error,
            "finding_count": db.query(Finding).filter(Finding.scan_id == s.id).count(),
        }
        for s in rows
    ]


@api.get("/scans/{scan_id}/findings")
def scan_findings(scan_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[dict]:
    scan = _owned_scan(db, user, scan_id)
    rows = db.query(Finding).filter(Finding.scan_id == scan.id).order_by(Finding.package, Finding.advisory_id).all()
    return [_finding_dict(f, _task_for(db, f.id)) for f in rows]


@api.get("/projects/{project_id}/findings")
def project_findings(project_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[dict]:
    project = _owned_project(db, user, project_id)
    rows = db.query(Finding).filter(Finding.project_id == project.id).order_by(Finding.created_at.desc()).all()
    return [_finding_dict(f, _task_for(db, f.id)) for f in rows]


# --- Remediation -------------------------------------------------------------


@api.put("/findings/{finding_id}/remediation")
def set_remediation(
    finding_id: int, body: RemediationIn, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> dict:
    finding = db.get(Finding, finding_id)
    if finding is None or finding.user_id != user.id:
        raise HTTPException(status_code=404, detail="Finding not found.")
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(VALID_STATUSES)}")
    if body.status == "Accepted Risk" and not body.exception_reason.strip():
        raise HTTPException(status_code=400, detail="Accepted Risk requires a recorded exception reason.")
    task = _task_for(db, finding_id)
    if task is None:
        task = RemediationTask(finding_id=finding_id, user_id=user.id)
        db.add(task)
    task.status = body.status
    task.assignee = body.assignee
    task.notes = body.notes
    task.exception_reason = body.exception_reason
    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": task.id, "status": task.status}


# --- Reports -----------------------------------------------------------------


@api.get("/scans/{scan_id}/report.json")
def report_json(scan_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> Response:
    scan = _owned_scan(db, user, scan_id)
    project = _owned_project(db, user, scan.project_id)
    findings = db.query(Finding).filter(Finding.scan_id == scan.id).all()
    tasks = {f.id: _finding_dict(f, _task_for(db, f.id))["remediation"] for f in findings}
    report = reporting.build_report(project, scan, findings, tasks)
    return Response(
        content=__import__("json").dumps(report, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="dependsecure-report-{scan.id}.json"'},
    )


@api.get("/scans/{scan_id}/report.csv")
def report_csv(scan_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> Response:
    scan = _owned_scan(db, user, scan_id)
    project = _owned_project(db, user, scan.project_id)
    findings = db.query(Finding).filter(Finding.scan_id == scan.id).all()
    tasks = {f.id: _finding_dict(f, _task_for(db, f.id))["remediation"] for f in findings}
    report = reporting.build_report(project, scan, findings, tasks)
    return Response(
        content=reporting.report_to_csv(report),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="dependsecure-report-{scan.id}.csv"'},
    )
