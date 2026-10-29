"""Course and enrolment application services with explicit enrolment rules."""
from __future__ import annotations

from app.exceptions import UnicoreError
from app.repositories.course_repository import CourseRepository
from app.repositories.enrolment_repository import EnrolmentRepository
from app.repositories.student_repository import StudentRepository


class CourseService:
    def __init__(self, courses: CourseRepository, students: StudentRepository,
                 enrolments: EnrolmentRepository) -> None:
        self.courses = courses
        self.students = students
        self.enrolments = enrolments

    def create_course(self, code: str, title: str, credit_hours: int = 3, lecturer_id: int | None = None):
        return self.courses.add_course(code, title, credit_hours, lecturer_id)

    def enrol(self, student_ref: int | str, course_ref: int | str):
        student = self.students.get(student_ref)          # must exist
        course = self.courses.get_course(course_ref)      # must exist
        return self.enrolments.add(student.id, course.id)
