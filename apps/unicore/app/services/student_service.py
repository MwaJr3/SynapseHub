"""Student-facing application services."""
from __future__ import annotations

import re

from app.exceptions import UnicoreError
from app.repositories.student_repository import StudentRepository


class StudentService:
    def __init__(self, students: StudentRepository) -> None:
        self.students = students

    def register(self, student_id: str, name: str, email: str = "", programme: str = ""):
        if not (student_id or "").strip():
            raise UnicoreError("Student ID must not be empty.")
        if not re.fullmatch(r"[A-Za-z0-9-]{3,20}", student_id.strip()):
            raise UnicoreError("Student ID must be 3-20 characters of letters, digits or dashes.")
        if not (name or "").strip():
            raise UnicoreError("Student name must not be empty.")
        if email and ("@" not in email or email.startswith("@") or email.endswith("@")):
            raise UnicoreError("Enter a valid email address or leave it blank.")
        return self.students.add(student_id.strip(), name.strip(), email.strip(), programme.strip())

    def search(self, query: str):
        return self.students.search(query.strip())
