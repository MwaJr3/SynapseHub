"""TutorSpring HTTP routes: auth, sources, conversations, flags/review, practice, summaries."""
from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from . import config, core, providers, security
from .database import get_db
from .models import Conversation, Message, PracticeAttempt, RateWindow, Source, User

router = APIRouter()

RATE_LIMIT_PER_HOUR = 30


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
    if body.role not in ("learner", "teacher", "admin"):
        raise HTTPException(status_code=400, detail="Role must be learner, teacher or admin.")
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


@router.get("/api/config")
def provider_config(user: User = Depends(current_user)):
    provider = providers.get_provider()
    return {
        "provider": provider.name,
        "demo_mode": isinstance(provider, providers.DemoProvider),
        "note": "Demo mode uses prepared example responses and labels them as such. "
                "Live model use requires explicit server-side configuration.",
        "modes": core.MODES,
    }


# --------------------------------------------------------------- sources ----


class SourceBody(BaseModel):
    title: str = Field(min_length=1)
    topic: str = Field(min_length=1)
    grade: str = ""
    language: str = "en"
    body: str = Field(min_length=1)
    approved: str = "yes"


@router.get("/api/sources")
def list_sources(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [
        {"id": s.id, "title": s.title, "topic": s.topic, "grade": s.grade, "language": s.language,
         "approved": s.approved, "body_preview": s.body[:200]}
        for s in db.query(Source).all()
    ]


@router.post("/api/sources")
def create_source(body: SourceBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin", "teacher")
    source = Source(**body.model_dump(), created_by=user.id)
    db.add(source)
    db.commit()
    return {"id": source.id}


@router.delete("/api/sources/{source_id}")
def delete_source(source_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin")
    source = db.get(Source, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found.")
    db.delete(source)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------- conversations ---


class ChatBody(BaseModel):
    conversation_id: int | None = None
    mode: str = "Explain"
    question: str = Field(min_length=1, max_length=2000)
    topic: str = ""
    grade: str = ""
    language: str = "en"


def _check_rate(db: Session, user: User) -> None:
    now = datetime.now(timezone.utc)
    window = now.strftime("%Y-%m-%dT%H")
    row = db.query(RateWindow).filter(RateWindow.user_id == user.id, RateWindow.window_start == window).first()
    if not row:
        row = RateWindow(user_id=user.id, window_start=window, count=0)
        db.add(row)
    row.count += 1
    if row.count > RATE_LIMIT_PER_HOUR:
        raise HTTPException(status_code=429, detail="Rate limit reached. Try again later.")
    db.commit()


@router.post("/api/chat")
def chat(body: ChatBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    _check_rate(db, user)
    if body.conversation_id:
        conversation = db.get(Conversation, body.conversation_id)
        if not conversation or conversation.user_id != user.id:
            raise HTTPException(status_code=404, detail="Conversation not found.")
    else:
        conversation = Conversation(user_id=user.id, topic=body.topic, mode=body.mode)
        db.add(conversation)
        db.flush()
    db.add(Message(conversation_id=conversation.id, role="user", text=body.question, demo_response="no"))

    sources = db.query(Source).all()
    result = core.answer(body.mode, body.question, sources, providers.get_provider(), body.grade, body.language)
    message = Message(
        conversation_id=conversation.id, role="assistant", text=result.text,
        sources_json=core.serialize_sources(result.sources),
        demo_response="yes" if result.demo else "no",
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return {
        "conversation_id": conversation.id,
        "message_id": message.id,
        "text": message.text,
        "sources": json.loads(message.sources_json),
        "supported": result.supported,
        "demo_response": result.demo,
        "provider": result.provider,
        "disclaimer": "AI-generated responses can be wrong. Check the cited sources and ask a teacher when unsure.",
    }


@router.get("/api/conversations")
def list_conversations(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(Conversation).filter(Conversation.user_id == user.id).order_by(Conversation.id.desc()).all()
    return [{"id": c.id, "topic": c.topic, "mode": c.mode, "created_at": c.created_at.isoformat()} for c in rows]


@router.get("/api/conversations/{conversation_id}")
def get_conversation(conversation_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    conversation = db.get(Conversation, conversation_id)
    if not conversation or conversation.user_id != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.id).all()
    return {
        "id": conversation.id, "topic": conversation.topic, "mode": conversation.mode,
        "messages": [
            {"id": m.id, "role": m.role, "text": m.text, "sources": json.loads(m.sources_json),
             "demo_response": m.demo_response == "yes", "flagged": m.flagged == "yes",
             "review_status": m.review_status}
            for m in messages
        ],
    }


@router.delete("/api/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    conversation = db.get(Conversation, conversation_id)
    if not conversation or conversation.user_id != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    db.query(Message).filter(Message.conversation_id == conversation_id).delete()
    db.delete(conversation)
    db.commit()
    return {"ok": True}


class FlagBody(BaseModel):
    reason: str = Field(min_length=1)


@router.post("/api/messages/{message_id}/flag")
def flag_message(message_id: int, body: FlagBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    message = db.get(Message, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found.")
    conversation = db.get(Conversation, message.conversation_id)
    if conversation.user_id != user.id:
        raise HTTPException(status_code=404, detail="Message not found.")
    try:
        message.review_status = core.flag_message(body.reason)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    message.flagged = "yes"
    message.flag_reason = body.reason
    db.commit()
    return {"status": message.review_status}


# ------------------------------------------------------------ review queue --


@router.get("/api/review-queue")
def review_queue(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "teacher", "admin")
    rows = db.query(Message).filter(Message.flagged == "yes").order_by(Message.id.desc()).all()
    return [
        {"id": m.id, "conversation_id": m.conversation_id, "text": m.text, "flag_reason": m.flag_reason,
         "review_status": m.review_status, "review_note": m.review_note}
        for m in rows
    ]


class ReviewBody(BaseModel):
    decision: str
    note: str = ""


@router.post("/api/messages/{message_id}/review")
def review_message(message_id: int, body: ReviewBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "teacher", "admin")
    message = db.get(Message, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found.")
    try:
        message.review_status, message.review_note = core.review_decision(body.decision, body.note)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    db.commit()
    return {"status": message.review_status}


# --------------------------------------------------------------- practice ---


class PracticeBody(BaseModel):
    topic: str = Field(min_length=1)
    question: str = Field(min_length=1)
    answer: str = ""
    self_correct: str = "no"


@router.post("/api/practice")
def practice(body: PracticeBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    attempt = PracticeAttempt(user_id=user.id, topic=body.topic, question=body.question,
                              answer=body.answer, self_correct=body.self_correct)
    db.add(attempt)
    db.commit()
    return {"id": attempt.id}


@router.get("/api/teacher/summary")
def teacher_summary(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "teacher", "admin")
    practice_rows = db.query(PracticeAttempt).all()
    flagged_topics = [
        db.get(Conversation, m.conversation_id).topic
        for m in db.query(Message).filter(Message.flagged == "yes").all()
    ]
    return core.teacher_summary(practice_rows, [t for t in flagged_topics if t])
