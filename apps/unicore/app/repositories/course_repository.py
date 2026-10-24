"""Persistence for lecturers and courses."""
from __future__ import annotations

import sqlite3

from app.exceptions import DuplicateIdentifierError, NotFoundError
from app.models import Course, Lecturer


class CourseRepository:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self.conn = conn

    def add_lecturer(self, staff_id: str, name: str, department: str = "") -> Lecturer:
        try:
            cur = self.conn.execute(
                "INSERT INTO lecturers(staff_id, name, department) VALUES (?,?,?)",
                (staff_id, name, department))
        except sqlite3.IntegrityError as exc:
            raise DuplicateIdentifierError(f"Staff ID {staff_id!r} already exists.") from exc
        self.conn.commit()
        return Lecturer(cur.lastrowid, staff_id, name, department)

    def add_course(self, code: str, title: str, credit_hours: int = 3, lecturer_id: int | None = None) -> Course:
        if not code.strip() or not title.strip():
            raise NotFoundError("Course code and title are required.")
        if credit_hours < 1:
            raise NotFoundError("Credit hours must be at least 1.")
        if lecturer_id is not None and not self.conn.execute(
                "SELECT 1 FROM lecturers WHERE id=?", (lecturer_id,)).fetchone():
            raise NotFoundError(f"No lecturer {lecturer_id}.")
        try:
            cur = self.conn.execute(
                "INSERT INTO courses(code, title, credit_hours, lecturer_id) VALUES (?,?,?,?)",
                (code.strip(), title.strip(), credit_hours, lecturer_id))
        except sqlite3.IntegrityError as exc:
            raise DuplicateIdentifierError(f"Course code {code!r} already exists.") from exc
        self.conn.commit()
        return Course(cur.lastrowid, code.strip(), title.strip(), credit_hours, lecturer_id)

    def get_course(self, id_or_code: int | str) -> Course:
        row = None
        if isinstance(id_or_code, int):
            row = self.conn.execute("SELECT * FROM courses WHERE id=?", (id_or_code,)).fetchone()
        if row is None:
            row = self.conn.execute("SELECT * FROM courses WHERE code=?", (str(id_or_code),)).fetchone()
        if row is None:
            raise NotFoundError(f"No course {id_or_code!r}.")
        return Course(row["id"], row["code"], row["title"], row["credit_hours"], row["lecturer_id"])
