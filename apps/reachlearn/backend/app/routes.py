"""ReachLearn HTTP routes: auth, lessons, subscriptions, delivery queue, webhooks, reports."""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from . import config, core, security
from .database import get_db
from .models import (
    Cohort, CohortMember, DeliveryReceipt, Lesson, LearnerState, MessageJob, Subscription, User, WebhookEvent,
)

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
    if body.role not in ("learner", "educator", "admin", "provider_admin"):
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


@router.get("/api/provider")
def provider(user: User = Depends(current_user)):
    return core.provider_status()


# ------------------------------------------------------------------ lessons ---


class LessonBody(BaseModel):
    title: str = Field(min_length=1)
    topic: str = ""
    sequence: int = 1
    body: str = Field(min_length=1)
    question: str = ""
    options: list[str] = Field(default_factory=list)
    answer_index: int = 0
    language: str = "en"


@router.get("/api/lessons")
def list_lessons(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(Lesson).order_by(Lesson.sequence).all()
    return [{"id": l.id, "title": l.title, "topic": l.topic, "sequence": l.sequence,
             "body": l.body, "question": l.question, "options": json.loads(l.options_json),
             "language": l.language} for l in rows]


@router.post("/api/lessons")
def create_lesson(body: LessonBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "educator", "admin")
    lesson = Lesson(title=body.title, topic=body.topic, sequence=body.sequence, body=body.body,
                    question=body.question, options_json=json.dumps(body.options),
                    answer_index=body.answer_index, language=body.language)
    db.add(lesson)
    db.commit()
    return {"id": lesson.id}


@router.get("/api/lessons/{lesson_id}/preview")
def lesson_preview(lesson_id: int, channel: str = "sms", user: User = Depends(current_user), db: Session = Depends(get_db)):
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    options = json.loads(lesson.options_json)
    if channel == "sms":
        return {"channel": "sms", **core.render_sms(f"{lesson.title}: {lesson.body}")}
    if channel == "ussd":
        return {"channel": "ussd", **core.render_ussd(options, prefix=f"{lesson.title} — {lesson.body[:80]}")}
    if channel == "ivr":
        return {"channel": "ivr", "script": core.render_ivr(lesson.body, lesson.question, options)}
    return {"channel": "web", "title": lesson.title, "body": lesson.body, "question": lesson.question, "options": options}


# ---------------------------------------------------------- subscriptions ---


class SubscriptionBody(BaseModel):
    cohort_id: int
    consent: str = "yes"
    phone: str = ""
    language: str = "en"
    timezone: str = "Africa/Lusaka"
    quiet_start: str = "21:00"
    quiet_end: str = "07:00"
    max_per_day: int = 3


@router.post("/api/subscriptions")
def subscribe(body: SubscriptionBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if db.get(Cohort, body.cohort_id) is None:
        raise HTTPException(status_code=404, detail="Cohort not found.")
    if body.consent not in ("yes", "no"):
        raise HTTPException(status_code=400, detail="consent must be yes or no.")
    existing = db.query(Subscription).filter(Subscription.user_id == user.id, Subscription.cohort_id == body.cohort_id).first()
    if existing and existing.state != "opted_out":
        return {"id": existing.id, "state": existing.state}
    sub = Subscription(user_id=user.id, cohort_id=body.cohort_id, consent=body.consent, phone=body.phone,
                       language=body.language, timezone=body.timezone, quiet_start=body.quiet_start,
                       quiet_end=body.quiet_end, max_per_day=body.max_per_day)
    db.add(sub)
    state = db.query(LearnerState).filter(LearnerState.user_id == user.id).first()
    if not state:
        db.add(LearnerState(user_id=user.id))
    db.commit()
    return {"id": sub.id, "state": "active" if body.consent == "yes" else "new"}


@router.post("/api/subscriptions/{sub_id}/inbound")
def inbound(sub_id: int, body: dict, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Inbound learner messages (STOP etc.). STOP always wins."""
    sub = db.get(Subscription, sub_id)
    if not sub or sub.user_id != user.id:
        raise HTTPException(status_code=404, detail="Subscription not found.")
    action = core.handle_inbound(str(body.get("text", "")))
    if action == "opted_out":
        sub.state = "opted_out"
        sub.consent = "no"
    elif action == "resubscribe_requested":
        sub.state = "active" if sub.consent == "yes" else "new"
    db.commit()
    return {"action": action, "state": sub.state}


# --------------------------------------------------------- delivery queue ---


class JobBody(BaseModel):
    channel: str = "sms"
    kind: str = "lesson"
    body: str = Field(min_length=1)
    user_id: int | None = None
    local_hour: int = 12


@router.get("/api/jobs")
def list_jobs(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "educator", "admin", "provider_admin")
    rows = db.query(MessageJob).order_by(MessageJob.id.desc()).limit(200).all()
    return [{"id": j.id, "channel": j.channel, "kind": j.kind, "state": j.state,
             "simulator": j.simulator == "yes", "body": j.body[:80],
             "provider_uid": j.provider_uid} for j in rows]


@router.post("/api/jobs")
def create_job(body: JobBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "educator", "admin")
    subscription = (
        db.query(Subscription).filter(Subscription.user_id == body.user_id).first()
        if body.user_id else None
    )
    if subscription:
        sent_today = db.query(MessageJob).filter(MessageJob.user_id == body.user_id).count()
        decision = core.can_send(subscription, body.kind, body.local_hour, sent_today)
        if not decision.allowed:
            job = MessageJob(user_id=body.user_id, channel=body.channel, kind=body.kind,
                             body=body.body, state="failed", simulator="yes")
            db.add(job)
            db.commit()
            return {"id": job.id, "state": job.state, "blocked_reason": decision.reason}
    status = core.provider_status()
    provider = core.SimulatorProvider()
    sent = provider.send(str(body.user_id or "unknown"), body.body)
    job = MessageJob(user_id=body.user_id, channel=body.channel, kind=body.kind, body=body.body,
                     state="sent", simulator="yes" if status["simulator"] else "no",
                     provider_uid=sent["provider_uid"])
    db.add(job)
    db.commit()
    return {"id": job.id, "state": job.state, "simulator": status["simulator"], "provider_note": sent["note"]}


@router.post("/api/callbacks")
def provider_callback(payload: dict, db: Session = Depends(get_db)):
    """Provider delivery callbacks — validated + idempotent on provider_uid."""
    provider_uid = str(payload.get("provider_uid", ""))
    existing = {row.provider_uid for row in db.query(WebhookEvent).all()}
    result = core.process_webhook(provider_uid, json.dumps(payload), existing)
    if not result["applied"]:
        return {"applied": False, "reason": result["reason"]}
    db.add(WebhookEvent(provider_uid=provider_uid, payload_json=json.dumps(payload), processed="yes"))
    job = db.query(MessageJob).filter(MessageJob.provider_uid == provider_uid).first()
    if job:
        job.state = result["status"]
        db.add(DeliveryReceipt(job_id=job.id, status=result["status"], provider_uid=provider_uid))
    db.commit()
    return {"applied": True, "status": result["status"]}


@router.get("/api/reports/completion")
def completion_report(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "educator", "admin")
    lessons_total = db.query(Lesson).count()
    return core.completion_report(db.query(LearnerState).all(), lessons_total)
