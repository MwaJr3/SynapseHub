"""ThreatIntel Desk API. Ingestion with canonicalization + dedup, triage, and
honest verdict framing — one feed is never treated as proof of maliciousness."""
from __future__ import annotations

import os

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .config import settings
from .db import Base, engine, get_db
from .models import (Feed, IndicatorRow, IngestionRun, ResetToken,
                     SessionToken, User, now)
from .services import canonical, parse_lines, simulated_batch, source_summary
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
app = FastAPI(title="ThreatIntel Desk", version="0.1.0")
def _extra_origins() -> list[str]:
    """Origins added at deployment time via ALLOWED_ORIGINS (comma-separated)."""
    raw = os.environ.get("ALLOWED_ORIGINS", "")
    return [value.strip() for value in raw.split(",") if value.strip()]


app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5181", "http://127.0.0.1:8018"] + _extra_origins(),
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

DISCLAIMER = ("Indicator records are unverified third-party claims and feed observations. "
              "Appearance in one feed is NOT proof of maliciousness; absence from feeds is NOT "
              "proof of safety. Triage is a human judgment.")


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("ti_session", "")
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
    resp.set_cookie("ti_session", token, httponly=True, samesite="lax", max_age=settings.session_days * 86400)
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
    token = request.cookies.get("ti_session", "")
    row = db.get(SessionToken, token) if token else None
    if row is not None:
        row.revoked = 1
        db.commit()
    resp = JSONResponse({"ok": True})
    resp.delete_cookie("ti_session")
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
    current = request.cookies.get("ti_session", "")
    db.query(SessionToken).filter(SessionToken.user_id == user.id,
                                  SessionToken.token != current).update({"revoked": 1})
    db.commit()
    return {"ok": True}



import json


class FeedBody(BaseModel):
    name: str
    kind: str = "manual"
    interval_minutes: int = 1440


