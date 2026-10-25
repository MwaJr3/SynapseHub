"""SecureCode Workbench API. Uploaded code is never executed; nothing is sent
to any AI service without explicit consent (and none is configured)."""
from __future__ import annotations

import os

from fastapi import Depends, FastAPI, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .archive_guard import ArchiveRejected, extract_archive, iter_source_files
from .config import settings
from .db import Base, engine, get_db
from .models import BaselineEntry, FindingRow, Project, ScanRun, SessionToken, User, now, ResetToken
from .parsers.bandit_parser import parse_bandit_json
from .redaction import AiConsentError, ai_payload
from .rules.python_rules import python_ruleset
from .rules.secrets_rules import secret_ruleset
from .security import (expiry, expiry_minutes, hash_password, new_token, otpauth_url,
                       totp_secret, totp_verify, verify_password)
from . import services

def _init_schema() -> None:
    """Create tables for local SQLite only.

    Postgres schemas are owned by Alembic. Connecting at import time would turn a
    cold-start database hiccup into a 500 on every route, so production defers all
    database contact until a request actually needs it.
    """
    if not settings.database_url.startswith("sqlite"):
        return
    Base.metadata.create_all(bind=engine)


_init_schema()
app = FastAPI(title="SecureCode Workbench", version="0.1.0")
def _extra_origins() -> list[str]:
    """Origins added at deployment time via ALLOWED_ORIGINS (comma-separated)."""
    raw = os.environ.get("ALLOWED_ORIGINS", "")
    return [value.strip() for value in raw.split(",") if value.strip()]


app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5176", "http://127.0.0.1:5176"] + _extra_origins(),
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("scw_session", "")
    row = db.get(SessionToken, token) if token else None
    if row is None or row.revoked or row.expires_at < now():
        raise HTTPException(401, "not authenticated")
    return db.get(User, row.user_id)


class AuthBody(BaseModel):
    email: str
    password: str
    display_name: str = ""
    mfa_code: str = ""


def _session_response(db: Session, user: User) -> JSONResponse:
    token = new_token()
    db.add(SessionToken(token=token, user_id=user.id, label="web", expires_at=expiry(settings.session_days)))
    db.commit()
    resp = JSONResponse({"ok": True, "email": user.email, "role": user.role,
                         "mfa_enabled": bool(user.mfa_enabled)})
    resp.set_cookie("scw_session", token, httponly=True, samesite="lax", max_age=settings.session_days * 86400)
    return resp


@app.post("/api/auth/register")
def register(body: AuthBody, db: Session = Depends(get_db)):
    if len(body.password) < 12 or "@" not in body.email:
        return JSONResponse({"error": "email required; password must be 12+ characters"}, status_code=422)
    if db.query(User).filter(User.email == body.email).first():
        return JSONResponse({"error": "registration failed"}, status_code=422)
    pw, salt = hash_password(body.password)
    db.add(User(email=body.email, password_hash=pw, salt=salt, display_name=body.display_name[:120]))
    db.commit()
    return {"ok": True}


