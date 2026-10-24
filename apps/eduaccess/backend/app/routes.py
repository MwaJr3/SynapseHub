"""EduAccess HTTP routes: auth, plans, applications, pools, ledger, appeals, reports."""
from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from . import config, core, security
from .database import get_db
from .models import (
    AccessPlan, Appeal, Application, AuditEvent, Course, FundingPool, SeatAllocation, Transaction, User,
)

router = APIRouter()


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(config.SESSION_COOKIE)
    return security.require_user(db, token)


def require_role(user: User, *roles: str) -> User:
    if user.role not in roles:
        raise HTTPException(status_code=403, detail="Your role cannot perform this action.")
    return user


def audit(db: Session, actor: User, action: str, target: str, detail: str = "") -> None:
    db.add(AuditEvent(actor_id=actor.id, action=action, target=target, detail=detail))
    db.commit()


class RegisterBody(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)
    display_name: str = ""
    role: str = "learner"

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
    if body.role not in ("learner", "provider", "reviewer", "finance", "admin", "sponsor"):
        raise HTTPException(status_code=400, detail="Unsupported role.")
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


# --------------------------------------------------------- courses & plans ---


class CourseBody(BaseModel):
    title: str = Field(min_length=1)
    provider: str = ""
    description: str = ""


class PlanBody(BaseModel):
    kind: str = Field(pattern="^(free|subsidized|scholarship|sponsor|paid)$")
    price: float = 0.0
    evidence_required: str = ""
    window_start: str = ""
    window_end: str = ""


@router.get("/api/courses")
def list_courses(user: User = Depends(current_user), db: Session = Depends(get_db)):
    out = []
    for course in db.query(Course).all():
        plans = db.query(AccessPlan).filter(AccessPlan.course_id == course.id, AccessPlan.active == "yes").all()
        out.append({
            "id": course.id, "title": course.title, "provider": course.provider,
            "description": course.description,
            "plans": [{"id": p.id, "kind": p.kind, "price": p.price,
                       "evidence_required": p.evidence_required,
                       "window_start": p.window_start, "window_end": p.window_end} for p in plans],
        })
    return out


@router.post("/api/courses")
def create_course(body: CourseBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "provider", "admin")
    course = Course(**body.model_dump())
    db.add(course)
    db.commit()
    return {"id": course.id}