@app.post("/api/feeds")
def create_feed(body: FeedBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.kind not in ("manual", "file", "simulated"):
        raise HTTPException(422, "kind must be manual|file|simulated")
    feed = Feed(owner_id=user.id, name=body.name[:200], kind=body.kind,
                interval_minutes=max(5, body.interval_minutes))
    db.add(feed)
    db.commit()
    return {"id": feed.id, "name": feed.name}


@app.get("/api/feeds")
def list_feeds(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(Feed).filter(Feed.owner_id == user.id).order_by(Feed.id).all()
    return {"feeds": [{"id": f.id, "name": f.name, "kind": f.kind, "enabled": bool(f.enabled),
                       "interval_minutes": f.interval_minutes, "last_run_at": f.last_run_at}
                      for f in rows]}


def _feed_for(db, user, feed_id) -> Feed:
    feed = db.get(Feed, feed_id)
    if feed is None or feed.owner_id != user.id:
        raise HTTPException(404, "feed not found")
    return feed


def _ingest(db, feed: Feed, user: User, batch: list[tuple[str, str]], errors: list[str], note: str) -> IngestionRun:
    run = IngestionRun(feed_id=feed.id, started_at=now(), status="completed" if not errors else "partial",
                       fetched=len(batch), errors=len(errors), note=note)
    db.add(run)
    db.flush()
    for value, kind in batch:
        canon = canonical(value, kind)
        existing = (db.query(IndicatorRow)
                    .filter(IndicatorRow.owner_id == user.id, IndicatorRow.canonical == canon).first())
        if existing is None:
            db.add(IndicatorRow(owner_id=user.id, value=value, canonical=canon, kind=kind,
                                sources_json=json.dumps([feed.name]), first_seen=now(), last_seen=now()))
            run.new += 1
        else:
            sources = json.loads(existing.sources_json or "[]")
            if feed.name not in sources:
                sources.append(feed.name)
                existing.sources_json = json.dumps(sources)
            existing.last_seen = now()
            run.merged += 1
    feed.last_run_at = now()
    db.commit()
    return run


class IngestBody(BaseModel):
    feed_id: int
    text: str


@app.post("/api/ingest/file")
def ingest_file(body: IngestBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    feed = _feed_for(db, user, body.feed_id)
    batch, errors = parse_lines(body.text, settings.max_ingest_lines)
    run = _ingest(db, feed, user, batch, errors, note="file import (operator-supplied lines)")
    return {"run_id": run.id, "fetched": run.fetched, "new": run.new,
            "merged": run.merged, "errors": run.errors}


@app.post("/api/feeds/{feed_id}/run")
def run_feed(feed_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    feed = _feed_for(db, user, feed_id)
    if feed.kind == "simulated":
        run = _ingest(db, feed, user, simulated_batch(feed.name), [], note="SIMULATED deterministic demo data")
    elif feed.kind == "file":
        run = IngestionRun(feed_id=feed.id, started_at=now(), status="awaiting-upload",
                           note="file feeds ingest via /api/ingest/file")
        db.add(run)
        feed.last_run_at = now()
        db.commit()
    else:
        run = IngestionRun(feed_id=feed.id, started_at=now(), status="completed",
                           note="manual feed — indicators are added via the API")
        feed.last_run_at = now()
        db.add(run)
        db.commit()
    return {"run_id": run.id, "status": run.status, "note": run.note}


@app.get("/api/feeds/{feed_id}/runs")
def feed_runs(feed_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    feed = _feed_for(db, user, feed_id)
    rows = db.query(IngestionRun).filter(IngestionRun.feed_id == feed.id).order_by(IngestionRun.id.desc()).all()
    return {"runs": [{"id": r.id, "started_at": r.started_at, "status": r.status, "fetched": r.fetched,
                      "new": r.new, "merged": r.merged, "errors": r.errors, "note": r.note} for r in rows]}


@app.get("/api/indicators")
def list_indicators(q: str = "", triage: str = "", kind: str = "",
                    user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = db.query(IndicatorRow).filter(IndicatorRow.owner_id == user.id).order_by(IndicatorRow.id.desc())
    if triage:
        query = query.filter(IndicatorRow.triage == triage)
    if kind:
        query = query.filter(IndicatorRow.kind == kind)
    rows = query.all()
    if q:
        needle = q.lower()
        rows = [r for r in rows if needle in r.value.lower()]
    return {"indicators": [{"id": r.id, "value": r.value, "kind": r.kind, "triage": r.triage,
                            "verdict": r.verdict, "case_ref": r.case_ref,
                            "first_seen": r.first_seen, "last_seen": r.last_seen,
                            **source_summary(r.sources_json)} for r in rows],
            "disclaimer": DISCLAIMER}


def _indicator_for(db, user, indicator_id) -> IndicatorRow:
    row = db.get(IndicatorRow, indicator_id)
    if row is None or row.owner_id != user.id:
        raise HTTPException(404, "indicator not found")
    return row


@app.get("/api/indicators/{indicator_id}")
def get_indicator(indicator_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    row = _indicator_for(db, user, indicator_id)
    return {"id": row.id, "value": row.value, "kind": row.kind, "triage": row.triage,
            "verdict": row.verdict, "case_ref": row.case_ref, "notes": row.notes,
            "first_seen": row.first_seen, "last_seen": row.last_seen,
            **source_summary(row.sources_json), "disclaimer": DISCLAIMER}


class TriageBody(BaseModel):
    triage: str = ""
    case_ref: str = ""
    notes: str = ""


@app.patch("/api/indicators/{indicator_id}")
def patch_indicator(indicator_id: int, body: TriageBody,
                    user: User = Depends(current_user), db: Session = Depends(get_db)):
    row = _indicator_for(db, user, indicator_id)
    if body.triage and body.triage not in ("unreviewed", "suspicious", "confirmed-malicious",
                                           "false-positive", "accepted-risk"):
        raise HTTPException(422, "invalid triage state")
    if body.triage:
        row.triage = body.triage
    if body.case_ref:
        row.case_ref = body.case_ref[:120]
    if body.notes:
        row.notes = body.notes[:2000]
    db.commit()
    return {"id": row.id, "triage": row.triage, "case_ref": row.case_ref}


@app.delete("/api/indicators/{indicator_id}")
def delete_indicator(indicator_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    row = _indicator_for(db, user, indicator_id)
    db.delete(row)
    db.commit()
    return {"ok": True}


@app.get("/api/indicators/{indicator_id}/report")
def indicator_report(indicator_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    row = _indicator_for(db, user, indicator_id)
    return {"product": "ThreatIntel Desk", "indicator": row.value, "kind": row.kind,
            "triage": row.triage, "case_ref": row.case_ref, "first_seen": row.first_seen,
            "last_seen": row.last_seen, **source_summary(row.sources_json),
            "disclaimer": DISCLAIMER}


@app.get("/api/health")
def health():
    return {"ok": True, "app": "threatintel-desk",
            "note": "Indicator desk only — feed observations are unverified claims, never proof."}

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
        content={"status": "ok", "database": "connected", "app": "threatintel-desk"}
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
