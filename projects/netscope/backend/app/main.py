"""NetScope API. Offline capture analysis via the reused engine. Packet
payloads are never inspected or exported; flags are heuristics, not proof."""
from __future__ import annotations

import os

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .config import settings
from .db import Base, engine, get_db
from .engine.pcap import PcapError, read_pcap
from .engine.analysis import summarise
from .engine.report import to_dict
from .models import Capture, ResetToken, SessionToken, User, now
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
app = FastAPI(title="NetScope", version="0.1.0")
def _extra_origins() -> list[str]:
    """Origins added at deployment time via ALLOWED_ORIGINS (comma-separated)."""
    raw = os.environ.get("ALLOWED_ORIGINS", "")
    return [value.strip() for value in raw.split(",") if value.strip()]


app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5179", "http://127.0.0.1:5179"] + _extra_origins(),
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

DISCLAIMER = ("Metadata analysis only — packet payloads are never inspected or exported. "
              "Unusual-volume flags are configurable heuristics for review, not proof of an attack.")


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("ns_session", "")
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
    resp.set_cookie("ns_session", token, httponly=True, samesite="lax", max_age=settings.session_days * 86400)
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
    token = request.cookies.get("ns_session", "")
    row = db.get(SessionToken, token) if token else None
    if row is not None:
        row.revoked = 1
        db.commit()
    resp = JSONResponse({"ok": True})
    resp.delete_cookie("ns_session")
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
    current = request.cookies.get("ns_session", "")
    db.query(SessionToken).filter(SessionToken.user_id == user.id,
                                  SessionToken.token != current).update({"revoked": 1})
    db.commit()
    return {"ok": True}



import json
import tempfile
import threading
from pathlib import Path as _Path

from fastapi import File, UploadFile


def _analyze_capture(capture_id: int, data: bytes, threshold: int) -> None:
    """Background worker: write to a private temp file, analyze metadata only, delete."""
    from .db import SessionLocal
    tmp = _Path(tempfile.mkdtemp(prefix="ns-")) / "capture.pcap"
    try:
        tmp.write_bytes(data)
        packets = read_pcap(tmp)
        summary = summarise(packets, alert_threshold_per_minute=threshold)
        payload = to_dict(summary)
        db = SessionLocal()
        try:
            cap = db.get(Capture, capture_id)
            if cap is not None:
                cap.summary_json = json.dumps(payload)
                cap.packet_count = payload["packets"]
                cap.byte_count = payload["bytes_total"]
                cap.status = "completed"
                db.commit()
        finally:
            db.close()
    except PcapError as exc:
        db = SessionLocal()
        try:
            cap = db.get(Capture, capture_id)
            if cap is not None:
                cap.status = "failed"
                cap.error = str(exc)[:500]
                db.commit()
        finally:
            db.close()
    finally:
        tmp.unlink(missing_ok=True)
        tmp.parent.rmdir()


@app.post("/api/captures")
async def upload_capture(file: UploadFile, label: str = "",
                         user: User = Depends(current_user), db: Session = Depends(get_db)):
    data = await file.read()
    if len(data) > settings.max_upload_bytes:
        return JSONResponse({"error": "capture exceeds the upload limit"}, status_code=422)
    cap = Capture(owner_id=user.id, filename=(file.filename or "capture.pcap")[:500],
                  label=label[:200], status="processing")
    db.add(cap)
    db.commit()
    if len(data) <= settings.inline_max_bytes:
        _analyze_capture(cap.id, data, settings.alert_threshold_per_minute)
        db.refresh(cap)
    else:
        threading.Thread(target=_analyze_capture,
                         args=(cap.id, data, settings.alert_threshold_per_minute),
                         daemon=True).start()
    return {"id": cap.id, "status": cap.status,
            "note": "Background processing used for large captures; poll the capture until status is completed."}