@router.post("/api/courses/{course_id}/plans")
def create_plan(course_id: int, body: PlanBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "provider", "admin")
    if db.get(Course, course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found.")
    plan = AccessPlan(course_id=course_id, **body.model_dump())
    db.add(plan)
    db.commit()
    return {"id": plan.id}


# ----------------------------------------------------------- applications ---


class ApplicationBody(BaseModel):
    plan_id: int
    statement: str = ""


class DecisionBody(BaseModel):
    status: str = Field(pattern="^(needs_info|under_review|approved|waitlisted|declined|enrolled|completed|withdrawn)$")
    decision_reason: str = ""
    pool_id: int | None = None


def _app_dict(a: Application) -> dict:
    return {
        "id": a.id, "uid": a.uid, "plan_id": a.plan_id, "learner_id": a.learner_id,
        "statement": a.statement, "status": a.status, "decision_reason": a.decision_reason,
        "pool_id": a.pool_id,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


@router.post("/api/applications")
def apply(body: ApplicationBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    plan = db.get(AccessPlan, body.plan_id)
    if not plan or plan.active != "yes":
        raise HTTPException(status_code=404, detail="Access plan not found.")
    application = Application(uid=uuid.uuid4().hex, learner_id=user.id, plan_id=body.plan_id,
                              statement=body.statement)
    db.add(application)
    db.commit()
    audit(db, user, "application.submit", f"application:{application.uid}")
    return _app_dict(application)


@router.get("/api/applications")
def list_applications(user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = db.query(Application).order_by(Application.id.desc())
    if user.role == "learner":
        query = query.filter(Application.learner_id == user.id)
    return [_app_dict(a) for a in query.all()]


@router.post("/api/applications/{app_id}/decision")
def decide(app_id: int, body: DecisionBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "reviewer", "admin")
    application = db.get(Application, app_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")
    try:
        core.validate_transition(application.status, body.status, body.decision_reason)
    except core.WorkflowError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    application.status = body.status
    application.decision_reason = body.decision_reason
    application.reviewer_id = user.id

    if body.status == "approved" and body.pool_id:
        pool = db.get(FundingPool, body.pool_id)
        if not pool:
            raise HTTPException(status_code=404, detail="Funding pool not found.")
        result = core.allocate_seats(pool.seats_total, pool.seats_committed, 1)
        if result.allocated == 0:
            raise HTTPException(status_code=409, detail=result.note)
        pool.seats_committed += result.allocated
        db.add(SeatAllocation(application_id=application.id, pool_id=pool.id, seats=result.allocated))
        application.pool_id = pool.id
    db.commit()
    audit(db, user, "application.decision", f"application:{application.uid}", f"{body.status}: {body.decision_reason[:80]}")
    return _app_dict(application)


# ------------------------------------------------------------ funding pools ---


class PoolBody(BaseModel):
    name: str = Field(min_length=1)
    seats_total: int = Field(ge=0)
    cash_total: float = 0.0
    criteria: str = ""
    window_start: str = ""
    window_end: str = ""


@router.get("/api/pools")
def list_pools(user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = db.query(FundingPool)
    if user.role == "sponsor":
        query = query.filter(FundingPool.sponsor_id == user.id)  # sponsor isolation
    rows = []
    for pool in query.all():
        rows.append({
            "id": pool.id, "name": pool.name, "sponsor_id": pool.sponsor_id,
            "seats_total": pool.seats_total, "seats_committed": pool.seats_committed,
            "seats_available": max(0, pool.seats_total - pool.seats_committed),
            "criteria": pool.criteria,
        })
    return rows


@router.post("/api/pools")
def create_pool(body: PoolBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "sponsor", "admin", "finance")
    pool = FundingPool(**body.model_dump(), sponsor_id=user.id if user.role == "sponsor" else None)
    db.add(pool)
    db.commit()
    audit(db, user, "pool.create", f"pool:{pool.id}", pool.name)
    return {"id": pool.id}


# -------------------------------------------------------------- ledger ---


class TransactionBody(BaseModel):
    pool_id: int | None = None
    kind: str
    amount: float = Field(gt=0)
    status: str = "pending"
    reference: str = ""
    note: str = ""


@router.get("/api/ledger")
def ledger(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "finance", "admin")
    rows = db.query(Transaction).order_by(Transaction.id.desc()).all()
    return {
        "balance": core.ledger_balance(rows),
        "transactions": [
            {"id": t.id, "kind": t.kind, "amount": t.amount, "status": t.status,
             "reference": t.reference, "note": t.note,
             "created_at": t.created_at.isoformat() if t.created_at else None}
            for t in rows
        ],
    }


@router.post("/api/ledger")
def create_transaction(body: TransactionBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "finance", "admin")
    try:
        core.validate_transaction(body.kind, body.status)
    except core.WorkflowError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    transaction = Transaction(**body.model_dump())
    db.add(transaction)
    db.commit()
    audit(db, user, "transaction.create", f"transaction:{transaction.id}", f"{body.kind}/{body.status}")
    return {"id": transaction.id}


# ---------------------------------------------------------------- appeals ---


class AppealBody(BaseModel):
    reason: str = Field(min_length=1)


@router.post("/api/applications/{app_id}/appeals")
def appeal(app_id: int, body: AppealBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    application = db.get(Application, app_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")
    if user.role == "learner" and application.learner_id != user.id:
        raise HTTPException(status_code=404, detail="Application not found.")
    if application.status not in ("declined", "waitlisted"):
        raise HTTPException(status_code=400, detail="Appeals are available for declined or waitlisted decisions.")
    appeal_row = Appeal(application_id=app_id, reason=body.reason)
    db.add(appeal_row)
    db.commit()
    return {"id": appeal_row.id, "status": appeal_row.status}


# ---------------------------------------------------------------- reports ---


@router.get("/api/reports/sponsor/{pool_id}")
def sponsor_report(pool_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    pool = db.get(FundingPool, pool_id)
    if not pool:
        raise HTTPException(status_code=404, detail="Funding pool not found.")
    if user.role == "sponsor" and pool.sponsor_id != user.id:
        raise HTTPException(status_code=404, detail="Funding pool not found.")  # isolation
    allocations = db.query(SeatAllocation).filter(SeatAllocation.pool_id == pool_id).all()
    applications = db.query(Application).filter(Application.pool_id == pool_id).all()
    return core.sponsor_report(pool, allocations, applications)
