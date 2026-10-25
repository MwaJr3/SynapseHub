"""IncidentFlow API. Lifecycle state machine with role rights and an
append-only audit trail. Hashing verifies integrity since collection only."""
from __future__ import annotations

import os

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .config import settings
from .db import Base, engine, get_db
from .models import (AuditEvent, Evidence, Event, Incident, ResetToken,
                     SessionToken, Task, User, now)
from .services import TransitionError, RoleError, transition, require
from .security import (expiry, expiry_minutes, hash_password, new_token, otpauth_url,
                       totp_secret, totp_verify, verify_password)

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
app = FastAPI(title="IncidentFlow", version="0.1.0")
def _extra_origins() -> list[str]:
    """Origins added at deployment time via ALLOWED_ORIGINS (comma-separated)."""
    raw = os.environ.get("ALLOWED_ORIGINS", "")
    return [value.strip() for value in raw.split(",") if value.strip()]


app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5180", "http://127.0.0.1:5180"] + _extra_origins(),
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

DISCLAIMER = ("Incident records and timelines reflect what responders entered and when they entered "
              "it — they are working notes, not proof of chronology or fact. Hash verification shows "
              "integrity since collection only, not authenticity. Not a forensic/legal admissibility tool.")


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("if_session", "")
    row = db.get(SessionToken, token) if token else None
    if row is None or row.revoked or row.expires_at < now():
        raise HTTPException(401, "not authenticated")
    return db.get(User, row.user_id)


class AuthBody(BaseModel):
    email: str
    password: str
    display_name: str = ""
    mfa_code: str = ""
    role: str = "responder"


def _session_response(db: Session, user: User) -> JSONResponse:
    token = new_token()
    db.add(SessionToken(token=token, user_id=user.id, label="web", expires_at=expiry(settings.session_days)))
    db.commit()
    resp = JSONResponse({"ok": True, "email": user.email, "role": user.role,
                         "mfa_enabled": bool(user.mfa_enabled)})
    resp.set_cookie("if_session", token, httponly=True, samesite="lax", max_age=settings.session_days * 86400)
    return resp


@app.post("/api/auth/register")
def register(body: AuthBody, db: Session = Depends(get_db)):
    if len(body.password) < 12 or "@" not in body.email:
        return JSONResponse({"error": "email required; password must be 12+ characters"}, status_code=422)
    if db.query(User).filter(User.email == body.email).first():
        return JSONResponse({"error": "registration failed"}, status_code=422)
    pw, salt = hash_password(body.password)
    role = body.role if body.role in ("observer", "responder", "lead") else "responder"
    db.add(User(email=body.email, password_hash=pw, salt=salt,
                display_name=body.display_name[:120], role=role))
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
    token = request.cookies.get("if_session", "")
    row = db.get(SessionToken, token) if token else None
    if row is not None:
        row.revoked = 1
        db.commit()
    resp = JSONResponse({"ok": True})
    resp.delete_cookie("if_session")
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
    current = request.cookies.get("if_session", "")
    db.query(SessionToken).filter(SessionToken.user_id == user.id,
                                  SessionToken.token != current).update({"revoked": 1})
    db.commit()
    return {"ok": True}



import hashlib


def audit(db, actor: str, action: str, detail: str = "") -> None:
    db.add(AuditEvent(at=now(), actor=actor, action=action, detail=detail[:500]))


class IncidentBody(BaseModel):
    title: str
    kind: str = "security-event"
    severity: str = "medium"
    description: str = ""


