"""LearnBridge HTTP routes: auth, catalogue, lessons, quizzes, progress, notes, sync."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from . import config, core, security
from .database import get_db
from .models import (
    Attempt, Bookmark, Course, Enrollment, Lesson, Module, Note, Progress, Question, Quiz, SessionToken, SyncEvent, User,
)

router = APIRouter()


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(config.SESSION_COOKIE)
    return security.require_user(db, token)


def require_role(user: User, *roles: str) -> User:
    if user.role not in roles:
        raise HTTPException(status_code=403, detail="Your role cannot perform this action.")
    return user


# ---------------------------------------------------------------- auth -----


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


@router.post("/api/auth/register")
def register(body: RegisterBody, response: Response, db: Session = Depends(get_db)):
    if body.role not in ("learner", "instructor", "admin"):
        raise HTTPException(status_code=400, detail="Role must be learner, instructor or admin.")
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(email=body.email.lower(), display_name=body.display_name or body.email.split("@")[0],
                password_hash=security.hash_password(body.password), role=body.role)
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


# -------------------------------------------------------------- catalogue --


def _course_dict(course: Course, enrolled: bool) -> dict:
    return {
        "id": course.id, "slug": course.slug, "title": course.title, "subject": course.subject,
        "level": course.level, "language": course.language, "est_minutes": course.est_minutes,
        "accessibility": course.accessibility, "license": course.license, "attribution": course.attribution,
        "description": course.description, "version": course.version, "archived": course.archived,
        "enrolled": enrolled, "lesson_count": sum(len(m.lessons) for m in course.modules),
    }


@router.get("/api/courses")
def list_courses(q: str = "", subject: str = "", level: str = "", user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = db.query(Course).filter(Course.archived == "no")
    if q:
        query = query.filter(Course.title.ilike(f"%{q}%"))
    if subject:
        query = query.filter(Course.subject == subject)
    if level:
        query = query.filter(Course.level == level)
    enrolled_ids = {e.course_id for e in db.query(Enrollment).filter(Enrollment.user_id == user.id).all()}
    return [_course_dict(c, c.id in enrolled_ids) for c in query.all()]


class CourseBody(BaseModel):
    slug: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1)
    subject: str = ""
    level: str = ""
    language: str = "en"
    est_minutes: int = 0
    accessibility: str = ""
    license: str = ""
    attribution: str = ""
    description: str = ""
    version: str = "1.0"


@router.post("/api/courses")
def create_course(body: CourseBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin", "instructor")
    if db.query(Course).filter(Course.slug == body.slug).first():
        raise HTTPException(status_code=409, detail="Course slug already exists.")
    course = Course(**body.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return _course_dict(course, False)


@router.patch("/api/courses/{course_id}")
def update_course(course_id: int, body: CourseBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin", "instructor")
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    for key, value in body.model_dump(exclude={"slug"}).items():
        setattr(course, key, value)
    db.commit()
    return _course_dict(course, False)


@router.post("/api/courses/{course_id}/archive")
def archive_course(course_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin", "instructor")
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    course.archived = "yes"  # archival, not destructive deletion (learning history preserved)
    db.commit()
    return {"id": course.id, "archived": "yes"}


# ----------------------------------------------------- modules and lessons -


class LessonBody(BaseModel):
    title: str = Field(min_length=1)
    content: list[dict] = Field(default_factory=list)
    requirements: dict = Field(default_factory=dict)
    est_minutes: int = 10
    version: str = "1.0"


class ModuleBody(BaseModel):
    title: str = Field(min_length=1)


@router.get("/api/courses/{course_id}")
def course_detail(course_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    course = db.get(Course, course_id)
    if not course or course.archived == "yes":
        raise HTTPException(status_code=404, detail="Course not found.")
    enrolled_ids = {e.course_id for e in db.query(Enrollment).filter(Enrollment.user_id == user.id).all()}
    body = _course_dict(course, course.id in enrolled_ids)
    body["modules"] = [
        {
            "id": m.id, "title": m.title, "position": m.position,
            "lessons": [
                {"id": l.id, "title": l.title, "position": l.position, "est_minutes": l.est_minutes,
                 "version": l.version, "quiz_ids": [q.id for q in l.quizzes]}
                for l in sorted(m.lessons, key=lambda x: x.position)
            ],
        }
        for m in sorted(course.modules, key=lambda x: x.position)
    ]
    return body


@router.post("/api/courses/{course_id}/modules")
def create_module(course_id: int, body: ModuleBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin", "instructor")
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    module = Module(course_id=course.id, title=body.title, position=len(course.modules))
    db.add(module)
    db.commit()
    return {"id": module.id}


@router.post("/api/modules/{module_id}/lessons")
def create_lesson(module_id: int, body: LessonBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "admin", "instructor")
    module = db.get(Module, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found.")
    lesson = Lesson(module_id=module.id, title=body.title, position=len(module.lessons),
                    est_minutes=body.est_minutes, content_json=json.dumps(body.content),
                    requirements_json=json.dumps(body.requirements), version=body.version)
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return {"id": lesson.id, "version": lesson.version}


@router.get("/api/lessons/{lesson_id}")
def lesson_detail(lesson_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    lesson = db.get(Lesson, lesson_id)
    if not lesson or lesson.archived == "yes":
        raise HTTPException(status_code=404, detail="Lesson not found.")
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user.id, Enrollment.course_id == lesson.module.course_id)
        .first()
    )
    if not enrollment and user.role == "learner":
        raise HTTPException(status_code=403, detail="Enroll in the course before opening its lessons.")
    progress = (
        db.query(Progress).filter(Progress.enrollment_id == enrollment.id, Progress.lesson_id == lesson.id).first()
        if enrollment else None
    )
    notes = db.query(Note).filter(Note.user_id == user.id, Note.lesson_id == lesson.id).all()
    bookmarked = db.query(Bookmark).filter(Bookmark.user_id == user.id, Bookmark.lesson_id == lesson.id).first() is not None
    return {
        "id": lesson.id, "title": lesson.title, "content": json.loads(lesson.content_json),
        "requirements": json.loads(lesson.requirements_json), "est_minutes": lesson.est_minutes,
        "version": lesson.version,
        "quiz_ids": [q.id for q in lesson.quizzes],
        "state": progress.state if progress else "not_started",
        "quiz_score": progress.quiz_score if progress else None,
        "notes": [{"id": n.id, "body": n.body} for n in notes],
        "bookmarked": bookmarked,
        "offline": {
            "available_for_download": True,
            "note": "Lesson text and quiz data can be saved to the device cache; audio/video links open only when online.",
        },
    }


# ----------------------------------------------------------------- enroll --


@router.post("/api/courses/{course_id}/enroll")
def enroll(course_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    course = db.get(Course, course_id)
    if not course or course.archived == "yes":
        raise HTTPException(status_code=404, detail="Course not found.")
    existing = db.query(Enrollment).filter(Enrollment.user_id == user.id, Enrollment.course_id == course_id).first()
    if existing:
        return {"id": existing.id}
    enrollment = Enrollment(user_id=user.id, course_id=course_id)
    db.add(enrollment)
    db.commit()
    return {"id": enrollment.id}


@router.get("/api/my/progress")
def my_progress(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = []
    for enrollment in db.query(Enrollment).filter(Enrollment.user_id == user.id).all():
        course = db.get(Course, enrollment.course_id)
        lessons = [
            l for m in course.modules for l in m.lessons if l.archived == "no"
        ]
        states = {
            p.lesson_id: p.state
            for p in db.query(Progress).filter(Progress.enrollment_id == enrollment.id).all()
        }
        done = sum(1 for l in lessons if states.get(l.id) == "completed")
        rows.append({
            "course_id": course.id, "course_title": course.title,
            "total_lessons": len(lessons), "completed": done,
            "states": states,
        })
    return rows


# ---------------------------------------------------------------- quizzes --


class AttemptBody(BaseModel):
    responses: dict[int, object]


@router.get("/api/quizzes/{quiz_id}")
def quiz_detail(quiz_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    quiz = db.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    return {
        "id": quiz.id, "title": quiz.title, "settings": json.loads(quiz.settings_json),
        "questions": [
            {"id": q.id, "kind": q.kind, "prompt": q.prompt, "choices": json.loads(q.choices_json), "position": q.position}
            for q in sorted(quiz.questions, key=lambda x: x.position)
        ],
    }


@router.post("/api/quizzes/{quiz_id}/attempts")
def submit_attempt(quiz_id: int, body: AttemptBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    quiz = db.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    lesson = quiz.lesson
    requirements = json.loads(lesson.requirements_json or "{}")
    min_score = float(requirements.get("min_quiz_score", 60))
    questions = sorted(quiz.questions, key=lambda x: x.position)
    try:
        result = core.grade_attempt(questions, {int(k): v for k, v in body.responses.items()}, min_score)
    except core.QuizError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    attempt = Attempt(quiz_id=quiz.id, user_id=user.id, answers_json=json.dumps(body.responses),
                      score=result.score, passed="yes" if result.passed else "no")
    db.add(attempt)
    # update progress for this lesson (quiz score feeds completion requirements)
    enrollment = (
        db.query(Enrollment).filter(Enrollment.user_id == user.id, Enrollment.course_id == lesson.module.course_id).first()
    )
    if enrollment:
        progress = db.query(Progress).filter(Progress.enrollment_id == enrollment.id, Progress.lesson_id == lesson.id).first()
        if not progress:
            progress = Progress(enrollment_id=enrollment.id, lesson_id=lesson.id, state="not_started", seconds=0)
            db.add(progress)
        progress.quiz_score = result.score
        requirements_met = core.lesson_requirements_met(lesson.requirements_json, result.score)
        progress.state = core.next_progress_state(progress.state, "submit_work", requirements_met)
    db.commit()
    settings = json.loads(quiz.settings_json)
    show = settings.get("show_explanations", "after_submit")
    return {
        "score": result.score, "passed": result.passed,
        "results": [
            {"question_id": r.question_id, "correct": r.correct,
             "explanation": r.explanation if show in ("always", "after_submit") else ""}
            for r in result.results
        ],
    }


# ---------------------------------------------------------- progress sync --


class ProgressBody(BaseModel):
    lesson_id: int
    event: str  # open | submit_work | requirements_met | needs_review | reset
    client_updated_at: str = ""
    seconds: int = 0


@router.put("/api/my/progress")
def put_progress(body: ProgressBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    lesson = db.get(Lesson, body.lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    enrollment = (
        db.query(Enrollment).filter(Enrollment.user_id == user.id, Enrollment.course_id == lesson.module.course_id).first()
    )
    if not enrollment:
        raise HTTPException(status_code=403, detail="Enroll in the course first.")
    progress = db.query(Progress).filter(Progress.enrollment_id == enrollment.id, Progress.lesson_id == lesson.id).first()
    if not progress:
        progress = Progress(enrollment_id=enrollment.id, lesson_id=lesson.id, state="not_started", seconds=0)
        db.add(progress)
    requirements_met = core.lesson_requirements_met(lesson.requirements_json, progress.quiz_score)
    try:
        progress.state = core.next_progress_state(progress.state, body.event, requirements_met)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    progress.seconds = (progress.seconds or 0) + max(0, body.seconds)
    progress.client_updated_at = body.client_updated_at
    db.commit()
    return {"state": progress.state, "quiz_score": progress.quiz_score}


# --------------------------------------------------- notes/bookmarks/sync --


class NoteBody(BaseModel):
    lesson_id: int
    body: str = Field(min_length=1)


class SyncBody(BaseModel):
    kind: str
    ref_id: int
    payload: dict
    client_ts: str = ""
    client_base_ts: str = ""


@router.post("/api/my/notes")
def create_note(body: NoteBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if db.get(Lesson, body.lesson_id) is None:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    note = Note(user_id=user.id, lesson_id=body.lesson_id, body=body.body)
    db.add(note)
    db.commit()
    return {"id": note.id}


@router.delete("/api/my/notes/{note_id}")
def delete_note(note_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
    if not note or note.user_id != user.id:
        raise HTTPException(status_code=404, detail="Note not found.")
    db.delete(note)
    db.commit()
    return {"ok": True}


@router.post("/api/my/bookmarks/{lesson_id}")
def toggle_bookmark(lesson_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if db.get(Lesson, lesson_id) is None:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    existing = db.query(Bookmark).filter(Bookmark.user_id == user.id, Bookmark.lesson_id == lesson_id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"bookmarked": False}
    db.add(Bookmark(user_id=user.id, lesson_id=lesson_id))
    db.commit()
    return {"bookmarked": True}


@router.post("/api/sync")
def sync_push(body: SyncBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Offline queue endpoint: applies queued changes, records conflicts instead of discarding."""
    server_record: dict | None = None
    if body.kind == "note":
        note = db.query(Note).filter(Note.user_id == user.id, Note.lesson_id == body.ref_id).first()
        if note:
            server_record = {"id": note.id, "body": note.body, "lesson_id": note.lesson_id,
                             "updated_at": note.updated_at.isoformat()}
    elif body.kind == "progress":
        lesson = db.get(Lesson, body.ref_id)
        enrollment = (
            db.query(Enrollment).filter(Enrollment.user_id == user.id,
                                        Enrollment.course_id == lesson.module.course_id).first()
            if lesson else None
        )
        progress = (
            db.query(Progress).filter(Progress.enrollment_id == enrollment.id, Progress.lesson_id == body.ref_id).first()
            if enrollment else None
        )
        if progress:
            server_record = {"state": progress.state, "lesson_id": body.ref_id,
                             "updated_at": progress.updated_at.isoformat()}

    outcome = core.apply_synced_change(body.kind, server_record, {"payload": body.payload, "client_base_ts": body.client_base_ts},
                                       datetime.now(timezone.utc).isoformat())
    event = SyncEvent(user_id=user.id, kind=body.kind, ref_id=body.ref_id, payload_json=json.dumps(body.payload),
                      client_ts=body.client_ts, status=outcome.status,
                      server_snapshot=json.dumps(outcome.server_snapshot))
    db.add(event)
    if outcome.status == "applied":
        if body.kind == "note":
            note = db.query(Note).filter(Note.user_id == user.id, Note.lesson_id == body.ref_id).first()
            if note:
                note.body = outcome.record.get("body", note.body)
            else:
                db.add(Note(user_id=user.id, lesson_id=body.ref_id, body=outcome.record.get("body", "")))
    db.commit()
    return {"status": outcome.status, "server": outcome.record, "server_snapshot": outcome.server_snapshot,
            "sync_event_id": event.id}


