"""CampusFlow HTTP routes: auth, students, courses/sections, enrollment, grades, attendance, transcripts, audit."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from . import config, logic, security
from .database import get_db
from .models import (
    AuditEvent,
    AttendanceRecord,
    Course,
    DemoFlag,
    Enrollment,
    Grade,
    GuardianLink,
    Section,
    Student,
    User,
)

router = APIRouter()


def _db(request: Request) -> Session:
    return next(get_db())


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(config.SESSION_COOKIE)
    return security.require_user(db, token)


def audit(db: Session, actor: User | None, action: str, target: str, detail: str = "") -> None:
    db.add(AuditEvent(actor_id=actor.id if actor else None, action=action, target=target, detail=detail))
    db.commit()


# ---------------------------------------------------------------- auth ----


class RegisterBody(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)
    display_name: str = ""
    role: str = "student"

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
    if body.role not in ("admin", "teacher", "student", "parent"):
        raise HTTPException(status_code=400, detail="Role must be admin, teacher, student or parent.")
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(
        email=body.email.lower(),
        display_name=body.display_name or body.email.split("@")[0],
        password_hash=security.hash_password(body.password),
        role=body.role,
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


@router.get("/api/overview")
def overview(user: User = Depends(current_user), db: Session = Depends(get_db)):
    is_demo = db.query(DemoFlag).filter(DemoFlag.key == "demo_data").first()
    return {
        "role": user.role,
        "students": db.query(Student).count(),
        "courses": db.query(Course).count(),
        "sections": db.query(Section).count(),
        "enrollments": db.query(Enrollment).filter(Enrollment.status == "enrolled").count(),
        "grades": db.query(Grade).count(),
        "attendance": db.query(AttendanceRecord).count(),
        "demo_data": bool(is_demo),
    }


# ----------------------------------------------------------- students -----


class StudentBody(BaseModel):
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    enrollment_no: str = Field(min_length=1)
    email: str = ""
    date_of_birth: str = ""
    status: str = "active"


def _student_dict(db: Session, student: Student) -> dict:
    return {
        "id": student.id,
        "uid": student.uid,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "enrollment_no": student.enrollment_no,
        "email": student.email,
        "date_of_birth": student.date_of_birth,
        "status": student.status,
        "guardian_user_ids": [g.user_id for g in student.guardians],
        "enrolled_sections": [e.section_id for e in student.enrollments if e.status == "enrolled"],
    }


@router.get("/api/students")
def list_students(user: User = Depends(current_user), db: Session = Depends(get_db)):
    students = db.query(Student).all()
    visible = [s for s in students if logic.can_view_student(db, user, s)]
    return [_student_dict(db, s) for s in visible]


@router.post("/api/students")
def create_student(body: StudentBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    security.require_role(user, "admin")
    if body.status not in ("active", "graduated", "transferred"):
        raise HTTPException(status_code=400, detail="Status must be active, graduated or transferred.")
    if db.query(Student).filter(Student.enrollment_no == body.enrollment_no).first():
        raise HTTPException(status_code=409, detail="Enrollment number already in use.")
    import uuid

    student = Student(
        uid=uuid.uuid4().hex,
        first_name=body.first_name,
        last_name=body.last_name,
        enrollment_no=body.enrollment_no,
        email=body.email.lower(),
        date_of_birth=body.date_of_birth,
        status=body.status,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    audit(db, user, "student.create", f"student:{student.uid}", f"{student.enrollment_no}")
    return _student_dict(db, student)


@router.patch("/api/students/{student_id}")
def update_student(
    student_id: int, body: StudentBody, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    security.require_role(user, "admin")
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    if body.status not in ("active", "graduated", "transferred"):
        raise HTTPException(status_code=400, detail="Status must be active, graduated or transferred.")
    student.first_name = body.first_name
    student.last_name = body.last_name
    student.email = body.email.lower()
    student.date_of_birth = body.date_of_birth
    student.status = body.status
    db.commit()
    audit(db, user, "student.update", f"student:{student.uid}", student.enrollment_no)
    return _student_dict(db, student)


@router.delete("/api/students/{student_id}")
def delete_student(student_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    security.require_role(user, "admin")
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    audit(db, user, "student.delete", f"student:{student.uid}", student.enrollment_no)
    db.delete(student)
    db.commit()
    return {"ok": True}


# ------------------------------------------------------- courses/sections --


class CourseBody(BaseModel):
    code: str = Field(min_length=1)
    title: str = Field(min_length=1)
    credit_hours: int = Field(default=3, ge=1, le=12)
    description: str = ""


class SectionBody(BaseModel):
    course_id: int
    teacher_id: int
    term: str = Field(min_length=1)
    capacity: int = Field(default=30, ge=1, le=500)


@router.get("/api/courses")
def list_courses(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [
        {
            "id": c.id,
            "code": c.code,
            "title": c.title,
            "credit_hours": c.credit_hours,
            "description": c.description,
        }
        for c in db.query(Course).all()
    ]


@router.post("/api/courses")
def create_course(body: CourseBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    security.require_role(user, "admin")
    if db.query(Course).filter(Course.code == body.code).first():
        raise HTTPException(status_code=409, detail="Course code already exists.")
    course = Course(code=body.code, title=body.title, credit_hours=body.credit_hours, description=body.description)
    db.add(course)
    db.commit()
    db.refresh(course)
    audit(db, user, "course.create", f"course:{course.code}")
    return {"id": course.id, "code": course.code, "title": course.title, "credit_hours": course.credit_hours, "description": course.description}


@router.get("/api/sections")
def list_sections(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = []
    for s in db.query(Section).all():
        rows.append(
            {
                "id": s.id,
                "course_id": s.course_id,
                "course_code": s.course.code,
                "course_title": s.course.title,
                "teacher_id": s.teacher_id,
                "teacher_name": s.teacher.display_name,
                "term": s.term,
                "capacity": s.capacity,
                "enrolled": logic.active_enrollment_count(db, s.id),
            }
        )
    return rows


@router.post("/api/sections")
def create_section(body: SectionBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    security.require_role(user, "admin")
    course = db.get(Course, body.course_id)
    teacher = db.get(User, body.teacher_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    if not teacher or teacher.role != "teacher":
        raise HTTPException(status_code=400, detail="Teacher must be a user with the teacher role.")
    section = Section(course_id=course.id, teacher_id=teacher.id, term=body.term, capacity=body.capacity)
    db.add(section)
    db.commit()
    db.refresh(section)
    audit(db, user, "section.create", f"section:{section.id}", f"{course.code} {body.term}")
    return {"id": section.id}


# ----------------------------------------------------------- enrollment ---


class EnrollBody(BaseModel):
    student_id: int
    section_id: int


@router.post("/api/enrollments")
def enroll(body: EnrollBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    security.require_role(user, "admin")
    student = db.get(Student, body.student_id)
    section = db.get(Section, body.section_id)
    if not student or not section:
        raise HTTPException(status_code=404, detail="Student or section not found.")
    try:
        logic.can_enroll(db, student, section)
    except logic.RuleError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    dropped = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == student.id, Enrollment.section_id == section.id, Enrollment.status == "dropped")
        .first()
    )
    if dropped:
        dropped.status = "enrolled"
        db.commit()
        audit(db, user, "enrollment.reactivate", f"enrollment:{dropped.id}")
        return {"id": dropped.id, "status": "enrolled"}
    enrollment = Enrollment(student_id=student.id, section_id=section.id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    audit(db, user, "enrollment.create", f"enrollment:{enrollment.id}", f"student:{student.uid} section:{section.id}")
    return {"id": enrollment.id, "status": "enrolled"}


@router.post("/api/enrollments/{enrollment_id}/drop")
def drop(enrollment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    security.require_role(user, "admin")
    try:
        enrollment = logic.enrollment_for(db, enrollment_id)
    except logic.RuleError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    enrollment.status = "dropped"
    db.commit()
    audit(db, user, "enrollment.drop", f"enrollment:{enrollment.id}")
    return {"id": enrollment.id, "status": "dropped"}


@router.get("/api/enrollments")
def list_enrollments(
    section_id: int | None = None, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    query = db.query(Enrollment)
    if section_id is not None:
        query = query.filter(Enrollment.section_id == section_id)
    rows = []
    for e in query.all():
        if not logic.can_view_student(db, user, e.student):
            continue
        rows.append(
            {
                "id": e.id,
                "student_id": e.student_id,
                "student_name": f"{e.student.first_name} {e.student.last_name}",
                "student_uid": e.student.uid,
                "section_id": e.section_id,
                "section_label": f"{e.section.course.code} · {e.section.term}",
                "teacher_id": e.section.teacher_id,
                "status": e.status,
            }
        )
    return rows


# --------------------------------------------------------------- grades ---


class GradeBody(BaseModel):
    assessment: str = Field(min_length=1)
    score: float
    status: str = "draft"


@router.post("/api/enrollments/{enrollment_id}/grades")
def add_grade(
    enrollment_id: int, body: GradeBody, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    try:
        enrollment = logic.enrollment_for(db, enrollment_id)
    except logic.RuleError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    if not logic.can_write_grades_for(db, user, enrollment):
        raise HTTPException(status_code=403, detail="Only the section's teacher or an admin can record grades.")
    if enrollment.status != "enrolled":
        raise HTTPException(status_code=400, detail="Cannot grade a dropped enrollment.")
    try:
        grade = logic.record_grade(db, enrollment, body.assessment, body.score, body.status)
    except logic.RuleError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    audit(db, user, "grade.record", f"enrollment:{enrollment.id}", f"{body.assessment}={body.score}")
    return {"id": grade.id, "assessment": grade.assessment, "score": grade.score, "status": grade.status}


@router.get("/api/enrollments/{enrollment_id}/grades")
def list_grades(enrollment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        enrollment = logic.enrollment_for(db, enrollment_id)
    except logic.RuleError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    if not logic.can_view_student(db, user, enrollment.student):
        raise HTTPException(status_code=404, detail="Enrollment not found.")
    return [
        {"id": g.id, "assessment": g.assessment, "score": g.score, "status": g.status}
        for g in enrollment.grades
    ]


# ----------------------------------------------------------- attendance ---


class AttendanceBody(BaseModel):
    date: str
    status: str
    note: str = ""


@router.post("/api/enrollments/{enrollment_id}/attendance")
def record_attendance(
    enrollment_id: int, body: AttendanceBody, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    try:
        enrollment = logic.enrollment_for(db, enrollment_id)
    except logic.RuleError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    if not logic.can_write_grades_for(db, user, enrollment):
        raise HTTPException(status_code=403, detail="Only the section's teacher or an admin can record attendance.")
    try:
        record = logic.record_attendance(db, enrollment, body.date, body.status, body.note)
    except logic.RuleError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    audit(db, user, "attendance.record", f"enrollment:{enrollment.id}", f"{body.date}={body.status}")
    return {"id": record.id, "date": record.date, "status": record.status, "note": record.note}


@router.get("/api/enrollments/{enrollment_id}/attendance")
def list_attendance(enrollment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        enrollment = logic.enrollment_for(db, enrollment_id)
    except logic.RuleError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    if not logic.can_view_student(db, user, enrollment.student):
        raise HTTPException(status_code=404, detail="Enrollment not found.")
    return [
        {"id": r.id, "date": r.date, "status": r.status, "note": r.note}
        for r in db.query(AttendanceRecord).filter(AttendanceRecord.enrollment_id == enrollment.id).all()
    ]


# ---------------------------------------------------------- transcripts ---


@router.get("/api/students/{student_id}/transcript")
def transcript(student_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    student = db.get(Student, student_id)
    if not student or not logic.can_view_student(db, user, student):
        raise HTTPException(status_code=404, detail="Student not found.")
    result = logic.build_transcript(db, student)
    return {
        "student_uid": result.student_uid,
        "student_name": result.student_name,
        "enrollment_no": result.enrollment_no,
        "gpa": result.gpa,
        "total_credits": result.total_credits,
        "computed_at": result.computed_at,
        "lines": [line.__dict__ for line in result.lines],
    }


# --------------------------------------------------------------- audit ----


@router.get("/api/audit")
def audit_log(user: User = Depends(current_user), db: Session = Depends(get_db)):
    security.require_role(user, "admin")
    events = db.query(AuditEvent).order_by(AuditEvent.id.desc()).limit(100).all()
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
