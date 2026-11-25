"""HashSight API. Auth, lookups, cases, notes, export, retention."""
from __future__ import annotations

import os
import tempfile

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .config import settings
from .db import Base, engine, get_db
from .hashing import HashingError, hash_stream
from .models import Case, HashRecord, Lookup, Note, SessionToken, User, now, ResetToken
from .providers.base import DISCLAIMER, ProviderError, combine
from .providers.demo import DemoProvider
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
app = FastAPI(title="HashSight", version="0.1.0")
def _extra_origins() -> list[str]:
    """Origins added at deployment time via ALLOWED_ORIGINS (comma-separated)."""
    raw = os.environ.get("ALLOWED_ORIGINS", "")
    return [value.strip() for value in raw.split(",") if value.strip()]


# Compress JSON bodies of 1 KB or more; smaller ones are not worth the CPU.
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"] + _extra_origins(),
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("hs_session", "")
    row = db.get(SessionToken, token) if token else None
    if row is None or row.revoked or row.expires_at < now():
        raise HTTPException(401, "not authenticated")
    user = db.get(User, row.user_id)
    if user is None:
        raise HTTPException(401, "not authenticated")
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
    resp.set_cookie("hs_session", token, httponly=True, samesite="lax", max_age=settings.session_days * 86400)
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
    token = request.cookies.get("hs_session", "")
    row = db.get(SessionToken, token) if token else None
    if row is not None:
        row.revoked = 1
        db.commit()
    resp = JSONResponse({"ok": True})
    resp.delete_cookie("hs_session")
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
    current = request.cookies.get("hs_session", "")
    db.query(SessionToken).filter(SessionToken.user_id == user.id,
                                  SessionToken.token != current).update({"revoked": 1})
    db.commit()
    return {"ok": True}



class AnalyzeBody(BaseModel):
    filename: str = "pasted-bytes.bin"
    data_b64: str | None = None          # small payloads via JSON; larger via upload
    confirm_external: bool = False       # explicit user action required before any digest leaves


def _providers(confirmed: bool):
    providers = [DemoProvider()]
    if settings.provider_mode == "external" and settings.provider_api_key and confirmed:
        from .providers.http_provider import ExternalProvider
        try:
            providers.append(ExternalProvider(settings.provider_base_url, settings.provider_api_key))
        except ProviderError:
            pass
    return providers


