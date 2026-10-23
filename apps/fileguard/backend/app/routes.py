"""API routes: auth, workspaces, files, baselines, scans, findings, reports.

Server-side authorization on every protected operation: missing or foreign
resources return 404 so URLs do not leak other users' data.
"""
from __future__ import annotations

import json
import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from . import config, integrity, reporting
from .database import get_db
from .models import AuthSession, Baseline, Finding, Scan, StoredFile, User, Workspace
from .security import create_session, destroy_session, hash_password, require_user, verify_password

api = APIRouter(prefix="/api")

SAFE_FILENAME_RE = re.compile(r"[^A-Za-z0-9._-]")


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=200)
    display_name: str = Field(default="", max_length=120)


class WorkspaceIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""


class FindingUpdate(BaseModel):
    reviewed: bool
    notes: str = ""
    severity: str = ""


def _owned_workspace(db: Session, user: User, workspace_id: int) -> Workspace:
    ws = db.get(Workspace, workspace_id)
    if ws is None or ws.user_id != user.id:
        raise HTTPException(status_code=404, detail="Workspace not found.")
    return ws


def _owned_file(db: Session, user: User, file_id: int) -> StoredFile:
    f = db.get(StoredFile, file_id)
    if f is None or f.user_id != user.id:
        raise HTTPException(status_code=404, detail="File not found.")
    return f


def _owned_baseline(db: Session, user: User, baseline_id: int) -> Baseline:
    b = db.get(Baseline, baseline_id)
    if b is None or b.user_id != user.id:
        raise HTTPException(status_code=404, detail="Baseline not found.")
    return b


def _owned_scan(db: Session, user: User, scan_id: int) -> Scan:
    s = db.get(Scan, scan_id)
    if s is None or s.user_id != user.id:
        raise HTTPException(status_code=404, detail="Scan not found.")
    return s


def _sanitize_filename(name: str) -> str:
    cleaned = SAFE_FILENAME_RE.sub("_", name.replace("\\", "/").split("/")[-1])
    return cleaned[:255] or "upload.txt"


def _manifest_entries(db: Session, workspace_id: int, file_ids: list[int] | None = None) -> list[integrity.ManifestEntry]:
    query = db.query(StoredFile).filter(StoredFile.workspace_id == workspace_id)
    rows = query.all()
    if file_ids is not None:
        wanted = set(file_ids)
        rows = [r for r in rows if r.id in wanted]
    return [
        integrity.ManifestEntry(
            uid=r.uid, file_id=r.id, display_name=r.display_name, sha256=r.sha256, size_bytes=r.size_bytes
        )
        for r in rows
    ]


# --- Auth (same contract as the suite) --------------------------------------


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


# --- Workspaces --------------------------------------------------------------


