"""SentinelCore HTTP routes: auth, users/roles, events, rules, alerts, incidents, audit, reports."""
from __future__ import annotations

import csv
import io
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from . import config, rules as rule_engine, security, workflow
from .database import get_db
from .models import Alert, AuditEvent, DemoFlag, Event, Incident, IncidentEvent, Rule, User

router = APIRouter()


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(config.SESSION_COOKIE)
    return security.require_user(db, token)


def require_role(user: User, *roles: str) -> User:
    if user.role not in roles:
        raise HTTPException(status_code=403, detail="Your role cannot perform this action.")
    return user


def audit(db: Session, actor: User | None, action: str, target: str, detail: str = "") -> None:
    db.add(AuditEvent(actor_id=actor.id if actor else None, action=action, target=target, detail=detail))
    db.commit()


# ---------------------------------------------------------------- auth ----


class RegisterBody(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)
    display_name: str = ""

    @field_validator("email")
    @classmethod
    def _email_shape(cls, value: str) -> str:
        if "@" not in value or value.startswith("@") or value.endswith("@") or "." not in value.split("@")[-1]:
            raise ValueError("Enter a valid email address.")
        return value.lower()


class LoginBody(BaseModel):
    email: str
    password: str


@router.post("/api/auth/register")
def register(body: RegisterBody, response: Response, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(
        email=body.email.lower(),
        display_name=body.display_name or body.email.split("@")[0],
        password_hash=security.hash_password(body.password),
        role="viewer",  # self-registration is viewer-only; admins promote
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = security.create_session(db, user)
    response.set_cookie(config.SESSION_COOKIE, token, httponly=True, samesite="lax", max_age=config.SESSION_MAX_AGE_SECONDS)
    return {"id": user.id, "email": user.email, "display_name": user.display_name, "role": user.role}


@router.post("/api/auth/login")
def login(body: LoginBody, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not security.verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    token = security.create_session(db, user)
    response.set_cookie(config.SESSION_COOKIE, token, httponly=True, samesite="lax", max_age=config.SESSION_MAX_AGE_SECONDS)
    return {"id": user.id, "email": user.email, "display_name": user.display_name, "role": user.role}


@router.post("/api/auth/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(config.SESSION_COOKIE)
    if token:
        security.destroy_session(db, token)
    response.delete_cookie(config.SESSION_COOKIE)
    return {"ok": True}


@router.get("/api/auth/me")
def me(user: User = Depends(current_user)):
    return {"id": user.id, "email": user.email, "display_name": user.display_name, "role": user.role}


# --------------------------------------------------------------- users ----


@router.get("/api/users")
def list_users(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [
        {"id": u.id, "email": u.email, "display_name": u.display_name, "role": u.role}
        for u in db.query(User).all()
    ]


class RoleBody(BaseModel):
    role: str


@router.patch("/api/users/{user_id}/role")
def set_role(user_id: int, body: RoleBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin")
    if body.role not in config.ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(config.ROLES)}.")
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    target.role = body.role
    db.commit()
    audit(db, user, "user.role", f"user:{target.id}", f"role={body.role}")
    return {"id": target.id, "role": target.role}


# --------------------------------------------------------------- events ---


class EventBody(BaseModel):
    occurred_at: str = Field(min_length=1)
    source_ip: str = ""
    category: str = "generic"
    summary: str = Field(min_length=1)
    severity: str = "low"
    raw: dict = Field(default_factory=dict)


@router.get("/api/events")
def list_events(
    q: str = "", category: str = "", severity: str = "", user: User = Depends(current_user), db: Session = Depends(get_db)
):
    query = db.query(Event).order_by(Event.id.desc())
    if q:
        query = query.filter(Event.summary.ilike(f"%{q}%"))
    if category:
        query = query.filter(Event.category == category)
    if severity:
        query = query.filter(Event.severity == severity)
    return [_event_dict(e) for e in query.limit(200).all()]


def _event_dict(e: Event) -> dict:
    return {
        "id": e.id,
        "uid": e.uid,
        "occurred_at": e.occurred_at,
        "source_ip": e.source_ip,
        "category": e.category,
        "summary": e.summary,
        "severity": e.severity,
    }


@router.post("/api/events")
def create_event(body: EventBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin", "analyst")
    if body.severity not in config.SEVERITIES:
        raise HTTPException(status_code=400, detail=f"Severity must be one of: {', '.join(config.SEVERITIES)}.")
    event = Event(
        uid=uuid.uuid4().hex,
        occurred_at=body.occurred_at,
        source_ip=body.source_ip,
        category=body.category,
        summary=body.summary,
        severity=body.severity,
        raw_json=json.dumps(body.raw),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    audit(db, user, "event.create", f"event:{event.uid}", body.summary[:120])
    return _event_dict(event)


# ---------------------------------------------------------------- rules ---


class RuleBody(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    category_match: str = ""
    summary_contains: str = ""
    severity: str = "medium"
    enabled: str = "yes"


@router.get("/api/rules")
def list_rules(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "category_match": r.category_match,
            "summary_contains": r.summary_contains,
            "severity": r.severity,
            "enabled": r.enabled,
        }
        for r in db.query(Rule).all()
    ]


@router.post("/api/rules")
def create_rule(body: RuleBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin")
    if not body.category_match and not body.summary_contains:
        raise HTTPException(status_code=400, detail="A rule needs at least one match condition.")
    rule = Rule(**body.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    audit(db, user, "rule.create", f"rule:{rule.id}", rule.name)
    return {"id": rule.id}


@router.delete("/api/rules/{rule_id}")
def delete_rule(rule_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin")
    rule = db.get(Rule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found.")
    db.delete(rule)
    db.commit()
    audit(db, user, "rule.delete", f"rule:{rule_id}")
    return {"ok": True}


@router.post("/api/rules/evaluate")
def evaluate_rules(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin", "analyst")
    all_rules = db.query(Rule).all()
    all_events = db.query(Event).all()
    existing = {(a.rule_id, a.event_id) for a in db.query(Alert).all()}
    created = 0
    for match in rule_engine.evaluate(all_rules, all_events):
        if (match.rule_id, match.event_id) in existing:
            continue
        db.add(
            Alert(
                uid=uuid.uuid4().hex,
                rule_id=match.rule_id,
                event_id=match.event_id,
                status="open",
                note=rule_engine.MATCH_NOTE,
            )
        )
        created += 1
    db.commit()
    audit(db, user, "rules.evaluate", "rules", f"created={created}")
    return {"created": created, "note": rule_engine.MATCH_NOTE}


# --------------------------------------------------------------- alerts ---


@router.get("/api/alerts")
def list_alerts(status: str = "", user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = db.query(Alert).order_by(Alert.id.desc())
    if status:
        query = query.filter(Alert.status == status)
    rows = []
    for a in query.limit(200).all():
        rows.append(
            {
                "id": a.id,
                "uid": a.uid,
                "status": a.status,
                "note": a.note,
                "rule_name": a.rule.name,
                "rule_severity": a.rule.severity,
                "event": _event_dict(a.event),
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
        )
    return rows


class AlertActionBody(BaseModel):
    note: str = ""


@router.patch("/api/alerts/{alert_id}")
def update_alert(alert_id: int, body: AlertActionBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin", "analyst")
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    if body.note == "dismiss":
        alert.status = "dismissed"
    else:
        alert.note = body.note
    db.commit()
    audit(db, user, "alert.update", f"alert:{alert.uid}", body.note[:120])
    return {"id": alert.id, "status": alert.status}


@router.post("/api/alerts/{alert_id}/convert")
def convert_alert(alert_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin", "analyst")
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    if alert.status != "open":
        raise HTTPException(status_code=400, detail="Only open alerts can be converted to incidents.")
    incident = Incident(
        uid=uuid.uuid4().hex,
        title=f"Incident from alert: {alert.rule.name}",
        description=(
            f"Converted from alert {alert.uid}.\nRule match is a triage suggestion — not proof of an attack.\n"
            f"Matched event: {alert.event.summary}"
        ),
        severity=alert.rule.severity,
        status="new",
        created_by=user.id,
    )
    db.add(incident)
    db.flush()
    db.add(IncidentEvent(incident_id=incident.id, event_id=alert.event_id))
    alert.status = "converted"
    db.commit()
    audit(db, user, "alert.convert", f"alert:{alert.uid}", f"incident:{incident.uid}")
    return {"id": incident.id, "uid": incident.uid}


# ------------------------------------------------------------- incidents ---


class IncidentBody(BaseModel):
    title: str = Field(min_length=1)
    description: str = ""
    severity: str = "medium"
    assignee_id: int | None = None
    event_ids: list[int] = Field(default_factory=list)


class IncidentPatchBody(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: str | None = None
    assignee_id: int | None = None


class TransitionBody(BaseModel):
    status: str
    resolution_note: str = ""


def _incident_dict(inc: Incident) -> dict:
    return {
        "id": inc.id,
        "uid": inc.uid,
        "title": inc.title,
        "description": inc.description,
        "severity": inc.severity,
        "status": inc.status,
        "assignee_id": inc.assignee_id,
        "assignee_name": inc.assignee.display_name if inc.assignee else "",
        "resolution_note": inc.resolution_note,
        "created_at": inc.created_at.isoformat() if inc.created_at else None,
        "updated_at": inc.updated_at.isoformat() if inc.updated_at else None,
    }


@router.get("/api/incidents")
def list_incidents(status: str = "", user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = db.query(Incident).order_by(Incident.id.desc())
    if status:
        query = query.filter(Incident.status == status)
    return [_incident_dict(i) for i in query.all()]


@router.post("/api/incidents")
def create_incident(body: IncidentBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin", "analyst")
    if body.severity not in config.SEVERITIES:
        raise HTTPException(status_code=400, detail=f"Severity must be one of: {', '.join(config.SEVERITIES)}.")
    inc = Incident(
        uid=uuid.uuid4().hex,
        title=body.title,
        description=body.description,
        severity=body.severity,
        status="new",
        assignee_id=body.assignee_id,
        created_by=user.id,
    )
    db.add(inc)
    db.flush()
    for event_id in body.event_ids:
        event = db.get(Event, event_id)
        if not event:
            raise HTTPException(status_code=404, detail=f"Event {event_id} not found.")
        db.add(IncidentEvent(incident_id=inc.id, event_id=event_id))
    db.commit()
    db.refresh(inc)
    audit(db, user, "incident.create", f"incident:{inc.uid}", inc.title[:120])
    return _incident_dict(inc)


@router.get("/api/incidents/{incident_id}")
def get_incident(incident_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    inc = db.get(Incident, incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")
    body = _incident_dict(inc)
    body["workflow_note"] = workflow.WORKFLOW_NOTE
    body["allowed_transitions"] = sorted(workflow.ALLOWED_TRANSITIONS.get(inc.status, set()))
    body["events"] = [
        _event_dict(db.get(Event, link.event_id)) for link in db.query(IncidentEvent).filter(IncidentEvent.incident_id == inc.id).all()
    ]
    return body


@router.patch("/api/incidents/{incident_id}")
def patch_incident(
    incident_id: int, body: IncidentPatchBody, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    require_role(user, "admin", "analyst")
    inc = db.get(Incident, incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")
    if body.title is not None:
        inc.title = body.title
    if body.description is not None:
        inc.description = body.description
    if body.severity is not None:
        if body.severity not in config.SEVERITIES:
            raise HTTPException(status_code=400, detail="Invalid severity.")
        inc.severity = body.severity
    if body.assignee_id is not None:
        assignee = db.get(User, body.assignee_id)
        if not assignee:
            raise HTTPException(status_code=404, detail="Assignee not found.")
        inc.assignee_id = assignee.id
    inc.updated_at = datetime.now(timezone.utc)
    db.commit()
    audit(db, user, "incident.update", f"incident:{inc.uid}")
    return _incident_dict(inc)


@router.post("/api/incidents/{incident_id}/transition")
def transition_incident(
    incident_id: int, body: TransitionBody, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    require_role(user, "admin", "analyst")
    inc = db.get(Incident, incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")
    try:
        workflow.validate_transition(inc.status, body.status, body.resolution_note)
    except workflow.WorkflowError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    inc.status = body.status
    if body.resolution_note.strip():
        inc.resolution_note = body.resolution_note
    inc.updated_at = datetime.now(timezone.utc)
    db.commit()
    audit(db, user, "incident.transition", f"incident:{inc.uid}", f"{body.status} {body.resolution_note[:80]}")
    return _incident_dict(inc)


@router.get("/api/incidents/{incident_id}/report.json")
def incident_report(incident_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    inc = db.get(Incident, incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")
    detail = get_incident(incident_id, user, db)
    return {
        "incident": detail,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "disclaimer": (
            "This report records triage workflow state and related events. "
            "A suspicious pattern is not proof of an attack; statuses reflect "
            "analyst judgement, not certainty."
        ),
    }


# ------------------------------------------------------------- dashboard --


@router.get("/api/dashboard")
def dashboard(user: User = Depends(current_user), db: Session = Depends(get_db)):
    demo = db.query(DemoFlag).filter(DemoFlag.key == "demo_data").first()
    by_status = {s: db.query(Incident).filter(Incident.status == s).count() for s in config.INCIDENT_STATUSES}
    by_severity = {s: db.query(Incident).filter(Incident.severity == s).count() for s in config.SEVERITIES}
    return {
        "role": user.role,
        "events": db.query(Event).count(),
        "alerts_open": db.query(Alert).filter(Alert.status == "open").count(),
        "incidents_by_status": by_status,
        "incidents_by_severity": by_severity,
        "demo_data": bool(demo),
        "workflow_note": workflow.WORKFLOW_NOTE,
    }


# ---------------------------------------------------------------- audit ---


@router.get("/api/audit")
def audit_log(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin")
    events = db.query(AuditEvent).order_by(AuditEvent.id.desc()).limit(200).all()
    return [
        {
            "id": e.id,
            "actor_id": e.actor_id,
            "action": e.action,
            "target": e.target,
            "detail": e.detail,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in events
    ]


# -------------------------------------------------------------- reports ---


@router.get("/api/reports/incidents.csv")
def incidents_csv(user: User = Depends(current_user), db: Session = Depends(get_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["uid", "title", "severity", "status", "assignee", "created_at", "resolution_note"])
    for inc in db.query(Incident).order_by(Incident.id).all():
        writer.writerow(
            [inc.uid, inc.title, inc.severity, inc.status, inc.assignee.display_name if inc.assignee else "",
             inc.created_at.isoformat() if inc.created_at else "", inc.resolution_note]
        )
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sentinelcore-incidents.csv"},
    )