@app.get("/api/captures")
def list_captures(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(Capture).filter(Capture.owner_id == user.id).order_by(Capture.id.desc()).all()
    return {"captures": [{"id": c.id, "filename": c.filename, "label": c.label, "status": c.status,
                          "packet_count": c.packet_count, "byte_count": c.byte_count,
                          "created_at": c.created_at} for c in rows]}


def _capture_for(db: Session, user: User, capture_id: int) -> Capture:
    cap = db.get(Capture, capture_id)
    if cap is None or cap.owner_id != user.id:
        raise HTTPException(404, "capture not found")
    return cap


@app.get("/api/captures/{capture_id}")
def get_capture(capture_id: int, redact: bool = False,
                user: User = Depends(current_user), db: Session = Depends(get_db)):
    cap = _capture_for(db, user, capture_id)
    summary = json.loads(cap.summary_json or "{}")
    if redact and summary:
        from .engine.analysis import anonymise
        for key in ("top_sources", "top_destinations"):
            if key in summary:
                summary[key] = [[anonymise(ip), n] for ip, n in summary[key]]
    return {"id": cap.id, "filename": cap.filename, "label": cap.label, "status": cap.status,
            "error": cap.error, "summary": summary, "disclaimer": DISCLAIMER}


class CapturePatch(BaseModel):
    label: str


@app.patch("/api/captures/{capture_id}")
def patch_capture(capture_id: int, body: CapturePatch,
                  user: User = Depends(current_user), db: Session = Depends(get_db)):
    cap = _capture_for(db, user, capture_id)
    cap.label = body.label[:200]
    db.commit()
    return {"id": cap.id, "label": cap.label}


@app.delete("/api/captures/{capture_id}")
def delete_capture(capture_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    cap = _capture_for(db, user, capture_id)
    db.delete(cap)
    db.commit()
    return {"ok": True}


@app.get("/api/captures/{capture_id}/report")
def capture_report(capture_id: int, redact: bool = True,
                   user: User = Depends(current_user), db: Session = Depends(get_db)):
    cap = _capture_for(db, user, capture_id)
    summary = json.loads(cap.summary_json or "{}")
    if redact and summary:
        from .engine.analysis import anonymise
        for key in ("top_sources", "top_destinations"):
            if key in summary:
                summary[key] = [[anonymise(ip), n] for ip, n in summary[key]]
    return {"product": "NetScope", "capture": cap.filename, "label": cap.label,
            "analyzed_at": cap.created_at, "redacted": redact,
            "summary": summary,
            "disclaimer": DISCLAIMER,
            "text_summary": ("Heuristic flags are for review — not proof of an attack. "
                             "Payloads are never inspected.")}


@app.get("/api/compare")
def compare_captures(base_id: int, compare_id: int,
                     user: User = Depends(current_user), db: Session = Depends(get_db)):
    base = json.loads(_capture_for(db, user, base_id).summary_json or "{}")
    other = json.loads(_capture_for(db, user, compare_id).summary_json or "{}")
    def delta(a: dict, b: dict) -> dict:
        keys = set(a) | set(b)
        return {k: {"base": a.get(k, 0), "compare": b.get(k, 0), "delta": a.get(k, 0) - b.get(k, 0)}
                for k in sorted(keys) if a.get(k, 0) != b.get(k, 0)}
    return {
        "protocol_volume_delta": delta(base.get("by_protocol", {}), other.get("by_protocol", {})),
        "new_anomalies": [a for a in base.get("anomalies", []) if a not in other.get("anomalies", [])],
        "resolved_anomalies": [a for a in other.get("anomalies", []) if a not in base.get("anomalies", [])],
        "note": "Differences describe capture-level change between two points in time — "
                "indicators to review, not confirmed attacks.",
    }


@app.get("/api/health")
def health():
    return {"ok": True, "app": "netscope",
            "note": "Metadata-only capture analysis — payloads are never inspected or exported."}

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
        content={"status": "ok", "database": "connected", "app": "netscope"}
    )
