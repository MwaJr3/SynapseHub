"""AssetWatch API. Authorization is enforced before every scan."""
from __future__ import annotations

import os

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .authorization import AuthorizationError, validate_targets
from .config import settings
from .db import Base, engine, get_db
from .diffing import diff_runs
from .models import (AllowlistEntry, Asset, Finding, Observation, RemediationTask, ResetToken,
                     ScanRun, SessionToken, User, now)
from .scanners.base import ScannerError
from .scanners.import_adapter import ImportScanner
from .scanners.simulated import SimulatedScanner
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
app = FastAPI(title="AssetWatch", version="0.1.0")
def _extra_origins() -> list[str]:
    """Origins added at deployment time via ALLOWED_ORIGINS (comma-separated)."""
    raw = os.environ.get("ALLOWED_ORIGINS", "")
    return [value.strip() for value in raw.split(",") if value.strip()]


app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5175", "http://127.0.0.1:5175"] + _extra_origins(),
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("aw_session", "")
    row = db.get(SessionToken, token) if token else None
    if row is None or row.revoked or row.expires_at < now():
        raise HTTPException(401, "not authenticated")
    return db.get(User, row.user_id)


def require_admin(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "admin role required")
    return user


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
    resp.set_cookie("aw_session", token, httponly=True, samesite="lax", max_age=settings.session_days * 86400)
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
    token = request.cookies.get("aw_session", "")
    row = db.get(SessionToken, token) if token else None
    if row is not None:
        row.revoked = 1
        db.commit()
    resp = JSONResponse({"ok": True})
    resp.delete_cookie("aw_session")
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
    current = request.cookies.get("aw_session", "")
    db.query(SessionToken).filter(SessionToken.user_id == user.id,
                                  SessionToken.token != current).update({"revoked": 1})
    db.commit()
    return {"ok": True}



class AllowlistBody(BaseModel):
    entry: str
    note: str = ""