@app.post("/api/incidents")
def create_incident(body: IncidentBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        require(user.role, "create")
    except RoleError as exc:
        return JSONResponse({"error": str(exc)}, status_code=403)
    if body.severity not in ("low", "medium", "high", "critical"):
        raise HTTPException(422, "invalid severity")
    inc = Incident(title=body.title[:300], kind=body.kind[:80], severity=body.severity,
                   description=body.description[:5000])
    db.add(inc)
    db.flush()
    db.add(Event(incident_id=inc.id, at=now(), actor=user.email,
                 entry=f"Incident created (severity {body.severity})"))
    audit(db, user.email, "incident.create", f"#{inc.id} {inc.title}")
    db.commit()
    return {"id": inc.id, "status": inc.status}


@app.get("/api/incidents")
def list_incidents(status: str = "", user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        require(user.role, "read")
    except RoleError as exc:
        return JSONResponse({"error": str(exc)}, status_code=403)
    q = db.query(Incident).order_by(Incident.id.desc())
    if status:
        q = q.filter(Incident.status == status)
    return {"incidents": [{"id": i.id, "title": i.title, "kind": i.kind, "severity": i.severity,
                           "status": i.status, "assignee": i.assignee, "created_at": i.created_at}
                          for i in q.all()]}


def _incident(db, user, incident_id) -> Incident:
    inc = db.get(Incident, incident_id)
    if inc is None:
        raise HTTPException(404, "incident not found")
    try:
        require(user.role, "read")
    except RoleError as exc:
        raise HTTPException(403, str(exc))
    return inc


@app.get("/api/incidents/{incident_id}")
def get_incident(incident_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    inc = _incident(db, user, incident_id)
    events = db.query(Event).filter(Event.incident_id == inc.id).order_by(Event.id).all()
    evidence = db.query(Evidence).filter(Evidence.incident_id == inc.id).order_by(Evidence.id).all()
    tasks = db.query(Task).filter(Task.incident_id == inc.id).order_by(Task.id).all()
    return {"id": inc.id, "title": inc.title, "kind": inc.kind, "severity": inc.severity,
            "status": inc.status, "assignee": inc.assignee, "description": inc.description,
            "created_at": inc.created_at,
            "timeline": [{"at": e.at, "actor": e.actor, "entry": e.entry} for e in events],
            "evidence": [{"id": e.id, "filename": e.filename, "sha256": e.sha256, "size": e.size,
                          "collected_by": e.collected_by, "notes": e.notes} for e in evidence],
            "tasks": [{"id": t.id, "title": t.title, "assignee": t.assignee, "status": t.status} for t in tasks],
            "disclaimer": DISCLAIMER}


class TransitionBody(BaseModel):
    target: str
    note: str = ""


@app.post("/api/incidents/{incident_id}/transition")
def transition_incident(incident_id: int, body: TransitionBody,
                        user: User = Depends(current_user), db: Session = Depends(get_db)):
    inc = _incident(db, user, incident_id)
    try:
        inc.status = transition(inc.status, body.target, user.role)
    except (TransitionError, RoleError) as exc:
        return JSONResponse({"error": str(exc)}, status_code=409 if isinstance(exc, TransitionError) else 403)
    inc.updated_at = now()
    db.add(Event(incident_id=inc.id, at=now(), actor=user.email,
                 entry=f"Status -> {inc.status}. {body.note}"[:500]))
    audit(db, user.email, "incident.transition", f"#{inc.id} -> {inc.status}")
    db.commit()
    return {"id": inc.id, "status": inc.status}


class EventBody(BaseModel):
    entry: str


@app.post("/api/incidents/{incident_id}/events")
def add_event(incident_id: int, body: EventBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    inc = _incident(db, user, incident_id)
    try:
        require(user.role, "comment")
    except RoleError as exc:
        return JSONResponse({"error": str(exc)}, status_code=403)
    db.add(Event(incident_id=inc.id, at=now(), actor=user.email, entry=body.entry[:500]))
    audit(db, user.email, "incident.event", f"#{inc.id}")
    db.commit()
    return {"ok": True}


class TaskBody(BaseModel):
    title: str
    assignee: str = ""


@app.post("/api/incidents/{incident_id}/tasks")
def create_task(incident_id: int, body: TaskBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    inc = _incident(db, user, incident_id)
    try:
        require(user.role, "task")
    except RoleError as exc:
        return JSONResponse({"error": str(exc)}, status_code=403)
    t = Task(incident_id=inc.id, title=body.title[:300], assignee=body.assignee[:120])
    db.add(t)
    audit(db, user.email, "task.create", f"#{inc.id} {body.title[:80]}")
    db.commit()
    return {"id": t.id, "status": t.status}


@app.patch("/api/tasks/{task_id}")
def update_task(task_id: int, status: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        require(user.role, "task")
    except RoleError as exc:
        return JSONResponse({"error": str(exc)}, status_code=403)
    t = db.get(Task, task_id)
    if t is None:
        raise HTTPException(404, "task not found")
    if status not in ("todo", "in_progress", "done"):
        raise HTTPException(422, "invalid status")
    t.status = status
    audit(db, user.email, "task.update", f"#{task_id} -> {status}")
    db.commit()
    return {"id": t.id, "status": t.status}


class AssignBody(BaseModel):
    assignee: str


@app.post("/api/incidents/{incident_id}/assign")
def assign_incident(incident_id: int, body: AssignBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    inc = _incident(db, user, incident_id)
    try:
        require(user.role, "assign")
    except RoleError as exc:
        return JSONResponse({"error": str(exc)}, status_code=403)
    inc.assignee = body.assignee[:120]
    inc.updated_at = now()
    db.add(Event(incident_id=inc.id, at=now(), actor=user.email, entry=f"Assigned to {inc.assignee}"))
    audit(db, user.email, "incident.assign", f"#{inc.id} -> {inc.assignee}")
    db.commit()
    return {"id": inc.id, "assignee": inc.assignee}


class EvidenceBody(BaseModel):
    filename: str
    content: str
    notes: str = ""


@app.post("/api/incidents/{incident_id}/evidence")
def add_evidence(incident_id: int, body: EvidenceBody,
                 user: User = Depends(current_user), db: Session = Depends(get_db)):
    inc = _incident(db, user, incident_id)
    try:
        require(user.role, "evidence")
    except RoleError as exc:
        return JSONResponse({"error": str(exc)}, status_code=403)
    data = body.content.encode("utf-8", "replace")
    if len(data) > settings.max_evidence_bytes:
        return JSONResponse({"error": "evidence too large"}, status_code=422)
    digest = hashlib.sha256(data).hexdigest()
    dup = (db.query(Evidence).filter(Evidence.sha256 == digest,
                                     Evidence.incident_id == inc.id).first())
    if dup is not None:
        return JSONResponse({"error": f"duplicate evidence (same SHA-256 as #{dup.id})"},
                            status_code=409)
    e = Evidence(incident_id=inc.id, filename=body.filename[:500], sha256=digest, size=len(data),
                 collected_by=user.email, notes=body.notes[:1000])
    db.add(e)
    db.add(Event(incident_id=inc.id, at=now(), actor=user.email,
                 entry=f"Evidence collected: {e.filename} (sha256 {digest[:12]}…)"))
    audit(db, user.email, "evidence.add", f"#{inc.id} {e.filename}")
    db.commit()
    return {"id": e.id, "sha256": digest,
            "note": "Hash shows integrity since collection only — not authenticity."}


@app.get("/api/incidents/{incident_id}/report")
def incident_report(incident_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    inc = get_incident(incident_id, user, db)
    return {"product": "IncidentFlow", "incident": inc["title"], "status": inc["status"],
            "generated_at": now(), "timeline": inc["timeline"], "evidence": inc["evidence"],
            "tasks": inc["tasks"], "disclaimer": DISCLAIMER}


@app.get("/api/audit")
def audit_log(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(AuditEvent).order_by(AuditEvent.id.desc()).limit(200).all()
    return {"events": [{"at": r.at, "actor": r.actor, "action": r.action, "detail": r.detail}
                       for r in rows],
            "note": "The audit trail is append-only: entries are recorded, never edited or removed."}


@app.get("/api/health")
def health():
    return {"ok": True, "app": "incidentflow",
            "note": "Working-notes incident record — not a forensic/legal admissibility tool."}

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
        content={"status": "ok", "database": "connected", "app": "incidentflow"}
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

    schema = Base.metadata.schema
    probe = f"{schema}._health_probe" if schema else "_health_probe"

    try:
        with engine.begin() as connection:
            connection.execute(text(f"CREATE TABLE IF NOT EXISTS {probe} (id TEXT PRIMARY KEY)"))
            connection.execute(text(f"INSERT INTO {probe} (id) VALUES ('probe') ON CONFLICT DO NOTHING"))
            rows = connection.execute(text(f"SELECT COUNT(*) FROM {probe}")).scalar_one()
            connection.execute(text(f"DELETE FROM {probe} WHERE id = 'probe'"))
            # Prove a real domain table resolves from inside the function.
            table = next(iter(Base.metadata.sorted_tables))
            qualified = f"{table.schema}.{table.name}" if table.schema else table.name
            domain_rows = connection.execute(text(f"SELECT COUNT(*) FROM {qualified}")).scalar_one()
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
    return JSONResponse(
        content={
            "status": "ok",
            "database": "writable",
            "rows_written": 1,
            "rows_seen": rows,
            "domain_table": qualified,
            "domain_rows": domain_rows,
        }
    )
