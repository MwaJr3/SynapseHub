"""TeachCraft HTTP routes: auth, courses/units/lessons, workflow, versions, comments, question bank, export."""
from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from . import config, core, security
from .database import get_db
from .models import AuditEvent, Comment, Course, Lesson, LessonVersion, QuestionItem, Unit, User

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
    if body.role not in ("teacher", "reviewer", "admin"):
        raise HTTPException(status_code=400, detail="Role must be teacher, reviewer or admin.")
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


# ---------------------------------------------------- courses/units/lessons ---


class CourseBody(BaseModel):
    title: str = Field(min_length=1)
    subject: str = ""
    grade: str = ""
    language: str = "en"
    license: str = ""


class UnitBody(BaseModel):
    title: str = Field(min_length=1)


class LessonBody(BaseModel):
    title: str = Field(min_length=1)
    objective: str = ""
    blocks: list[dict] = Field(default_factory=list)
    template: str = "blank"
    est_minutes: int = 15
    change_summary: str = ""


@router.get("/api/courses")
def list_courses(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [{"id": c.id, "title": c.title, "subject": c.subject, "grade": c.grade,
             "language": c.language, "license": c.license} for c in db.query(Course).all()]


@router.post("/api/courses")
def create_course(body: CourseBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    course = Course(**body.model_dump())
    db.add(course)
    db.commit()
    audit(db, user, "course.create", f"course:{course.id}", course.title)
    return {"id": course.id}


@router.post("/api/courses/{course_id}/units")
def create_unit(course_id: int, body: UnitBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    unit = Unit(course_id=course_id, title=body.title, position=len(course.units) if hasattr(course, "units") else 0)
    db.add(unit)
    db.commit()
    return {"id": unit.id}


@router.post("/api/units/{unit_id}/lessons")
def create_lesson(unit_id: int, body: LessonBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    unit = db.get(Unit, unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found.")
    blocks = body.blocks or core.expand_template(body.template)
    lesson = Lesson(unit_id=unit_id, title=body.title, objective=body.objective,
                    blocks_json=json.dumps(blocks), template=body.template,
                    est_minutes=body.est_minutes, owner_id=user.id)
    db.add(lesson)
    db.flush()
    db.add(LessonVersion(lesson_id=lesson.id, version=1, title=lesson.title,
                         blocks_json=lesson.blocks_json, change_summary="Initial draft", created_by=user.id))
    db.commit()
    audit(db, user, "lesson.create", f"lesson:{lesson.id}", lesson.title)
    return {"id": lesson.id, "version": 1}


@router.get("/api/lessons")
def list_lessons(status: str = "", user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = db.query(Lesson)
    if status:
        query = query.filter(Lesson.status == status)
    return [
        {"id": l.id, "title": l.title, "status": l.status, "version": l.version,
         "unit_id": l.unit_id, "objective": l.objective}
        for l in query.all()
    ]


@router.get("/api/lessons/{lesson_id}")
def lesson_detail(lesson_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    versions = db.query(LessonVersion).filter(LessonVersion.lesson_id == lesson_id).order_by(LessonVersion.version).all()
    comments = db.query(Comment).filter(Comment.lesson_id == lesson_id).all()
    return {
        "id": lesson.id, "title": lesson.title, "objective": lesson.objective,
        "blocks": json.loads(lesson.blocks_json), "template": lesson.template,
        "est_minutes": lesson.est_minutes, "status": lesson.status, "version": lesson.version,
        "versions": [{"version": v.version, "change_summary": v.change_summary, "title": v.title} for v in versions],
        "comments": [{"id": c.id, "body": c.body, "resolved": c.resolved == "yes"} for c in comments],
    }


@router.patch("/api/lessons/{lesson_id}")
def edit_lesson(lesson_id: int, body: LessonBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    if not core.is_editable(lesson.status):
        raise HTTPException(status_code=400, detail="Published or archived lessons cannot be edited in place — restore an older version or create a draft copy.")
    lesson.title = body.title
    lesson.objective = body.objective
    lesson.blocks_json = json.dumps(body.blocks)
    lesson.est_minutes = body.est_minutes
    lesson.version += 1
    lesson.updated_at = datetime.now(timezone.utc)
    db.add(LessonVersion(lesson_id=lesson.id, version=lesson.version, title=lesson.title,
                         blocks_json=lesson.blocks_json,
                         change_summary=body.change_summary or "Edited", created_by=user.id))
    db.commit()
    audit(db, user, "lesson.edit", f"lesson:{lesson.id}", f"v{lesson.version}")
    return {"id": lesson.id, "version": lesson.version}


@router.post("/api/lessons/{lesson_id}/transition")
def transition(lesson_id: int, body: dict, user: User = Depends(current_user), db: Session = Depends(get_db)):
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    target = body.get("status", "")
    try:
        core.validate_transition(lesson.status, target)
    except core.WorkflowError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if target == "published":
        require_role(user, "reviewer", "admin")
    lesson.status = target
    db.commit()
    audit(db, user, "lesson.transition", f"lesson:{lesson.id}", target)
    return {"id": lesson.id, "status": lesson.status}


@router.post("/api/lessons/{lesson_id}/restore/{version}")
def restore(lesson_id: int, version: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    snapshots = [
        {"version": v.version, "title": v.title, "blocks_json": v.blocks_json}
        for v in db.query(LessonVersion).filter(LessonVersion.lesson_id == lesson_id).all()
    ]
    try:
        plan = core.restore_plan(snapshots, version)
    except core.WorkflowError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    lesson.title = plan["title"]
    lesson.blocks_json = plan["blocks_json"]
    lesson.version = plan["new_version"]
    lesson.status = "draft"
    db.add(LessonVersion(lesson_id=lesson.id, version=plan["new_version"], title=plan["title"],
                         blocks_json=plan["blocks_json"], change_summary=plan["change_summary"], created_by=user.id))
    db.commit()
    audit(db, user, "lesson.restore", f"lesson:{lesson.id}", plan["change_summary"])
    return {"id": lesson.id, "version": lesson.version, "status": lesson.status}


class CommentBody(BaseModel):
    body: str = Field(min_length=1)


@router.post("/api/lessons/{lesson_id}/comments")
def add_comment(lesson_id: int, body: CommentBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if db.get(Lesson, lesson_id) is None:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    comment = Comment(lesson_id=lesson_id, author_id=user.id, body=body.body)
    db.add(comment)
    db.commit()
    return {"id": comment.id}


@router.post("/api/comments/{comment_id}/resolve")
def resolve_comment(comment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found.")
    comment.resolved = "yes"
    db.commit()
    return {"id": comment.id, "resolved": True}


# ----------------------------------------------------------- question bank ---


class QuestionBody(BaseModel):
    kind: str
    prompt: str = Field(min_length=1)
    choices: list = Field(default_factory=list)
    answer: object
    tags: str = ""


@router.get("/api/questions")
def list_questions(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [
        {"id": q.id, "kind": q.kind, "prompt": q.prompt, "choices": json.loads(q.choices_json),
         "answer": json.loads(q.answer_json), "tags": q.tags}
        for q in db.query(QuestionItem).all()
    ]


@router.post("/api/questions")
def create_question(body: QuestionBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    problems = core.validate_question(body.kind, body.choices, body.answer)
    if problems:
        raise HTTPException(status_code=400, detail="; ".join(problems))
    question = QuestionItem(owner_id=user.id, kind=body.kind, prompt=body.prompt,
                            choices_json=json.dumps(body.choices), answer_json=json.dumps(body.answer), tags=body.tags)
    db.add(question)
    db.commit()
    audit(db, user, "question.create", f"question:{question.id}", body.kind)
    return {"id": question.id}


@router.delete("/api/questions/{question_id}")
def delete_question(question_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    question = db.get(QuestionItem, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")
    db.delete(question)
    db.commit()
    return {"ok": True}


# ------------------------------------------------------------------ export ---


@router.get("/api/lessons/{lesson_id}/export.html", response_class=HTMLResponse)
def export_lesson(lesson_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    audit(db, user, "lesson.export", f"lesson:{lesson.id}", f"v{lesson.version}")
    return HTMLResponse(core.export_lesson_html(lesson.title, lesson.blocks_json, lesson.version))
