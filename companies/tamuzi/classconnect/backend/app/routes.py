"""ClassConnect HTTP routes: auth, classes, sessions, attendance, chat, polls, assignments."""
from __future__ import annotations

import json
import os
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from . import config, core, security
from .database import get_db
from .models import (
    Assignment, Attendance, AuditEvent, Class, ClassEnrollment, LiveSession, Message, Poll, Submission, User,
)

router = APIRouter()

ROOM_SECRET = os.environ.get("CLASSCONNECT_ROOM_SECRET") or secrets.token_urlsafe(48)


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


def is_member(db: Session, class_id: int, user: User) -> bool:
    if user.role in ("admin", "support"):
        return True
    cls = db.get(Class, class_id)
    if cls and cls.teacher_id == user.id:
        return True
    return db.query(ClassEnrollment).filter(ClassEnrollment.class_id == class_id, ClassEnrollment.user_id == user.id).first() is not None


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
    if body.role not in ("learner", "teacher", "admin", "support"):
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
    return {**core.provider_status(), "low_bandwidth": core.LOW_BANDWIDTH_POLICY}


# ----------------------------------------------------------------- classes ---


class ClassBody(BaseModel):
    name: str = Field(min_length=1)
    subject: str = ""
    description: str = ""


@router.get("/api/classes")
def list_classes(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = []
    for cls in db.query(Class).all():
        if not is_member(db, cls.id, user) and user.role == "learner":
            continue
        rows.append({"id": cls.id, "name": cls.name, "subject": cls.subject,
                     "description": cls.description, "teacher_id": cls.teacher_id,
                     "member": is_member(db, cls.id, user)})
    return rows


@router.post("/api/classes")
def create_class(body: ClassBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "teacher", "admin")
    cls = Class(name=body.name, subject=body.subject, description=body.description, teacher_id=user.id)
    db.add(cls)
    db.commit()
    audit(db, user, "class.create", f"class:{cls.id}", cls.name)
    return {"id": cls.id}


@router.post("/api/classes/{class_id}/join")
def join_class(class_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if db.get(Class, class_id) is None:
        raise HTTPException(status_code=404, detail="Class not found.")
    existing = db.query(ClassEnrollment).filter(ClassEnrollment.class_id == class_id, ClassEnrollment.user_id == user.id).first()
    if not existing:
        db.add(ClassEnrollment(class_id=class_id, user_id=user.id))
        db.commit()
    return {"joined": True}


# ---------------------------------------------------------------- sessions ---


class SessionBody(BaseModel):
    title: str = Field(min_length=1)
    objectives: str = ""
    start_at: str = Field(min_length=1)  # ISO
    end_at: str = ""
    recording_consent: str = "no"


def _session_dict(s: LiveSession) -> dict:
    return {
        "id": s.id, "class_id": s.class_id, "title": s.title, "objectives": s.objectives,
        "start_at": s.start_at, "end_at": s.end_at, "status": s.status,
        "recording_consent": s.recording_consent, "summary": s.summary,
    }


@router.get("/api/sessions")
def list_sessions(class_id: int | None = None, user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = db.query(LiveSession).order_by(LiveSession.start_at)
    if class_id is not None:
        query = query.filter(LiveSession.class_id == class_id)
    return [_session_dict(s) for s in query.all() if is_member(db, s.class_id, user)]


@router.post("/api/classes/{class_id}/sessions")
def create_session(class_id: int, body: SessionBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "teacher", "admin")
    if db.get(Class, class_id) is None:
        raise HTTPException(status_code=404, detail="Class not found.")
    if body.recording_consent not in ("yes", "no"):
        raise HTTPException(status_code=400, detail="recording_consent must be yes or no.")
    existing = db.query(LiveSession).filter(LiveSession.class_id == class_id).all()
    conflicts = core.find_conflicts(existing, body.start_at, body.end_at or body.start_at)
    if conflicts:
        raise HTTPException(status_code=409, detail=f"Schedule conflict with session(s): {', '.join(map(str, conflicts))}.")
    session = LiveSession(class_id=class_id, title=body.title, objectives=body.objectives,
                          start_at=body.start_at, end_at=body.end_at, recording_consent=body.recording_consent)
    db.add(session)
    db.commit()
    audit(db, user, "session.create", f"session:{session.id}", session.title)
    return _session_dict(session)


@router.post("/api/sessions/{session_id}/transition")
def transition(session_id: int, body: dict, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "teacher", "admin", "support")
    session = db.get(LiveSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    target = body.get("status", "")
    try:
        core.validate_transition(session.status, target)
    except core.SessionError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    session.status = target
    if target == "ended" and body.get("summary"):
        session.summary = str(body["summary"])
    db.commit()
    audit(db, user, "session.transition", f"session:{session.id}", target)
    return _session_dict(session)


@router.post("/api/sessions/{session_id}/room-token")
def room_token(session_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    session = db.get(LiveSession, session_id)
    if not session or not is_member(db, session.class_id, user):
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.status not in ("starting", "live"):
        raise HTTPException(status_code=400, detail="Room tokens are issued only for starting or live sessions.")
    token = core.mint_room_token(session_id, user.id, ROOM_SECRET)
    return {"token": token, "expires_in_seconds": core.TOKEN_TTL_SECONDS,
            "provider": core.provider_status()}


@router.get("/api/sessions/{session_id}/attendance")
def attendance(session_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    session = db.get(LiveSession, session_id)
    if not session or not is_member(db, session.class_id, user):
        raise HTTPException(status_code=404, detail="Session not found.")
    rows = db.query(Attendance).filter(Attendance.session_id == session_id).all()
    return core.attendance_summary(rows)


class AttendanceBody(BaseModel):
    user_id: int
    state: str = Field(pattern="^(present|absent|late|left_early)$")


@router.post("/api/sessions/{session_id}/attendance")
def record_attendance(session_id: int, body: AttendanceBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "teacher", "admin")
    session = db.get(LiveSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    row = db.query(Attendance).filter(Attendance.session_id == session_id, Attendance.user_id == body.user_id).first()
    if row:
        row.state = body.state
    else:
        db.add(Attendance(session_id=session_id, user_id=body.user_id, state=body.state))
    db.commit()
    return {"ok": True}


# ------------------------------------------------------- chat + moderation ---


class MessageBody(BaseModel):
    kind: str = "chat"
    body: str = Field(min_length=1)
    hand_raised: str = "no"


@router.get("/api/sessions/{session_id}/messages")
def list_messages(session_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    session = db.get(LiveSession, session_id)
    if not session or not is_member(db, session.class_id, user):
        raise HTTPException(status_code=404, detail="Session not found.")
    rows = db.query(Message).filter(Message.session_id == session_id, Message.visible == "yes").order_by(Message.id).all()
    return [{"id": m.id, "kind": m.kind, "body": m.body, "hand_raised": m.hand_raised == "yes",
             "user_id": m.user_id, "created_at": m.created_at.isoformat() if m.created_at else None} for m in rows]


@router.post("/api/sessions/{session_id}/messages")
def post_message(session_id: int, body: MessageBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    session = db.get(LiveSession, session_id)
    if not session or not is_member(db, session.class_id, user):
        raise HTTPException(status_code=404, detail="Session not found.")
    if body.kind not in ("chat", "question", "note"):
        raise HTTPException(status_code=400, detail="kind must be chat, question or note.")
    message = Message(session_id=session_id, user_id=user.id, kind=body.kind, body=body.body,
                      hand_raised=body.hand_raised)
    db.add(message)
    db.commit()
    return {"id": message.id}


@router.post("/api/messages/{message_id}/moderate")
def moderate(message_id: int, body: dict, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "teacher", "admin")
    message = db.get(Message, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found.")
    message.visible = "no" if body.get("action") == "hide" else "yes"
    db.commit()
    audit(db, user, "message.moderate", f"message:{message.id}", str(body.get("action")))
    return {"visible": message.visible == "yes"}


# ------------------------------------------------------------------- polls ---


class PollBody(BaseModel):
    question: str = Field(min_length=1)
    options: list[str] = Field(min_length=2)


class VoteBody(BaseModel):
    option: str


@router.post("/api/sessions/{session_id}/polls")
def create_poll(session_id: int, body: PollBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "teacher", "admin")
    poll = Poll(session_id=session_id, question=body.question, options_json=json.dumps(body.options))
    db.add(poll)
    db.commit()
    return {"id": poll.id}


@router.post("/api/polls/{poll_id}/vote")
def vote(poll_id: int, body: VoteBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    poll = db.get(Poll, poll_id)
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found.")
    try:
        poll.votes_json = core.poll_vote(poll.votes_json, body.option, json.loads(poll.options_json))
    except core.SessionError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    db.commit()
    return {"votes": json.loads(poll.votes_json)}


# -------------------------------------------------- async follow-up space ---


class AssignmentBody(BaseModel):
    title: str = Field(min_length=1)
    body: str = ""


class SubmissionBody(BaseModel):
    body: str = Field(min_length=1)


@router.post("/api/sessions/{session_id}/assignments")
def create_assignment(session_id: int, body: AssignmentBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "teacher", "admin")
    assignment = Assignment(session_id=session_id, title=body.title, body=body.body)
    db.add(assignment)
    db.commit()
    return {"id": assignment.id}


@router.get("/api/sessions/{session_id}/assignments")
def list_assignments(session_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    session = db.get(LiveSession, session_id)
    if not session or not is_member(db, session.class_id, user):
        raise HTTPException(status_code=404, detail="Session not found.")
    rows = db.query(Assignment).filter(Assignment.session_id == session_id).all()
    return [{"id": a.id, "title": a.title, "body": a.body} for a in rows]


@router.post("/api/assignments/{assignment_id}/submissions")
def submit(assignment_id: int, body: SubmissionBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if db.get(Assignment, assignment_id) is None:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    row = Submission(assignment_id=assignment_id, user_id=user.id, body=body.body)
    db.add(row)
    db.commit()
    return {"id": row.id}


@router.post("/api/submissions/{submission_id}/respond")
def respond(submission_id: int, body: dict, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "teacher", "admin")
    row = db.get(Submission, submission_id)
    if not row:
        raise HTTPException(status_code=404, detail="Submission not found.")
    row.response = str(body.get("response", ""))
    db.commit()
    return {"id": row.id}
