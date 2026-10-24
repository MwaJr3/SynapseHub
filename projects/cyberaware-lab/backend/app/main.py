"""CyberAware Lab API. Fictional simulations only; visible banners enforced
server-side; no password collection; RBAC learner vs instructor."""
from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .config import settings
from .db import Base, engine, get_db
from .models import (Assignment, Completion, Group, InstructorNote, Membership, ResetToken,
                     QuizAttempt, SessionToken, Template, User, now)
from .quiz import public_questions, score_attempt
from .scenario_guard import BANNER_TEXT, ScenarioRejected, banner_html, validate_scenario
from .security import (expiry, expiry_minutes, hash_password, new_token, otpauth_url,
                       totp_secret, totp_verify, verify_password)

Base.metadata.create_all(bind=engine)
app = FastAPI(title="CyberAware Lab", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5177", "http://127.0.0.1:5177"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("cal_session", "")
    row = db.get(SessionToken, token) if token else None
    if row is None or row.revoked or row.expires_at < now():
        raise HTTPException(401, "not authenticated")
    return db.get(User, row.user_id)


def require_instructor(user: User = Depends(current_user)) -> User:
    if user.role != "instructor":
        raise HTTPException(403, "instructor role required")
    return user


class AuthBody(BaseModel):
    email: str
    password: str
    display_name: str = ""
    role: str = "learner"
    mfa_code: str = ""


def _session_response(db: Session, user: User) -> JSONResponse:
    token = new_token()
    db.add(SessionToken(token=token, user_id=user.id, label="web", expires_at=expiry(settings.session_days)))
    db.commit()
    resp = JSONResponse({"ok": True, "email": user.email, "role": user.role,
                         "display_name": user.display_name, "mfa_enabled": bool(user.mfa_enabled)})
    resp.set_cookie("cal_session", token, httponly=True, samesite="lax", max_age=settings.session_days * 86400)
    return resp


@app.post("/api/auth/register")
def register(body: AuthBody, db: Session = Depends(get_db)):
    if len(body.password) < 12 or "@" not in body.email:
        return JSONResponse({"error": "email required; password must be 12+ characters"}, status_code=422)
    if db.query(User).filter(User.email == body.email).first():
        return JSONResponse({"error": "registration failed"}, status_code=422)
    pw, salt = hash_password(body.password)
    db.add(User(email=body.email, password_hash=pw, salt=salt, display_name=body.display_name[:120],
                role="instructor" if body.role == "instructor" else "learner"))
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
    token = request.cookies.get("cal_session", "")
    row = db.get(SessionToken, token) if token else None
    if row is not None:
        row.revoked = 1
        db.commit()
    resp = JSONResponse({"ok": True})
    resp.delete_cookie("cal_session")
    return resp


@app.get("/api/me")
def me(user: User = Depends(current_user)):
    return {"email": user.email, "role": user.role, "display_name": user.display_name,
            "mfa_enabled": bool(user.mfa_enabled)}


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
    current = request.cookies.get("cal_session", "")
    db.query(SessionToken).filter(SessionToken.user_id == user.id,
                                  SessionToken.token != current).update({"revoked": 1})
    db.commit()
    return {"ok": True}



class GroupBody(BaseModel):
    name: str


@app.post("/api/groups")
def create_group(body: GroupBody, user: User = Depends(require_instructor), db: Session = Depends(get_db)):
    g = Group(name=body.name[:200], owner_id=user.id)
    db.add(g)
    db.commit()
    return {"id": g.id, "name": g.name}


@app.get("/api/groups")
def list_groups(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(Group).all()
    return {"groups": [{"id": g.id, "name": g.name} for g in rows]}


class MemberBody(BaseModel):
    group_id: int
    email: str


@app.post("/api/groups/members")
def add_member(body: MemberBody, user: User = Depends(require_instructor), db: Session = Depends(get_db)):
    member = db.query(User).filter(User.email == body.email).first()
    if member is None:
        raise HTTPException(404, "no user with that email")
    db.add(Membership(group_id=body.group_id, user_id=member.id))
    db.commit()
    return {"ok": True}


class TemplateBody(BaseModel):
    title: str
    kind: str
    content: str
    quiz_json: str = "[]"


@app.post("/api/templates")
def create_template(body: TemplateBody, user: User = Depends(require_instructor), db: Session = Depends(get_db)):
    try:
        validate_scenario(title=body.title, kind=body.kind, content=body.content)
    except ScenarioRejected as exc:
        return JSONResponse({"error": str(exc)}, status_code=422)
    t = Template(owner_id=user.id, title=body.title[:200], kind=body.kind,
                 content=body.content, quiz_json=body.quiz_json)
    db.add(t)
    db.commit()
    return {"id": t.id, "banner": BANNER_TEXT}


@app.get("/api/templates")
def list_templates(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(Template).all()
    return {"templates": [{"id": t.id, "title": t.title, "kind": t.kind} for t in rows]}


@app.get("/api/templates/{template_id}")
def get_template(template_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = db.get(Template, template_id)
    if t is None:
        raise HTTPException(404, "template not found")
    return {"id": t.id, "title": t.title, "kind": t.kind,
            "content": t.content,
            "banner": BANNER_TEXT,
            "banner_html": banner_html(),
            "questions": public_questions(t.quiz_json)}


class AssignmentBody(BaseModel):
    group_id: int
    template_id: int
    due_at: str = ""


@app.post("/api/assignments")
def create_assignment(body: AssignmentBody, user: User = Depends(require_instructor), db: Session = Depends(get_db)):
    if db.get(Group, body.group_id) is None or db.get(Template, body.template_id) is None:
        raise HTTPException(404, "group or template not found")
    a = Assignment(group_id=body.group_id, template_id=body.template_id, due_at=body.due_at[:40])
    db.add(a)
    db.commit()
    return {"id": a.id}


@app.get("/api/assignments")
def list_assignments(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = (db.query(Assignment, Template).join(Template, Template.id == Assignment.template_id)
            .order_by(Assignment.id.desc()).all())
    done = {c.assignment_id for c in db.query(Completion).filter(Completion.user_id == user.id)}
    return {"assignments": [{"id": a.id, "title": t.title, "kind": t.kind,
                             "template_id": t.id, "due_at": a.due_at,
                             "completed": a.id in done} for a, t in rows]}


class CompleteBody(BaseModel):
    assignment_id: int
    reflection: str = ""


@app.post("/api/completions")
def complete(body: CompleteBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if db.get(Assignment, body.assignment_id) is None:
        raise HTTPException(404, "assignment not found")
    exists = (db.query(Completion)
              .filter(Completion.assignment_id == body.assignment_id, Completion.user_id == user.id).first())
    if exists is None:
        db.add(Completion(assignment_id=body.assignment_id, user_id=user.id,
                          completed_at=now(), reflection=body.reflection[:2000]))
        db.commit()
    return {"ok": True}


class AttemptBody(BaseModel):
    assignment_id: int
    answers: list[int]


@app.post("/api/quiz-attempts")
def quiz_attempt(body: AttemptBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    a = db.get(Assignment, body.assignment_id)
    if a is None:
        raise HTTPException(404, "assignment not found")
    t = db.get(Template, a.template_id)
    score, total = score_attempt(t.quiz_json, body.answers)
    db.add(QuizAttempt(assignment_id=a.id, user_id=user.id, score=score, total=total, at=now()))
    db.commit()
    return {"score": score, "total": total}


@app.get("/api/reports/progress")
def progress_report(user: User = Depends(require_instructor), db: Session = Depends(get_db)):
    rows = (db.query(Assignment, Template, Group).join(Template, Template.id == Assignment.template_id)
            .join(Group, Group.id == Assignment.group_id).all())
    out = []
    for a, t, g in rows:
        members = [m.user_id for m in db.query(Membership).filter(Membership.group_id == g.id)]
        completions = (db.query(Completion)
                       .filter(Completion.assignment_id == a.id, Completion.user_id.in_(members)).count())
        attempts = (db.query(QuizAttempt)
                    .filter(QuizAttempt.assignment_id == a.id, QuizAttempt.user_id.in_(members)).all())
        out.append({
            "assignment_id": a.id, "group": g.name, "title": t.title, "kind": t.kind,
            "assigned": len(members), "completed": completions,
            "participation": f"{completions}/{len(members)}",
            "average_score": (round(sum(x.score / x.total for x in attempts) / len(attempts), 2)
                              if attempts and all(x.total for x in attempts) else None),
            "note": "Progress reflects recorded activity at query time; completion is not proof of lasting awareness.",
        })
    return {"report": out}


class NoteBody(BaseModel):
    assignment_id: int
    body: str


@app.post("/api/notes")
def add_note(body: NoteBody, user: User = Depends(require_instructor), db: Session = Depends(get_db)):
    if db.get(Assignment, body.assignment_id) is None:
        raise HTTPException(404, "assignment not found")
    n = InstructorNote(assignment_id=body.assignment_id, author_id=user.id, body=body.body[:2000], at=now())
    db.add(n)
    db.commit()
    return {"id": n.id}


@app.get("/api/assignments/{assignment_id}/notes")
def list_notes(assignment_id: int, user: User = Depends(require_instructor), db: Session = Depends(get_db)):
    rows = db.query(InstructorNote).filter(InstructorNote.assignment_id == assignment_id).all()
    return {"notes": [{"id": n.id, "body": n.body, "at": n.at} for n in rows]}


@app.get("/api/health")
def health():
    return {"ok": True, "app": "cyberaware-lab",
            "note": "Fictional simulation training only — visible banners, no real organizations, "
                    "no password collection, demo data only."}
