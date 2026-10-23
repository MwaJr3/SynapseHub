"""API routes: authentication, datasets, events, detection rules, reports.

Authorization is enforced here on every protected operation: a user can only
touch rows they own, and missing/foreign resources return 404 so URLs do not
leak the existence of other users' data.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from . import config, detection, parsing, reporting
from .database import get_db
from .models import Dataset, DetectionRule, Finding, LogEvent, Report, User
from .security import (
    create_session,
    destroy_session,
    hash_password,
    require_user,
    verify_password,
)

api = APIRouter(prefix="/api")

SAFE_FILENAME_RE = re.compile(r"[^A-Za-z0-9._-]")


# --- Schemas ----------------------------------------------------------------


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=200)
    display_name: str = Field(default="", max_length=120)


class RuleIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    rule_type: str
    threshold: int = Field(ge=1, le=10000)
    window_minutes: int = Field(ge=1, le=10080)
    severity: str = "medium"
    enabled: bool = True
    description: str = ""
    runbook: str = ""


class FindingUpdate(BaseModel):
    status: str
    notes: str = ""


class DatasetUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    notes: str = ""


# --- Helpers ----------------------------------------------------------------


def _owned_dataset(db: Session, user: User, dataset_id: int) -> Dataset:
    dataset = db.get(Dataset, dataset_id)
    if dataset is None or dataset.user_id != user.id:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return dataset


def _owned_rule(db: Session, user: User, rule_id: int) -> DetectionRule:
    rule = db.get(DetectionRule, rule_id)
    if rule is None or rule.user_id != user.id:
        raise HTTPException(status_code=404, detail="Rule not found.")
    return rule


def _sanitize_filename(name: str) -> str:
    cleaned = SAFE_FILENAME_RE.sub("_", name.replace("\\", "/").split("/")[-1])
    return cleaned[:255] or "upload.log"


def _event_view(event: LogEvent) -> detection.EventView:
    return detection.EventView(
        id=event.id,
        timestamp=event.timestamp,
        event_type=event.event_type,
        username=event.username,
        source_ip=event.source_ip,
        message=event.message,
    )


def _default_rules() -> list[RuleIn]:
    return [
        RuleIn(
            name="Repeated authentication failures",
            rule_type="repeated_failures",
            threshold=5,
            window_minutes=15,
            severity="high",
            description="Flags repeated failed logins for the same account or source within a short window.",
            runbook="Check whether the account owner recognises the source IP; review surrounding events; consider temporary lockout or MFA reset if unrecognised.",
        ),
        RuleIn(
            name="Many accounts targeted from one source",
            rule_type="multi_account_spray",
            threshold=4,
            window_minutes=30,
            severity="high",
            description="Flags one source IP failing across several distinct accounts (password spraying).",
            runbook="Verify whether the IP is shared infrastructure (VPN/NAT). If not, block or rate-limit the source and notify affected users.",
        ),
        RuleIn(
            name="Successful login after repeated failures",
            rule_type="success_after_failures",
            threshold=3,
            window_minutes=15,
            severity="medium",
            description="Flags a successful login shortly after repeated failures for the same account.",
            runbook="Confirm with the account owner. Review the session for further activity. Consider a forced password reset if unrecognised.",
        ),
        RuleIn(
            name="Error event spike",
            rule_type="error_spike",
            threshold=5,
            window_minutes=15,
            severity="low",
            description="Flags an unusual concentration of error events in a short window.",
            runbook="Review the error messages for faults versus security-relevant activity; escalate only if errors reference authentication or access control.",
        ),
    ]


# --- Auth -------------------------------------------------------------------


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
    db.flush()
    for rule_in in _default_rules():
        db.add(DetectionRule(user_id=user.id, **rule_in.model_dump()))
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


# --- Datasets ---------------------------------------------------------------


@api.get("/datasets")
def list_datasets(user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[dict]:
    datasets = db.query(Dataset).filter(Dataset.user_id == user.id).order_by(Dataset.uploaded_at.desc()).all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "original_filename": d.original_filename,
            "file_format": d.file_format,
            "size_bytes": d.size_bytes,
            "record_count": d.record_count,
            "error_count": d.error_count,
            "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
            "notes": d.notes,
        }
        for d in datasets
    ]


@api.post("/datasets")
async def upload_dataset(
    file: UploadFile,
    name: str = "",
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict:
    original = _sanitize_filename(file.filename or "upload.log")
    suffix = ("." + original.rsplit(".", 1)[-1].lower()) if "." in original else ""
    if suffix not in config.ALLOWED_UPLOAD_SUFFIXES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{suffix}'. Allowed: .log, .txt, .csv")
    content = await file.read()
    if len(content) > config.MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File exceeds the {config.MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit.")
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1", errors="replace")

    result = parsing.parse_upload(original, text)
    if not result.records and result.errors:
        raise HTTPException(status_code=400, detail=f"No usable records found. First error: {result.errors[0]['reason']}")

    dataset = Dataset(
        user_id=user.id,
        name=(name or original)[:200],
        original_filename=original,
        stored_filename=f"{user.id}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{original}",
        file_format=result.file_format,
        size_bytes=len(content),
        record_count=len(result.records),
        error_count=len(result.errors),
        parse_errors=result.errors[: config.MAX_PARSE_ERRORS_SHOWN],
    )
    db.add(dataset)
    db.flush()
    for record in result.records:
        db.add(
            LogEvent(
                dataset_id=dataset.id,
                user_id=user.id,
                line_no=record.line_no,
                timestamp=record.timestamp,
                event_type=record.event_type,
                username=record.username,
                source_ip=record.source_ip,
                source_system=record.source_system,
                message=record.message,
                raw=record.raw,
            )
        )
    db.commit()
    return {"id": dataset.id, "record_count": dataset.record_count, "error_count": dataset.error_count}


@api.get("/datasets/{dataset_id}")
def get_dataset(dataset_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    d = _owned_dataset(db, user, dataset_id)
    return {
        "id": d.id,
        "name": d.name,
        "original_filename": d.original_filename,
        "file_format": d.file_format,
        "size_bytes": d.size_bytes,
        "record_count": d.record_count,
        "error_count": d.error_count,
        "parse_errors": d.parse_errors,
        "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
        "notes": d.notes,
    }


@api.patch("/datasets/{dataset_id}")
def update_dataset(
    dataset_id: int, body: DatasetUpdate, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> dict:
    d = _owned_dataset(db, user, dataset_id)
    d.name = body.name
    d.notes = body.notes
    db.commit()
    return {"id": d.id, "name": d.name, "notes": d.notes}


@api.delete("/datasets/{dataset_id}")
def delete_dataset(dataset_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    d = _owned_dataset(db, user, dataset_id)
    db.delete(d)
    db.commit()
    return {"ok": True}


@api.get("/datasets/{dataset_id}/events")
def list_events(
    dataset_id: int,
    q: str = "",
    event_type: str = "",
    username: str = "",
    source_ip: str = "",
    page: int = 1,
    page_size: int = 50,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict:
    d = _owned_dataset(db, user, dataset_id)
    query = db.query(LogEvent).filter(LogEvent.dataset_id == d.id)
    if q:
        query = query.filter(LogEvent.message.ilike(f"%{q}%"))
    if event_type:
        query = query.filter(LogEvent.event_type == event_type)
    if username:
        query = query.filter(LogEvent.username == username)
    if source_ip:
        query = query.filter(LogEvent.source_ip == source_ip)
    total = query.count()
    page = max(page, 1)
    page_size = min(max(page_size, 1), 200)
    rows = query.order_by(LogEvent.timestamp.is_(None), LogEvent.timestamp, LogEvent.line_no).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "events": [
            {
                "id": e.id,
                "line_no": e.line_no,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                "event_type": e.event_type,
                "username": e.username,
                "source_ip": e.source_ip,
                "source_system": e.source_system,
                "message": e.message,
                "raw": e.raw,
            }
            for e in rows
        ],
    }


@api.get("/datasets/{dataset_id}/timeline")
def dataset_timeline(dataset_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[dict]:
    d = _owned_dataset(db, user, dataset_id)
    events = db.query(LogEvent).filter(LogEvent.dataset_id == d.id).all()
    return detection.event_frequency([_event_view(e) for e in events])


# --- Analysis ---------------------------------------------------------------


@api.post("/datasets/{dataset_id}/analyze")
def analyze_dataset(dataset_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    """Run all enabled rules against a dataset and persist the findings."""
    d = _owned_dataset(db, user, dataset_id)
    rules = db.query(DetectionRule).filter(DetectionRule.user_id == user.id, DetectionRule.enabled.is_(True)).all()
    events = db.query(LogEvent).filter(LogEvent.dataset_id == d.id).all()
    views = [_event_view(e) for e in events]
    created = 0
    for rule in rules:
        config_view = detection.RuleConfig(
            id=rule.id,
            name=rule.name,
            rule_type=rule.rule_type,
            threshold=rule.threshold,
            window_minutes=rule.window_minutes,
            severity=rule.severity,
            description=rule.description,
            runbook=rule.runbook,
        )
        for item in detection.run_rule(views, config_view):
            db.add(
                Finding(
                    user_id=user.id,
                    dataset_id=d.id,
                    rule_id=rule.id,
                    rule_name=item["rule_name"],
                    severity=item["severity"],
                    classification=item["classification"],
                    title=item["title"],
                    explanation=item["explanation"],
                    evidence=item["evidence"],
                )
            )
            created += 1
    db.commit()
    return {"findings_created": created}


@api.get("/datasets/{dataset_id}/findings")
def list_findings(dataset_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[dict]:
    d = _owned_dataset(db, user, dataset_id)
    rows = db.query(Finding).filter(Finding.dataset_id == d.id).order_by(Finding.created_at.desc()).all()
    return [
        {
            "id": f.id,
            "rule_name": f.rule_name,
            "severity": f.severity,
            "classification": f.classification,
            "title": f.title,
            "explanation": f.explanation,
            "evidence": f.evidence,
            "status": f.status,
            "notes": f.notes,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in rows
    ]


@api.patch("/findings/{finding_id}")
def update_finding(
    finding_id: int, body: FindingUpdate, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> dict:
    finding = db.get(Finding, finding_id)
    if finding is None or finding.user_id != user.id:
        raise HTTPException(status_code=404, detail="Finding not found.")
    if body.status not in ("new", "reviewed", "closed"):
        raise HTTPException(status_code=400, detail="Status must be new, reviewed or closed.")
    finding.status = body.status
    finding.notes = body.notes
    db.commit()
    return {"id": finding.id, "status": finding.status, "notes": finding.notes}


# --- Detection rules --------------------------------------------------------


DEFAULT_RULE_TYPES = detection.RULE_TYPES


@api.get("/rules")
def list_rules(user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[dict]:
    rules = db.query(DetectionRule).filter(DetectionRule.user_id == user.id).order_by(DetectionRule.id).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "rule_type": r.rule_type,
            "threshold": r.threshold,
            "window_minutes": r.window_minutes,
            "severity": r.severity,
            "enabled": r.enabled,
            "description": r.description,
            "runbook": r.runbook,
        }
        for r in rules
    ]


@api.post("/rules")
def create_rule(body: RuleIn, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    if body.rule_type not in DEFAULT_RULE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown rule type. Allowed: {', '.join(DEFAULT_RULE_TYPES)}")
    rule = DetectionRule(user_id=user.id, **body.model_dump())
    db.add(rule)
    db.commit()
    return {"id": rule.id}


@api.put("/rules/{rule_id}")
def update_rule(rule_id: int, body: RuleIn, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    rule = _owned_rule(db, user, rule_id)
    if body.rule_type not in DEFAULT_RULE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown rule type. Allowed: {', '.join(DEFAULT_RULE_TYPES)}")
    for key, value in body.model_dump().items():
        setattr(rule, key, value)
    db.commit()
    return {"id": rule.id}


@api.delete("/rules/{rule_id}")
def delete_rule(rule_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    rule = _owned_rule(db, user, rule_id)
    db.delete(rule)
    db.commit()
    return {"ok": True}


@api.post("/rules/{rule_id}/test")
def test_rule(rule_id: int, dataset_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[dict]:
    """Dry-run a rule against a dataset without persisting anything."""
    rule = _owned_rule(db, user, rule_id)
    d = _owned_dataset(db, user, dataset_id)
    events = db.query(LogEvent).filter(LogEvent.dataset_id == d.id).all()
    config_view = detection.RuleConfig(
        id=rule.id,
        name=rule.name,
        rule_type=rule.rule_type,
        threshold=rule.threshold,
        window_minutes=rule.window_minutes,
        severity=rule.severity,
        description=rule.description,
        runbook=rule.runbook,
    )
    return detection.run_rule([_event_view(e) for e in events], config_view)


# --- Reports ----------------------------------------------------------------


@api.post("/datasets/{dataset_id}/reports")
def generate_report(dataset_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    d = _owned_dataset(db, user, dataset_id)
    events = db.query(LogEvent).filter(LogEvent.dataset_id == d.id).all()
    findings = db.query(Finding).filter(Finding.dataset_id == d.id).all()
    summary = reporting.build_summary(d, events, findings)
    report = Report(user_id=user.id, dataset_id=d.id, summary=summary)
    db.add(report)
    db.commit()
    return {"id": report.id, "generated_at": report.generated_at.isoformat(), "summary": summary}


@api.get("/reports")
def list_reports(user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[dict]:
    rows = db.query(Report).filter(Report.user_id == user.id).order_by(Report.generated_at.desc()).all()
    return [
        {
            "id": r.id,
            "dataset_id": r.dataset_id,
            "generated_at": r.generated_at.isoformat() if r.generated_at else None,
            "summary": r.summary,
        }
        for r in rows
    ]


@api.get("/reports/{report_id}/export.csv")
def export_report_csv(report_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> Response:
    report = db.get(Report, report_id)
    if report is None or report.user_id != user.id:
        raise HTTPException(status_code=404, detail="Report not found.")
    csv_text = reporting.summary_to_csv(report.summary)
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="sentinellog-report-{report.id}.csv"'},
    )


@api.get("/reports/{report_id}/export.json")
def export_report_json(report_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> Response:
    report = db.get(Report, report_id)
    if report is None or report.user_id != user.id:
        raise HTTPException(status_code=404, detail="Report not found.")
    import json

    return Response(
        content=json.dumps({"id": report.id, "generated_at": report.generated_at.isoformat(), **report.summary}, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="sentinellog-report-{report.id}.json"'},
    )
