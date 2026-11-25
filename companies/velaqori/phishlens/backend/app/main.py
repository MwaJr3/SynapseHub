"""PhishLens API. Email analysis via the reused rule engine. URLs are never
visited; findings are suspicious-pattern warnings for review, never proof."""
from __future__ import annotations

import os

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .config import settings
from .db import Base, engine, get_db
from .engine.parse import ParseError, parse_email
from .engine.rules import analyse
from .models import FindingRow, Message, Note, ResetToken, SessionToken, User, now
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
app = FastAPI(title="PhishLens", version="0.1.0")
def _extra_origins() -> list[str]:
    """Origins added at deployment time via ALLOWED_ORIGINS (comma-separated)."""
    raw = os.environ.get("ALLOWED_ORIGINS", "")
    return [value.strip() for value in raw.split(",") if value.strip()]


# Compress JSON bodies of 1 KB or more; smaller ones are not worth the CPU.
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5305", "http://127.0.0.1:5305"] + _extra_origins(),
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

DISCLAIMER = ("These are suspicious-pattern warnings for human review. A suspicious pattern is NOT "
              "proof that a message is malicious, and the absence of warnings is NOT proof of safety. "
              "URLs are defanged in reports and were never visited.")


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("pl_session", "")
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
    resp.set_cookie("pl_session", token, httponly=True, samesite="lax", max_age=settings.session_days * 86400)
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
    token = request.cookies.get("pl_session", "")
    row = db.get(SessionToken, token) if token else None
    if row is not None:
        row.revoked = 1
        db.commit()
    resp = JSONResponse({"ok": True})
    resp.delete_cookie("pl_session")
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
    current = request.cookies.get("pl_session", "")
    db.query(SessionToken).filter(SessionToken.user_id == user.id,
                                  SessionToken.token != current).update({"revoked": 1})
    db.commit()
    return {"ok": True}


class MessageBody(BaseModel):
    subject: str = ""
    raw: str
    source_kind: str = "paste"


@app.post("/api/messages")
def create_message(body: MessageBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not body.raw.strip():
        return JSONResponse({"error": "raw message required"}, status_code=422)
    if len(body.raw) > settings.max_message_bytes:
        return JSONResponse({"error": "message too large"}, status_code=422)
    try:
        parsed = parse_email(body.raw)
        report = analyse(parsed)
    except ParseError as exc:
        return JSONResponse({"error": f"could not parse message: {exc}"}, status_code=422)
    msg = Message(owner_id=user.id, subject=body.subject[:500] or parsed.subject[:500],
                  from_header=str(parsed.sender or "")[:500],
                  source_kind=body.source_kind, worst_severity=report.worst_severity,
                  finding_count=len(report.findings))
    db.add(msg)
    db.flush()
    for f in report.findings:
        db.add(FindingRow(message_id=msg.id, code=f.code, severity=f.severity,
                          title=f.title, explanation=f.explanation, evidence=f.evidence[:1000]))
    db.commit()
    return {"id": msg.id, "worst_severity": msg.worst_severity,
            "findings": msg.finding_count, "disclaimer": DISCLAIMER}


@app.get("/api/messages")
def list_messages(q: str = "", severity: str = "", disposition: str = "",
                  user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = db.query(Message).filter(Message.owner_id == user.id)
    if severity:
        query = query.filter(Message.worst_severity == severity)
    if disposition:
        query = query.filter(Message.disposition == disposition)
    rows = query.order_by(Message.id.desc()).all()
    if q:
        needle = q.lower()
        rows = [m for m in rows if needle in m.subject.lower() or needle in m.from_header.lower()]
    return {"messages": [{"id": m.id, "subject": m.subject, "from_header": m.from_header,
                          "worst_severity": m.worst_severity, "finding_count": m.finding_count,
                          "disposition": m.disposition, "created_at": m.created_at} for m in rows],
            "disclaimer": DISCLAIMER}


def _message_for(db: Session, user: User, message_id: int) -> Message:
    msg = db.get(Message, message_id)
    if msg is None or msg.owner_id != user.id:
        raise HTTPException(404, "message not found")
    return msg


@app.get("/api/messages/{message_id}")
def get_message(message_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    msg = _message_for(db, user, message_id)
    rows = db.query(FindingRow).filter(FindingRow.message_id == msg.id).all()
    return {"id": msg.id, "subject": msg.subject, "from_header": msg.from_header,
            "worst_severity": msg.worst_severity, "disposition": msg.disposition,
            "created_at": msg.created_at,
            "findings": [{"code": f.code, "severity": f.severity, "title": f.title,
                          "explanation": f.explanation, "evidence": f.evidence} for f in rows],
            "disclaimer": DISCLAIMER}


class PatchBody(BaseModel):
    disposition: str = ""


@app.patch("/api/messages/{message_id}")
def patch_message(message_id: int, body: PatchBody, user: User = Depends(current_user),
                  db: Session = Depends(get_db)):
    msg = _message_for(db, user, message_id)
    if body.disposition not in ("unreviewed", "phishing", "suspicious", "legitimate", "false-positive"):
        raise HTTPException(422, "invalid disposition")
    msg.disposition = body.disposition
    db.commit()
    return {"id": msg.id, "disposition": msg.disposition}


class NoteBody(BaseModel):
    body: str


@app.post("/api/messages/{message_id}/notes")
def add_note(message_id: int, body: NoteBody, user: User = Depends(current_user),
             db: Session = Depends(get_db)):
    msg = _message_for(db, user, message_id)
    note = Note(message_id=msg.id, author_id=user.id, body=body.body[:2000])
    db.add(note)
    db.commit()
    return {"id": note.id}


@app.get("/api/messages/{message_id}/notes")
def list_notes(message_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    msg = _message_for(db, user, message_id)
    rows = db.query(Note).filter(Note.message_id == msg.id).order_by(Note.id).all()
    return {"notes": [{"id": n.id, "body": n.body, "created_at": n.created_at} for n in rows]}


@app.get("/api/messages/{message_id}/report")
def export_report(message_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    msg = _message_for(db, user, message_id)
    rows = db.query(FindingRow).filter(FindingRow.message_id == msg.id).all()
    return {"product": "PhishLens", "message_id": msg.id, "subject": msg.subject,
            "from_header": msg.from_header, "analyzed_at": msg.created_at,
            "worst_severity": msg.worst_severity, "disposition": msg.disposition,
            "findings": [{"code": f.code, "severity": f.severity, "title": f.title,
                          "explanation": f.explanation, "evidence": f.evidence} for f in rows],
            "disclaimer": DISCLAIMER}


@app.delete("/api/messages/{message_id}")
def delete_message(message_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    msg = _message_for(db, user, message_id)
    db.query(FindingRow).filter(FindingRow.message_id == msg.id).delete()
    db.query(Note).filter(Note.message_id == msg.id).delete()
    db.delete(msg)
    db.commit()
    return {"ok": True}


@app.get("/api/health")
def health():
    return {"ok": True, "app": "phishlens",
            "note": "Email indicator analysis only — URLs are never visited; findings are warnings, not proof."}

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
        content={"status": "ok", "database": "connected", "app": "phishlens"}
    )