@app.post("/api/auth/login")
def login(body: AuthBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if user is None or not verify_password(body.password, user.password_hash, user.salt):
        return JSONResponse({"error": "sign-in failed"}, status_code=401)
    if user.mfa_enabled:
        if not body.mfa_code or not user.mfa_secret or not totp_verify(user.mfa_secret, body.mfa_code):
            return JSONResponse({"error": "sign-in failed"}, status_code=401)
    return _session_response(db, user)


@app.post("/api/auth/logout")
def logout(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("scw_session", "")
    row = db.get(SessionToken, token) if token else None
    if row is not None:
        row.revoked = 1
        db.commit()
    resp = JSONResponse({"ok": True})
    resp.delete_cookie("scw_session")
    return resp


@app.get("/api/me")
def me(user: User = Depends(current_user)):
    return {"email": user.email, "role": user.role, "mfa_enabled": bool(user.mfa_enabled)}


class ResetRequest(BaseModel):
    email: str


@app.post("/api/auth/reset/request")
def reset_request(body: ResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    payload: dict = {"ok": True, "note": "If that account exists, a reset token was created."}
    if user is not None:
        token = new_token()
        db.add(ResetToken(token=token, user_id=user.id, expires_at=expiry_minutes(settings.reset_token_minutes)))
        db.commit()
        if settings.reset_delivery == "dev":
            payload["dev_token"] = token
            payload["dev_note"] = ("DEV DELIVERY: no email is sent in this environment. "
                                   "Configure SMTP + set RESET_DELIVERY=smtp at deployment.")
    return payload


class ResetConfirm(BaseModel):
    token: str
    new_password: str


@app.post("/api/auth/reset/confirm")
def reset_confirm(body: ResetConfirm, db: Session = Depends(get_db)):
    row = db.get(ResetToken, body.token)
    if row is None or row.used or row.expires_at < now() or len(body.new_password) < 12:
        return JSONResponse({"error": "reset failed"}, status_code=422)
    user = db.get(User, row.user_id)
    pw, salt = hash_password(body.new_password)
    user.password_hash, user.salt = pw, salt
    row.used = 1
    db.query(SessionToken).filter(SessionToken.user_id == user.id).update({"revoked": 1})
    db.commit()
    return {"ok": True, "note": "Password changed; all existing sessions were revoked."}


class MfaEnable(BaseModel):
    code: str


@app.post("/api/auth/mfa/enroll")
def mfa_enroll(user: User = Depends(current_user), db: Session = Depends(get_db)):
    secret = totp_secret()
    user.mfa_secret = secret
    user.mfa_enabled = 0
    db.commit()
    return {"secret": secret, "otpauth_url": otpauth_url(secret, user.email, "PhishLens"),
            "note": "Enter the secret in any TOTP authenticator, then call mfa/enable with a code. "
                    "No QR image is generated in this environment."}


@app.post("/api/auth/mfa/enable")
def mfa_enable(body: MfaEnable, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not user.mfa_secret or not totp_verify(user.mfa_secret, body.code):
        return JSONResponse({"error": "invalid code"}, status_code=422)
    user.mfa_enabled = 1
    db.commit()
    return {"ok": True, "mfa_enabled": True}


@app.get("/api/auth/sessions")
def list_sessions(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = (db.query(SessionToken)
            .filter(SessionToken.user_id == user.id, SessionToken.revoked == 0)
            .order_by(SessionToken.created_at).all())
    return {"sessions": [{"token": r.token[:8] + "…", "label": r.label,
                          "created_at": r.created_at, "expires_at": r.expires_at} for r in rows]}


@app.post("/api/auth/sessions/revoke-others")
def revoke_others(request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    current = request.cookies.get("scw_session", "")
    db.query(SessionToken).filter(SessionToken.user_id == user.id,
                                  SessionToken.token != current).update({"revoked": 1})
    db.commit()
    return {"ok": True}



class PasteBody(BaseModel):
    name: str
    files: list[dict]        # [{path, content}]
    project_id: int | None = None   # attach run to an existing project (baseline reuse)


class BanditBody(BaseModel):
    name: str
    results: dict


def _store_findings(db: Session, run: ScanRun, findings, baselined: set[str]) -> int:
    stored = 0
    for f in findings:
        row_dict = services.finding_to_row(f, run.id)
        row = FindingRow(**row_dict, triage="suppressed" if row_dict["fingerprint"] in baselined else "open")
        db.add(row)
        stored += 1
    return stored


@app.post("/api/projects/paste")
def create_from_paste(body: PasteBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not body.files or len(body.files) > 200:
        return JSONResponse({"error": "1-200 files required"}, status_code=422)
    project = (db.query(Project).filter(Project.id == body.project_id, Project.owner_id == user.id).first()
               if body.project_id else None)
    if project is None:
        project = Project(owner_id=user.id, name=body.name[:200], source_kind="paste")
        db.add(project)
        db.flush()
    run = ScanRun(project_id=project.id, started_at=now(), limitations=services.LIMITATIONS)
    db.add(run)
    db.flush()
    files = [(str(f.get("path", "pasted.txt"))[:500], str(f.get("content", ""))[:200_000]) for f in body.files]
    findings = python_ruleset.run(files) + secret_ruleset.run(files)
    baselined = {b.fingerprint for b in db.query(BaselineEntry).filter(BaselineEntry.project_id == project.id)}
    run.files_scanned = len(files)
    run.finding_count = _store_findings(db, run, findings, baselined)
    db.commit()
    return {"project_id": project.id, "run_id": run.id, "findings": run.finding_count,
            "files_scanned": run.files_scanned, "limitations": services.LIMITATIONS}


@app.post("/api/projects/archive")
async def create_from_archive(name: str, file: UploadFile, user: User = Depends(current_user),
                              db: Session = Depends(get_db)):
    data = await file.read()
    try:
        extraction = extract_archive(data, settings.max_archive_bytes, settings.max_uncompressed_bytes,
                                     settings.max_files, settings.max_compression_ratio)
    except ArchiveRejected as exc:
        return JSONResponse({"error": str(exc)}, status_code=422)
    try:
        files = list(iter_source_files(extraction.root))
        project = Project(owner_id=user.id, name=name[:200], source_kind="archive")
        db.add(project)
        db.flush()
        run = ScanRun(project_id=project.id, started_at=now(), limitations=services.LIMITATIONS)
        db.add(run)
        db.flush()
        findings = python_ruleset.run(files) + secret_ruleset.run(files)
        baselined = {b.fingerprint for b in db.query(BaselineEntry).filter(BaselineEntry.project_id == project.id)}
        run.files_scanned = len(files)
        run.finding_count = _store_findings(db, run, findings, baselined)
        db.commit()
        return {"project_id": project.id, "run_id": run.id, "findings": run.finding_count,
                "files_scanned": run.files_scanned, "limitations": services.LIMITATIONS}
    finally:
        extraction.cleanup()


@app.post("/api/projects/bandit")
def create_from_bandit(body: BanditBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    findings = parse_bandit_json(body.results)
    project = Project(owner_id=user.id, name=body.name[:200], source_kind="bandit-json")
    db.add(project)
    db.flush()
    run = ScanRun(project_id=project.id, started_at=now(), limitations=services.LIMITATIONS)
    db.add(run)
    db.flush()
    baselined = {b.fingerprint for b in db.query(BaselineEntry).filter(BaselineEntry.project_id == project.id)}
    run.finding_count = _store_findings(db, run, findings, baselined)
    db.commit()
    return {"project_id": project.id, "run_id": run.id, "findings": run.finding_count}


@app.get("/api/projects")
def list_projects(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = (db.query(Project, ScanRun).join(ScanRun, ScanRun.project_id == Project.id)
            .order_by(Project.id.desc()).all())
    return {"projects": [{"id": p.id, "name": p.name, "source_kind": p.source_kind,
                          "run_id": r.id, "findings": r.finding_count,
                          "files_scanned": r.files_scanned} for p, r in rows]}


@app.get("/api/runs/{run_id}/findings")
def run_findings(run_id: int, severity: str = "", triage: str = "",
                 user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = db.query(FindingRow).filter(FindingRow.run_id == run_id)
    if severity:
        q = q.filter(FindingRow.severity == severity)
    if triage:
        q = q.filter(FindingRow.triage == triage)
    rows = q.order_by(FindingRow.id).all()
    return {"findings": [{"id": f.id, "rule_id": f.rule_id, "title": f.title, "severity": f.severity,
                          "cwe": f.cwe, "path": f.path, "line": f.line, "evidence": f.evidence,
                          "explanation": f.explanation, "suggested_fix": f.suggested_fix,
                          "triage": f.triage} for f in rows]}


class TriageBody(BaseModel):
    triage: str              # open | accepted | fixed | suppressed
    note: str = ""


@app.patch("/api/findings/{finding_id}/triage")
def triage_finding(finding_id: int, body: TriageBody, user: User = Depends(current_user),
                   db: Session = Depends(get_db)):
    if body.triage not in ("open", "accepted", "fixed", "suppressed"):
        raise HTTPException(422, "triage must be open|accepted|fixed|suppressed")
    f = db.get(FindingRow, finding_id)
    if f is None:
        raise HTTPException(404, "finding not found")
    f.triage = body.triage
    run = db.get(ScanRun, f.run_id)
    if body.triage == "suppressed" and run is not None:
        exists = (db.query(BaselineEntry)
                  .filter(BaselineEntry.project_id == run.project_id,
                          BaselineEntry.fingerprint == f.fingerprint).first())
        if exists is None:
            db.add(BaselineEntry(project_id=run.project_id, fingerprint=f.fingerprint, note=body.note[:500]))
    db.commit()
    return {"id": f.id, "triage": f.triage}


@app.get("/api/runs/{run_id}/report")
def export_report(run_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    run = db.get(ScanRun, run_id)
    if run is None:
        raise HTTPException(404, "run not found")
    project = db.get(Project, run.project_id)
    rows = db.query(FindingRow).filter(FindingRow.run_id == run_id).all()
    findings = [{"severity": f.severity, "rule_id": f.rule_id, "title": f.title, "cwe": f.cwe,
                 "path": f.path, "line": f.line, "evidence": f.evidence,
                 "suggested_fix": f.suggested_fix, "triage": f.triage} for f in rows]
    return services.report_payload(run, findings, project.name if project else "")


class AiBody(BaseModel):
    run_id: int
    consent: bool


@app.post("/api/ai-review")
def ai_review(body: AiBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    run = db.get(ScanRun, body.run_id)
    if run is None:
        raise HTTPException(404, "run not found")
    try:
        ai_payload([], "", ai_enabled=settings.ai_enabled,
                   consent_given=body.consent, endpoint=settings.ai_endpoint)
    except AiConsentError as exc:
        run.ai_consent = f"declined: {str(exc)[:60]}" if not body.consent else f"requested: {str(exc)[:60]}"
        db.commit()
        return JSONResponse({"sent": False, "reason": str(exc)}, status_code=200)
    return {"sent": False}


@app.get("/api/health")
def health():
    return {"ok": True, "app": "securecode-workbench",
            "ai_enabled": settings.ai_enabled,
            "note": "Code review assistance only — uploaded code is never executed."}

@app.get("/health")
def health() -> JSONResponse:
    """Liveness plus database reachability.

    Kept separate from the domain routes: it reports whether the function booted
    and whether Postgres answers `SELECT 1`, without touching any table. Failures
    are returned as a short scrubbed message so a broken connection is
    diagnosable from outside without exposing credentials.
    """
    import re as _re

    from sqlalchemy import text

    def _scrub(value: str) -> str:
        # Remove any user:password@ fragment before it can reach a response.
        return _re.sub(r"://[^@\s]*@", "://***@", value)[:200]

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001 - diagnostics surface the real cause
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "database": "unavailable",
                "error": type(exc).__name__,
                "detail": _scrub(str(exc)),
            },
        )
    return JSONResponse(
        content={"status": "ok", "database": "connected", "app": "securecode-workbench"}
    )


@app.get("/health/write")
def health_write():
    """Write probe: proves the deployed API can write to its database.

    Disabled unless `HEALTH_WRITE_PROBE=1`, so a public deployment does not expose
    a writable endpoint. It creates a one-column probe table if absent, inserts a
    row, counts it and deletes it again - the write is real and nothing is
    retained. Returns a scrubbed message on failure.
    """
    import os as _os
    import re as _re

    from sqlalchemy import text

    if _os.environ.get("HEALTH_WRITE_PROBE") != "1":
        raise HTTPException(404, "not found")

    def _scrub(value: str) -> str:
        return _re.sub(r"://[^@\s]*@", "://***@", value)[:200]

    try:
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE IF NOT EXISTS _health_probe (id TEXT PRIMARY KEY)"))
            connection.execute(text("INSERT INTO _health_probe (id) VALUES ('probe') ON CONFLICT DO NOTHING"))
            rows = connection.execute(text("SELECT COUNT(*) FROM _health_probe")).scalar_one()
            connection.execute(text("DELETE FROM _health_probe WHERE id = 'probe'"))
    except Exception as exc:  # noqa: BLE001 - diagnostics surface the real cause
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "database": "not writable",
                "error": type(exc).__name__,
                "detail": _scrub(str(exc)),
            },
        )
    return JSONResponse(content={"status": "ok", "database": "writable", "rows_written": 1, "rows_seen": rows})
