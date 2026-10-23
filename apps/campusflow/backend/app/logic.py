"""Core academic logic: enrollment rules, grade/attendance validation, transcripts.

Pure functions where possible so the automated tests exercise the real rules.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from . import config
from .models import AttendanceRecord, Enrollment, Grade, GuardianLink, Section, Student, User

LETTER_BANDS: list[tuple[float, str]] = [
    (90.0, "A"),
    (80.0, "B"),
    (70.0, "C"),
    (60.0, "D"),
    (0.0, "F"),
]

GRADE_POINTS = {"A": 4.0, "B": 3.0, "C": 2.0, "D": 1.0, "F": 0.0}


class RuleError(ValueError):
    """A business-rule violation with a user-facing message."""


def letter_for_score(score: float) -> str:
    for threshold, letter in LETTER_BANDS:
        if score >= threshold:
            return letter
    return "F"


def validate_score(score: float) -> float:
    if not isinstance(score, (int, float)) or isinstance(score, bool):
        raise RuleError("Score must be a number.")
    if score < 0 or score > 100:
        raise RuleError("Score must be between 0 and 100.")
    return float(score)


def validate_attendance_status(status: str) -> str:
    if status not in config.ATTENDANCE_STATUSES:
        raise RuleError(f"Attendance status must be one of: {', '.join(config.ATTENDANCE_STATUSES)}.")
    return status


def active_enrollment_count(db: Session, section_id: int) -> int:
    return (
        db.query(Enrollment)
        .filter(Enrollment.section_id == section_id, Enrollment.status == "enrolled")
        .count()
    )


def can_enroll(db: Session, student: Student, section: Section) -> None:
    if student.status != "active":
        raise RuleError("Only active students can be enrolled.")
    existing = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == student.id, Enrollment.section_id == section.id)
        .first()
    )
    if existing and existing.status == "enrolled":
        raise RuleError("Student is already enrolled in this section.")
    if active_enrollment_count(db, section.id) >= section.capacity:
        raise RuleError("Section is at capacity.")


def enrollment_for(db: Session, enrollment_id: int) -> Enrollment:
    enrollment = db.get(Enrollment, enrollment_id)
    if not enrollment:
        raise RuleError("Enrollment not found.")
    return enrollment


def record_grade(db: Session, enrollment: Enrollment, assessment: str, score: float, status: str) -> Grade:
    validate_score(score)
    if status not in config.ALLOWED_GRADE_STATUSES:
        raise RuleError("Grade status must be 'draft' or 'final'.")
    if not assessment.strip():
        raise RuleError("Assessment name is required.")
    grade = (
        db.query(Grade)
        .filter(Grade.enrollment_id == enrollment.id, Grade.assessment == assessment.strip())
        .first()
    )
    if grade:
        grade.score = float(score)
        grade.status = status
    else:
        grade = Grade(enrollment_id=enrollment.id, assessment=assessment.strip(), score=float(score), status=status)
        db.add(grade)
    db.commit()
    db.refresh(grade)
    return grade


def record_attendance(
    db: Session, enrollment: Enrollment, date: str, status: str, note: str = ""
) -> AttendanceRecord:
    validate_attendance_status(status)
    if not (len(date) == 10 and date[4] == "-" and date[7] == "-"):
        raise RuleError("Date must be an ISO date (YYYY-MM-DD).")
    record = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.enrollment_id == enrollment.id, AttendanceRecord.date == date)
        .first()
    )
    if record:
        record.status = status
        record.note = note
    else:
        record = AttendanceRecord(enrollment_id=enrollment.id, date=date, status=status, note=note)
        db.add(record)
    db.commit()
    db.refresh(record)
    return record


@dataclass
class TranscriptLine:
    course_code: str
    title: str
    term: str
    credit_hours: int
    average: float | None
    letter: str | None
    grade_points: float | None
    final_scores: list[float] = field(default_factory=list)


@dataclass
class Transcript:
    student_uid: str
    student_name: str
    enrollment_no: str
    lines: list[TranscriptLine]
    gpa: float | None
    total_credits: int
    computed_at: str


def build_transcript(db: Session, student: Student) -> Transcript:
    """Compute a transcript from FINAL grades only (draft grades excluded)."""
    lines: list[TranscriptLine] = []
    total_points = 0.0
    total_credits = 0
    enrollments = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == student.id, Enrollment.status == "enrolled")
        .all()
    )
    for enrollment in enrollments:
        finals = [g for g in enrollment.grades if g.status == "final"]
        if not finals:
            continue
        average = round(sum(g.score for g in finals) / len(finals), 2)
        letter = letter_for_score(average)
        points = GRADE_POINTS[letter]
        lines.append(
            TranscriptLine(
                course_code=enrollment.section.course.code,
                title=enrollment.section.course.title,
                term=enrollment.section.term,
                credit_hours=enrollment.section.course.credit_hours,
                average=average,
                letter=letter,
                grade_points=points,
                final_scores=[g.score for g in finals],
            )
        )
        total_points += points * enrollment.section.course.credit_hours
        total_credits += enrollment.section.course.credit_hours
    gpa = round(total_points / total_credits, 2) if total_credits else None
    from datetime import datetime, timezone

    return Transcript(
        student_uid=student.uid,
        student_name=f"{student.first_name} {student.last_name}",
        enrollment_no=student.enrollment_no,
        lines=lines,
        gpa=gpa,
        total_credits=total_credits,
        computed_at=datetime.now(timezone.utc).isoformat(),
    )


def can_view_student(db: Session, user: User, student: Student) -> bool:
    if user.role in ("admin", "teacher"):
        return True
    if user.role == "student":
        return student.email == user.email and student.email != ""
    if user.role == "parent":
        link = (
            db.query(GuardianLink)
            .filter(GuardianLink.student_id == student.id, GuardianLink.user_id == user.id)
            .first()
        )
        return link is not None
    return False


def can_write_grades_for(db: Session, user: User, enrollment: Enrollment) -> bool:
    if user.role == "admin":
        return True
    return user.role == "teacher" and enrollment.section.teacher_id == user.id