@app.post("/api/analyze")
def analyze(body: AnalyzeBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    import base64
    from .hashing import hash_bytes
    if not body.data_b64:
        raise HTTPException(422, "data_b64 required (use /api/analyze/upload for files)")
    try:
        data = base64.b64decode(body.data_b64)
    except Exception:
        raise HTTPException(422, "invalid base64")
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(413, "payload exceeds configured limit")
    hashes = hash_bytes(data, body.filename)
    results = [p.lookup(hashes.sha256) for p in _providers(body.confirm_external)]
    record = services.record_lookup(db, user.id, hashes, results)
    return services.record_dict(db, record)


@app.post("/api/analyze/upload")
async def analyze_upload(file: UploadFile = File(...), confirm_external: str = "false",
                         user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Stream to a temp file with a hard cap, hash locally, then delete the temp
    file. The file content is never sent anywhere; at most the digest is, and
    only when confirm_external=true AND an external provider is configured."""
    tmp = tempfile.NamedTemporaryFile(delete=False)
    try:
        size = 0
        while True:
            chunk = await file.read(65536)
            if not chunk:
                break
            size += len(chunk)
            if size > settings.max_upload_bytes:
                tmp.close(); os.unlink(tmp.name)
                raise HTTPException(413, "file exceeds configured limit")
            tmp.write(chunk)
        tmp.close()
        hashes = hash_stream(tmp.name, file.filename or "upload.bin", settings.max_upload_bytes)
    except HashingError as exc:
        raise HTTPException(413, str(exc))
    finally:
        if os.path.exists(tmp.name):
            os.unlink(tmp.name)                       # reliable temp deletion
    results = [p.lookup(hashes.sha256) for p in _providers(confirm_external == "true")]
    record = services.record_lookup(db, user.id, hashes, results)
    return services.record_dict(db, record)


@app.get("/api/records")
def records(q: str = "", verdict: str = "", user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(HashRecord).filter(HashRecord.user_id == user.id).order_by(HashRecord.id.desc()).all()
    out = []
    for r in rows:
        if q and q.lower() not in (r.sha256 + r.sha1 + r.md5 + r.filename).lower():
            continue
        if verdict and r.combined_verdict != verdict:
            continue
        out.append({"id": r.id, "filename": r.filename, "sha256": r.sha256,
                    "combined_verdict": r.combined_verdict, "disposition": r.disposition,
                    "created_at": r.created_at})
    return {"records": out, "disclaimer": DISCLAIMER}


@app.get("/api/records/{record_id}")
def record_detail(record_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    record = db.get(HashRecord, record_id)
    if record is None or record.user_id != user.id:
        raise HTTPException(404, "record not found")
    return services.record_dict(db, record)


class DispositionBody(BaseModel):
    disposition: str


@app.patch("/api/records/{record_id}")
def set_disposition(record_id: int, body: DispositionBody,
                    user: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.disposition not in ("unreviewed", "suspicious", "malicious", "benign", "false-positive"):
        raise HTTPException(422, "unknown disposition")
    record = db.get(HashRecord, record_id)
    if record is None or record.user_id != user.id:
        raise HTTPException(404, "record not found")
    record.disposition = body.disposition
    db.commit()
    return {"ok": True, "disposition": record.disposition}


class CaseBody(BaseModel):
    title: str
    record_id: int | None = None


@app.post("/api/cases")
def create_case(body: CaseBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    case = Case(user_id=user.id, title=body.title[:200], record_id=body.record_id)
    db.add(case); db.commit()
    return {"id": case.id, "title": case.title}


@app.get("/api/cases")
def list_cases(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(Case).filter(Case.user_id == user.id).order_by(Case.id.desc()).all()
    return {"cases": [{"id": c.id, "title": c.title, "record_id": c.record_id,
                       "disposition": c.disposition, "created_at": c.created_at} for c in rows]}


class NoteBody(BaseModel):
    body: str


@app.post("/api/cases/{case_id}/notes")
def add_note(case_id: int, body: NoteBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    case = db.get(Case, case_id)
    if case is None or case.user_id != user.id:
        raise HTTPException(404, "case not found")
    note = Note(case_id=case_id, author=user.email, body=body.body[:4000])
    db.add(note); db.commit()
    return {"id": note.id, "body": note.body, "created_at": note.created_at}


@app.get("/api/cases/{case_id}/notes")
def case_notes(case_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    case = db.get(Case, case_id)
    if case is None or case.user_id != user.id:
        raise HTTPException(404, "case not found")
    notes = db.query(Note).filter(Note.case_id == case_id).order_by(Note.id).all()
    return {"notes": [{"id": n.id, "author": n.author, "body": n.body, "created_at": n.created_at}
                      for n in notes]}


@app.get("/api/records/{record_id}/report")
def export_report(record_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return services.report(db, record_id, user.id)


@app.delete("/api/records/{record_id}")
def delete_record(record_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    record = db.get(HashRecord, record_id)
    if record is None or record.user_id != user.id:
        raise HTTPException(404, "record not found")
    db.query(Lookup).filter(Lookup.record_id == record_id).delete()
    db.delete(record); db.commit()
    return {"ok": True, "note": "record and its lookups deleted (retention control)"}


@app.get("/api/health")
def health():
    return {"ok": True, "app": "hashsight", "provider_mode": settings.provider_mode,
            "disclaimer": DISCLAIMER}

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
        content={"status": "ok", "database": "connected", "app": "hashsight"}
    )
