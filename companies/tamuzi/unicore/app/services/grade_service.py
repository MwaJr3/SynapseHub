"""Grade recording and transcript generation."""
from __future__ import annotations

from app.exceptions import InvalidGradeError
from app.repositories.course_repository import CourseRepository
from app.repositories.enrolment_repository import EnrolmentRepository
from app.repositories.student_repository import StudentRepository


class GradeService:
    def __init__(self, students: StudentRepository, courses: CourseRepository,
                 enrolments: EnrolmentRepository) -> None:
        self.students = students
        self.courses = courses
        self.enrolments = enrolments

    def record_grade(self, student_ref: int | str, course_ref: int | str, grade: float):
        try:
            value = float(grade)
        except (TypeError, ValueError) as exc:
            raise InvalidGradeError(f"Grade {grade!r} is not a number.") from exc
        if not 0 <= value <= 100:
            raise InvalidGradeError("Grade must be between 0 and 100.")
        student = self.students.get(student_ref)
        course = self.courses.get_course(course_ref)
        return self.enrolments.record_grade(student.id, course.id, round(value, 2))

    def transcript(self, student_ref: int | str) -> dict:
        """Academic record: per-course grades plus an UNWEIGHTED mean of the
        recorded grades (documented assumption — credit weighting is a roadmap
        item and is never silently approximated)."""
        student = self.students.get(student_ref)
        rows = self.enrolments.for_student(student.id)
        graded = [r["grade"] for r in rows if r["grade"] is not None]
        return {
            "student": {"student_id": student.student_id, "name": student.name,
                        "programme": student.programme},
            "courses": rows,
            "recorded": len(graded),
            "in_progress": len(rows) - len(graded),
            "mean_grade_unweighted": round(sum(graded) / len(graded), 2) if graded else None,
            "note": "Mean is an unweighted average of recorded grades; credit-hour weighting is not approximated.",
        }