@api.get("/workspaces")
def list_workspaces(user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[dict]:
    rows = db.query(Workspace).filter(Workspace.user_id == user.id).order_by(Workspace.created_at.desc()).all()
    result = []
    for ws in rows:
        file_count = db.query(StoredFile).filter(StoredFile.workspace_id == ws.id).count()
        baseline_count = db.query(Baseline).filter(Baseline.workspace_id == ws.id).count()
        scan_count = db.query(Scan).filter(Scan.workspace_id == ws.id).count()
        result.append(
            {
                "id": ws.id,
                "name": ws.name,
                "description": ws.description,
                "created_at": ws.created_at.isoformat() if ws.created_at else None,
                "file_count": file_count,
                "baseline_count": baseline_count,
                "scan_count": scan_count,
            }
        )
    return result


@api.post("/workspaces")
def create_workspace(body: WorkspaceIn, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    ws = Workspace(user_id=user.id, name=body.name, description=body.description)
    db.add(ws)
    db.commit()
    return {"id": ws.id}


@api.patch("/workspaces/{workspace_id}")
def update_workspace(
    workspace_id: int, body: WorkspaceIn, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> dict:
    ws = _owned_workspace(db, user, workspace_id)
    ws.name = body.name
    ws.description = body.description
    db.commit()
    return {"id": ws.id}


@api.delete("/workspaces/{workspace_id}")
def delete_workspace(workspace_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    ws = _owned_workspace(db, user, workspace_id)
    db.query(StoredFile).filter(StoredFile.workspace_id == ws.id).delete()
    db.delete(ws)
    db.commit()
    return {"ok": True}


# --- Files -------------------------------------------------------------------


@api.get("/workspaces/{workspace_id}/files")
def list_files(workspace_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[dict]:
    ws = _owned_workspace(db, user, workspace_id)
    rows = db.query(StoredFile).filter(StoredFile.workspace_id == ws.id).order_by(StoredFile.uploaded_at).all()
    return [
        {
            "id": f.id,
            "display_name": f.display_name,
            "size_bytes": f.size_bytes,
            "file_type": f.file_type,
            "sha256": f.sha256,
            "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else None,
        }
        for f in rows
    ]


@api.post("/workspaces/{workspace_id}/files")
async def upload_file(
    workspace_id: int, file: UploadFile, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> dict:
    ws = _owned_workspace(db, user, workspace_id)
    display_name = _sanitize_filename(file.filename or "upload.txt")
    suffix = ("." + display_name.rsplit(".", 1)[-1].lower()) if "." in display_name else ""
    if suffix not in config.ALLOWED_UPLOAD_SUFFIXES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{suffix}'.")
    content = await file.read()
    if len(content) > config.MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the configured size limit.")
    # Generated internal name: user input never becomes a storage path.
    internal_name = f"{uuid.uuid4().hex}{suffix}"
    (config.UPLOAD_DIR / internal_name).write_bytes(content)
    stored = StoredFile(
        workspace_id=ws.id,
        user_id=user.id,
        display_name=display_name,
        internal_name=internal_name,
        size_bytes=len(content),
        file_type=suffix.lstrip(".") or "txt",
        sha256=integrity.sha256_bytes(content),
    )
    db.add(stored)
    db.commit()
    return {"id": stored.id, "sha256": stored.sha256}


@api.get("/files/{file_id}")
def file_detail(file_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    f = _owned_file(db, user, file_id)
    return {
        "id": f.id,
        "workspace_id": f.workspace_id,
        "display_name": f.display_name,
        "size_bytes": f.size_bytes,
        "file_type": f.file_type,
        "sha256": f.sha256,
        "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else None,
    }


@api.get("/files/{file_id}/download")
def download_file(file_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> Response:
    f = _owned_file(db, user, file_id)
    path = config.UPLOAD_DIR / f.internal_name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Stored content is no longer available.")
    return Response(
        content=path.read_bytes(),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{f.display_name}"'},
    )


@api.delete("/files/{file_id}")
def delete_file(file_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    f = _owned_file(db, user, file_id)
    path = config.UPLOAD_DIR / f.internal_name
    if path.is_file():
        path.unlink()
    db.delete(f)
    db.commit()
    return {"ok": True}


# --- Baselines ---------------------------------------------------------------


@api.post("/workspaces/{workspace_id}/baselines")
def create_baseline(
    workspace_id: int,
    name: str = "Baseline",
    file_ids: str = "",
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict:
    """Create a baseline (next version) from the workspace's registered files."""
    ws = _owned_workspace(db, user, workspace_id)
    selected = [int(x) for x in file_ids.split(",") if x.strip().isdigit()] if file_ids else None
    entries = _manifest_entries(db, ws.id, selected)
    if not entries:
        raise HTTPException(status_code=400, detail="Register at least one file before creating a baseline.")
    last = (
        db.query(Baseline)
        .filter(Baseline.workspace_id == ws.id)
        .order_by(Baseline.version.desc())
        .first()
    )
    baseline = Baseline(
        workspace_id=ws.id,
        user_id=user.id,
        name=name[:200],
        version=(last.version + 1) if last else 1,
        manifest=integrity.build_manifest(entries),
    )
    db.add(baseline)
    db.commit()
    return {"id": baseline.id, "version": baseline.version}


@api.get("/workspaces/{workspace_id}/baselines")
def list_baselines(workspace_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[dict]:
    ws = _owned_workspace(db, user, workspace_id)
    rows = db.query(Baseline).filter(Baseline.workspace_id == ws.id).order_by(Baseline.version).all()
    return [
        {
            "id": b.id,
            "name": b.name,
            "version": b.version,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "entry_count": len(b.manifest or []),
        }
        for b in rows
    ]


@api.get("/baselines/{baseline_id}/manifest.json")
def download_manifest(baseline_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> Response:
    b = _owned_baseline(db, user, baseline_id)
    payload = {"baseline_id": b.id, "name": b.name, "version": b.version, "manifest": b.manifest}
    return Response(
        content=json.dumps(payload, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="baseline-{b.id}-v{b.version}.json"'},
    )


@api.delete("/baselines/{baseline_id}")
def delete_baseline(baseline_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    b = _owned_baseline(db, user, baseline_id)
    db.delete(b)
    db.commit()
    return {"ok": True}


# --- Scans and findings ------------------------------------------------------


@api.post("/baselines/{baseline_id}/scans")
def run_scan(baseline_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    """Compare the workspace's current registered files with a baseline."""
    b = _owned_baseline(db, user, baseline_id)
    entries = _manifest_entries(db, b.workspace_id)
    results = integrity.compare_to_baseline(b.manifest or [], entries)
    scan = Scan(workspace_id=b.workspace_id, user_id=user.id, baseline_id=b.id)
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
                workspace_id=b.workspace_id,
                user_id=user.id,
                file_id=r.file_id,
                display_name=r.display_name,
                kind=r.kind,
                severity=integrity.DEFAULT_SEVERITY[r.kind],
                expected_sha256=r.expected_sha256,
                observed_sha256=r.observed_sha256,
                explanation=r.explanation,
            )
        )
    scan.matched_count = matched
    scan.summary = {
        "matched": matched,
        "changed": sum(1 for r in results if r.kind == "changed"),
        "missing": sum(1 for r in results if r.kind == "missing"),
        "new": sum(1 for r in results if r.kind == "new"),
    }
    db.commit()
    return {"id": scan.id, **scan.summary}


@api.get("/workspaces/{workspace_id}/scans")
def list_scans(workspace_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[dict]:
    ws = _owned_workspace(db, user, workspace_id)
    rows = db.query(Scan).filter(Scan.workspace_id == ws.id).order_by(Scan.created_at.desc()).all()
    return [
        {
            "id": s.id,
            "baseline_id": s.baseline_id,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "matched_count": s.matched_count,
            "summary": s.summary,
        }
        for s in rows
    ]


@api.get("/scans/{scan_id}/findings")
def list_findings(scan_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[dict]:
    s = _owned_scan(db, user, scan_id)
    rows = db.query(Finding).filter(Finding.scan_id == s.id).order_by(Finding.kind, Finding.display_name).all()
    return [
        {
            "id": f.id,
            "display_name": f.display_name,
            "kind": f.kind,
            "severity": f.severity,
            "expected_sha256": f.expected_sha256,
            "observed_sha256": f.observed_sha256,
            "explanation": f.explanation,
            "reviewed": f.reviewed,
            "notes": f.notes,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in rows
    ]


@api.get("/workspaces/{workspace_id}/findings")
def workspace_findings(workspace_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[dict]:
    ws = _owned_workspace(db, user, workspace_id)
    rows = db.query(Finding).filter(Finding.workspace_id == ws.id).order_by(Finding.created_at.desc()).all()
    return [
        {
            "id": f.id,
            "scan_id": f.scan_id,
            "display_name": f.display_name,
            "kind": f.kind,
            "severity": f.severity,
            "expected_sha256": f.expected_sha256,
            "observed_sha256": f.observed_sha256,
            "explanation": f.explanation,
            "reviewed": f.reviewed,
            "notes": f.notes,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in rows
    ]


@api.patch("/findings/{finding_id}")
def update_finding(
    finding_id: int, body: FindingUpdate, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> dict:
    f = db.get(Finding, finding_id)
    if f is None or f.user_id != user.id:
        raise HTTPException(status_code=404, detail="Finding not found.")
    f.reviewed = body.reviewed
    f.notes = body.notes
    if body.severity:
        if body.severity not in ("low", "medium", "high"):
            raise HTTPException(status_code=400, detail="Severity must be low, medium or high.")
        f.severity = body.severity
    db.commit()
    return {"id": f.id, "reviewed": f.reviewed}


# --- Reports -----------------------------------------------------------------


@api.get("/scans/{scan_id}/report.json")
def report_json(scan_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> Response:
    s = _owned_scan(db, user, scan_id)
    findings = db.query(Finding).filter(Finding.scan_id == s.id).all()
    baseline = db.get(Baseline, s.baseline_id)
    summary = reporting.build_scan_summary(s, findings, baseline)
    return Response(
        content=json.dumps(summary, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="integrity-report-{s.id}.json"'},
    )


@api.get("/scans/{scan_id}/report.csv")
def report_csv(scan_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> Response:
    s = _owned_scan(db, user, scan_id)
    findings = db.query(Finding).filter(Finding.scan_id == s.id).all()
    baseline = db.get(Baseline, s.baseline_id)
    summary = reporting.build_scan_summary(s, findings, baseline)
    return Response(
        content=reporting.summary_to_csv(summary),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="integrity-report-{s.id}.csv"'},
    )
