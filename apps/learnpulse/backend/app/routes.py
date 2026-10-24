"""LearnPulse HTTP routes: auth, imports, events, dashboards, flags, metrics, reports."""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from . import config, core, security
from .database import get_db
from .models import Annotation, Event, ImportBatch, MetricDefinition, SupportFlag, User

router = APIRouter()


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(config.SESSION_COOKIE)
    return security.require_user(db, token)


def require_role(user: User, *roles: str) -> User:
    if user.role not in roles:
        raise HTTPException(status_code=403, detail="Your role cannot perform this action.")
    return user


class RegisterBody(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)
    display_name: str = ""
    role: str = "teacher"

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        if "@" not in v or v.startswith("@") or v.endswith("@") or "." not in v.split("@")[-1]:
            raise ValueError("Enter a valid email address.")
        return v.lower()


class LoginBody(BaseModel):
    email: str
    password: str


def _session(user: User, response: Response, db: Session) -> dict:
    token = security.create_session(db, user)
    response.set_cookie(config.SESSION_COOKIE, token, httponly=True, samesite="lax", max_age=config.SESSION_MAX_AGE_SECONDS)
    return {"id": user.id, "email": user.email, "display_name": user.display_name, "role": user.role}


@router.post("/api/auth/register")
def register(body: RegisterBody, response: Response, db: Session = Depends(get_db)):
    if body.role not in ("learner", "teacher", "admin", "analyst"):
        raise HTTPException(status_code=400, detail="Role must be learner, teacher, admin or analyst.")
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(email=body.email.lower(), display_name=body.display_name or body.email.split("@")[0],
                password_hash=security.hash_password(body.password), role=body.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return _session(user, response, db)


@router.post("/api/auth/login")
def login(body: LoginBody, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not security.verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return _session(user, response, db)


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


# ---------------------------------------------------------------- imports ---


class ImportBody(BaseModel):
    filename: str = Field(min_length=1)
    csv_text: str = Field(min_length=1)


@router.post("/api/imports")
def import_events(body: ImportBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "teacher", "admin", "analyst")
    existing = {row.uid for row in db.query(Event).all()}
    result = core.parse_events_csv(body.csv_text, existing)
    batch = ImportBatch(filename=body.filename, rows_ok=len(result.rows_ok),
                        rows_rejected=len(result.rejected), rejected_json=json.dumps(result.rejected),
                        created_by=user.id)
    db.add(batch)
    db.flush()
    for row in result.rows_ok:
        db.add(Event(source_import_id=batch.id, **row))
    db.commit()
    return {"import_id": batch.id, "rows_ok": batch.rows_ok, "rows_rejected": batch.rows_rejected,
            "rejected": result.rejected[:20]}


@router.get("/api/imports")
def list_imports(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [
        {"id": b.id, "filename": b.filename, "rows_ok": b.rows_ok, "rows_rejected": b.rows_rejected,
         "created_at": b.created_at.isoformat() if b.created_at else None}
        for b in db.query(ImportBatch).order_by(ImportBatch.id.desc()).all()
    ]


# ----------------------------------------------------------------- events ---


@router.get("/api/events")
def list_events(q: str = "", kind: str = "", date_from: str = "", date_to: str = "",
                user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(Event).order_by(Event.id.desc()).limit(500).all()
    out = []
    for e in rows:
        if q and q not in e.learner_ref and q not in e.topic:
            continue
        if kind and e.kind != kind:
            continue
        if not core.in_range(e.occurred_at, date_from, date_to):
            continue
        out.append({"uid": e.uid, "occurred_at": e.occurred_at, "kind": e.kind, "learner_ref": e.learner_ref,
                    "course": e.course, "class_name": e.class_name, "topic": e.topic,
                    "assessment": e.assessment, "value": e.value})
    return out


# ------------------------------------------------------------- dashboards ---


@router.get("/api/dashboard")
def dashboard(date_from: str = "", date_to: str = "", user: User = Depends(current_user), db: Session = Depends(get_db)):
    events = db.query(Event).all()
    summary = core.summarize(events, date_from, date_to)
    return {
        "summary": summary.__dict__,
        "date_from": date_from, "date_to": date_to,
        "note": "All values are computed from imported events. Correlation is not causation; "
                "flags below are reviewable signals, never labels of ability.",
    }


@router.get("/api/cohorts")
def cohorts(user: User = Depends(current_user), db: Session = Depends(get_db)):
    events = db.query(Event).all()
    groups: dict[str, set[str]] = {}
    for e in events:
        if e.class_name:
            groups.setdefault(e.class_name, set()).add(e.learner_ref)
    as_lists = {k: sorted(v) for k, v in groups.items()}
    return core.suppress_small_cohorts(as_lists)


# ------------------------------------------------------------------ flags ---


@router.get("/api/flags")
def list_flags(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(SupportFlag).order_by(SupportFlag.id.desc()).all()
    return [
        {"id": f.id, "rule_key": f.rule_key, "learner_ref": f.learner_ref,
         "evidence": json.loads(f.evidence_json), "status": f.status, "note": f.note}
        for f in rows
    ]


@router.post("/api/flags/evaluate")
def evaluate_flags(date_from: str = "", date_to: str = "", user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "teacher", "admin", "analyst")
    events = db.query(Event).all()
    existing = {(f.rule_key, f.learner_ref) for f in db.query(SupportFlag).all()}
    created = 0
    for draft in core.evaluate_rules(events, date_from, date_to):
        if (draft.rule_key, draft.learner_ref) in existing:
            continue
        db.add(SupportFlag(rule_key=draft.rule_key, learner_ref=draft.learner_ref,
                           evidence_json=json.dumps(draft.evidence)))
        created += 1
    db.commit()
    return {"created": created,
            "note": "Flags carry the exact rule and evidence for teacher review. They are supportive "
                    "signals — not judgements of ability or predictions."}


class FlagActionBody(BaseModel):
    status: str = Field(pattern="^(dismissed|actioned)$")
    note: str = ""


@router.patch("/api/flags/{flag_id}")
def update_flag(flag_id: int, body: FlagActionBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "teacher", "admin", "analyst")
    flag = db.get(SupportFlag, flag_id)
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found.")
    flag.status = body.status
    flag.note = body.note
    db.commit()
    return {"id": flag.id, "status": flag.status}


class AnnotationBody(BaseModel):
    body: str = Field(min_length=1)
    follow_up: str = ""


@router.post("/api/flags/{flag_id}/annotations")
def annotate(flag_id: int, body: AnnotationBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "teacher", "admin", "analyst")
    if db.get(SupportFlag, flag_id) is None:
        raise HTTPException(status_code=404, detail="Flag not found.")
    row = Annotation(flag_id=flag_id, author_id=user.id, body=body.body, follow_up=body.follow_up)
    db.add(row)
    db.commit()
    return {"id": row.id}


# ------------------------------------------------------- metric definitions ---


class MetricBody(BaseModel):
    key: str = Field(min_length=1)
    name: str = Field(min_length=1)
    definition: str = Field(min_length=1)
    threshold: float = 0.0


@router.get("/api/metrics")
def list_metrics(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [{"id": m.id, "key": m.key, "name": m.name, "definition": m.definition,
             "threshold": m.threshold, "version": m.version} for m in db.query(MetricDefinition).all()]


@router.post("/api/metrics")
def create_metric(body: MetricBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin")
    metric = MetricDefinition(**body.model_dump())
    db.add(metric)
    db.commit()
    return {"id": metric.id, "version": metric.version}


@router.patch("/api/metrics/{metric_id}")
def update_metric(metric_id: int, body: MetricBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin")
    metric = db.get(MetricDefinition, metric_id)
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found.")
    metric.name = body.name
    metric.definition = body.definition
    metric.threshold = body.threshold
    metric.version += 1  # threshold changes are versioned + the change is auditable via version
    db.commit()
    return {"id": metric.id, "version": metric.version}


# ----------------------------------------------------------------- report ---


@router.get("/api/reports/export.json")
def export_report(date_from: str = "", date_to: str = "", user: User = Depends(current_user), db: Session = Depends(get_db)):
    events = db.query(Event).all()
    summary = core.summarize(events, date_from, date_to)
    imports = [b.filename for b in db.query(ImportBatch).all()]
    return core.report_payload(summary, date_from, date_to, imports)