@app.post("/api/allowlist")
def add_allowlist(body: AllowlistBody, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    entry = AllowlistEntry(owner_id=user.id, entry=body.entry.strip(), note=body.note[:200])
    db.add(entry)
    services.audit(db, user.email, "allowlist.add", entry.entry)
    db.commit()
    return {"id": entry.id, "entry": entry.entry}


@app.get("/api/allowlist")
def list_allowlist(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return {"entries": [{"id": e.id, "entry": e.entry, "note": e.note}
                        for e in db.query(AllowlistEntry).filter(AllowlistEntry.owner_id == user.id)]}


class AssetBody(BaseModel):
    hostname: str
    kind: str = "host"
    environment: str = "lab"
    owner_name: str = ""
    importance: str = "medium"
    description: str = ""


@app.post("/api/assets")
def create_asset(body: AssetBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.importance not in ("low", "medium", "high", "critical"):
        raise HTTPException(422, "importance must be low|medium|high|critical")
    asset = Asset(owner_id=user.id, hostname=body.hostname.strip()[:255], kind=body.kind,
                  environment=body.environment, owner_name=body.owner_name,
                  importance=body.importance, description=body.description[:1000])
    db.add(asset)
    services.audit(db, user.email, "asset.create", asset.hostname)
    db.commit()
    return {"id": asset.id, "hostname": asset.hostname}


@app.get("/api/assets")
def list_assets(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(Asset).filter(Asset.owner_id == user.id).order_by(Asset.id).all()
    return {"assets": [{"id": a.id, "hostname": a.hostname, "kind": a.kind,
                        "environment": a.environment, "owner_name": a.owner_name,
                        "importance": a.importance, "description": a.description} for a in rows]}


class ScanBody(BaseModel):
    targets: list[str]
    ports: list[int] | None = None
    adapter: str = "simulated"        # simulated | import
    rows: list[dict] | None = None    # for adapter=import


@app.post("/api/scans")
def run_scan(body: ScanBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    allowlist = services.allowlist_for(db, user.id)
    try:
        validate_targets(body.targets, allowlist,
                         settings.max_targets_per_scan, settings.max_ports_per_scan, body.ports)
    except AuthorizationError as exc:
        services.audit(db, user.email, "scan.refused", str(exc))
        db.commit()
        return JSONResponse({"error": str(exc)}, status_code=403)
    if body.adapter == "simulated":
        scanner = SimulatedScanner()
        runs = [services.record_run(db, user.id, t, "simulated", scanner.scan(t, body.ports))
                for t in body.targets]
    elif body.adapter == "import":
        if not body.rows:
            return JSONResponse({"error": "import adapter requires rows"}, status_code=422)
        scanner = ImportScanner()
        runs = [services.record_run(db, user.id, t, "import", scanner.ingest(t, body.rows))
                for t in body.targets]
    else:
        raise HTTPException(422, "adapter must be simulated|import (nmap is opt-in server config)")
    services.audit(db, user.email, "scan.completed", f"{len(runs)} target(s) via {body.adapter}")
    db.commit()
    return {"runs": [{"id": r.id, "target": r.target, "status": r.status,
                      "limitations": r.limitations} for r in runs]}


@app.get("/api/scans")
def list_scans(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(ScanRun).filter(ScanRun.owner_id == user.id).order_by(ScanRun.id.desc()).all()
    return {"runs": [{"id": r.id, "target": r.target, "adapter": r.adapter, "status": r.status,
                      "started_at": r.started_at, "limitations": r.limitations, "error": r.error}
                     for r in rows]}


@app.get("/api/scans/{run_id}/observations")
def run_observations(run_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    run = db.get(ScanRun, run_id)
    if run is None or run.owner_id != user.id:
        raise HTTPException(404, "run not found")
    return {"observations": services.observations_for(db, user.id, run_id),
            "limitations": run.limitations}


@app.get("/api/diff")
def compare_runs(base_run_id: int, compare_run_id: int,
                 user: User = Depends(current_user), db: Session = Depends(get_db)):
    for rid in (base_run_id, compare_run_id):
        run = db.get(ScanRun, rid)
        if run is None or run.owner_id != user.id:
            raise HTTPException(404, "run not found")
    current = services.observations_for(db, user.id, base_run_id)
    previous = services.observations_for(db, user.id, compare_run_id)
    return diff_runs(current, previous)


class FindingBody(BaseModel):
    target: str
    port: int
    service: str
    severity: str = "info"
    exposure: str = "internal"
    business_importance: str = "medium"


@app.post("/api/findings")
def create_finding(body: FindingBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.severity not in ("info", "low", "medium", "high"):
        raise HTTPException(422, "severity must be info|low|medium|high")
    f = Finding(owner_id=user.id, target=body.target, port=body.port, service=body.service,
                severity=body.severity, exposure=body.exposure,
                business_importance=body.business_importance)
    db.add(f)
    services.audit(db, user.email, "finding.create", f"{body.target}:{body.port}")
    db.commit()
    return {"id": f.id}


@app.get("/api/findings")
def list_findings(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(Finding).filter(Finding.owner_id == user.id).order_by(Finding.id.desc()).all()
    return {"findings": [{"id": f.id, "target": f.target, "port": f.port, "service": f.service,
                          "severity": f.severity, "exposure": f.exposure,
                          "business_importance": f.business_importance, "status": f.status}
                         for f in rows]}


class TaskBody(BaseModel):
    finding_id: int
    owner_name: str
    note: str = ""


@app.post("/api/remediation")
def create_task(body: TaskBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    f = db.get(Finding, body.finding_id)
    if f is None or f.owner_id != user.id:
        raise HTTPException(404, "finding not found")
    t = RemediationTask(finding_id=f.id, owner_name=body.owner_name, note=body.note[:1000])
    db.add(t)
    services.audit(db, user.email, "remediation.create", f"finding {f.id}")
    db.commit()
    return {"id": t.id, "status": t.status}


@app.patch("/api/remediation/{task_id}")
def update_task(task_id: int, status: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = db.get(RemediationTask, task_id)
    if t is None:
        raise HTTPException(404, "task not found")
    if status not in ("todo", "in_progress", "done"):
        raise HTTPException(422, "status must be todo|in_progress|done")
    t.status = status
    services.audit(db, user.email, "remediation.update", f"task {task_id} -> {status}")
    db.commit()
    return {"id": t.id, "status": t.status}



@app.get("/api/dashboard")
def dashboard(user: User = Depends(current_user), db: Session = Depends(get_db)):
    assets = db.query(Asset).filter(Asset.owner_id == user.id).count()
    runs = db.query(ScanRun).filter(ScanRun.owner_id == user.id).count()
    open_findings = (db.query(Finding).filter(Finding.owner_id == user.id, Finding.status == "open").count())
    return {"assets": assets, "scan_runs": runs, "open_findings": open_findings,
            "scan_mode": settings.scan_mode,
            "note": "Counts reflect recorded inventory and observations at query time."}


@app.get("/api/audit")
def audit_log(user: User = Depends(current_user), db: Session = Depends(get_db)):
    from .models import AuditEvent
    rows = db.query(AuditEvent).order_by(AuditEvent.id.desc()).limit(100).all()
    return {"events": [{"at": r.at, "actor": r.actor, "action": r.action, "detail": r.detail}
                       for r in rows]}


@app.get("/api/health")
def health():
    return {"ok": True, "app": "assetwatch", "scan_mode": settings.scan_mode,
            "note": "Asset management + authorized exposure monitoring only — not a scanning framework."}

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
        content={"status": "ok", "database": "connected", "app": "assetwatch"}
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