@router.get("/api/sync/status")
def sync_status(user: User = Depends(current_user), db: Session = Depends(get_db)):
    events = db.query(SyncEvent).filter(SyncEvent.user_id == user.id).order_by(SyncEvent.id.desc()).limit(50).all()
    applied = [e for e in events if e.status == "applied"]
    conflicts = [e for e in events if e.status == "conflict"]
    return {
        "pending_conflicts": len(conflicts),
        "last_sync": applied[0].created_at.isoformat() if applied else None,
        "events": [
            {"id": e.id, "kind": e.kind, "ref_id": e.ref_id, "status": e.status,
             "payload": json.loads(e.payload_json), "server_snapshot": json.loads(e.server_snapshot or "{}"),
             "created_at": e.created_at.isoformat()}
            for e in events
        ],
    }


class ResolveBody(BaseModel):
    resolution: str  # keep_client | keep_server | merge


@router.post("/api/sync/{event_id}/resolve")
def resolve_sync(event_id: int, body: ResolveBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    event = db.get(SyncEvent, event_id)
    if not event or event.user_id != user.id:
        raise HTTPException(status_code=404, detail="Sync event not found.")
    if event.status != "conflict":
        raise HTTPException(status_code=400, detail="Only conflicted events need resolution.")
    try:
        merged = core.resolve_conflict(body.resolution, json.loads(event.server_snapshot or "{}"),
                                       json.loads(event.payload_json))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if event.kind == "note":
        note = db.query(Note).filter(Note.user_id == user.id, Note.lesson_id == event.ref_id).first()
        if note:
            note.body = merged.get("body", note.body)
        else:
            db.add(Note(user_id=user.id, lesson_id=event.ref_id, body=merged.get("body", "")))
    event.status = "resolved"
    event.server_snapshot = json.dumps({"resolution": body.resolution, "merged": merged})
    db.commit()
    return {"status": "resolved", "merged": merged}


# ------------------------------------------------------------- course pack -


@router.get("/api/courses/{course_id}/pack")
def course_pack(course_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Low-bandwidth downloadable course pack (JSON) for offline study."""
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    lessons = [
        {"id": l.id, "title": l.title, "version": l.version, "content": json.loads(l.content_json),
         "requirements": json.loads(l.requirements_json),
         "quizzes": [{"id": q.id, "title": q.title, "questions": [
             {"id": qn.id, "kind": qn.kind, "prompt": qn.prompt, "choices": json.loads(qn.choices_json)}
             for qn in q.questions]} for q in l.quizzes]}
        for m in course.modules for l in m.lessons if l.archived == "no"
    ]
    return {"course": _course_dict(course, True), "lessons": lessons,
            "pack_version": course.version, "generated_at": datetime.now(timezone.utc).isoformat(),
            "note": "Pack contains text and quiz data only. Media links open when online."}
