"""Persistence for students."""
from __future__ import annotations

import sqlite3

from app.exceptions import DuplicateIdentifierError, NotFoundError
from app.models import Student


class StudentRepository:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self.conn = conn

    def add(self, student_id: str, name: str, email: str = "", programme: str = "") -> Student:
        try:
            cur = self.conn.execute(
                "INSERT INTO students(student_id, name, email, programme) VALUES (?,?,?,?)",
                (student_id, name, email, programme))
        except sqlite3.IntegrityError as exc:
            raise DuplicateIdentifierError(f"Student ID {student_id!r} already exists.") from exc
        self.conn.commit()
        return Student(cur.lastrowid, student_id, name, email, programme)

    def get(self, id_or_sid: int | str) -> Student:
        row = None
        if isinstance(id_or_sid, int):
            row = self.conn.execute("SELECT * FROM students WHERE id=?", (id_or_sid,)).fetchone()
        if row is None:
            row = self.conn.execute("SELECT * FROM students WHERE student_id=?", (str(id_or_sid),)).fetchone()
        if row is None:
            raise NotFoundError(f"No student {id_or_sid!r}.")
        return Student(row["id"], row["student_id"], row["name"], row["email"], row["programme"])

    def search(self, query: str) -> list[Student]:
        like = f"%{query}%"
        rows = self.conn.execute(
            "SELECT * FROM students WHERE name LIKE ? COLLATE NOCASE OR student_id LIKE ? "
            "COLLATE NOCASE OR programme LIKE ? COLLATE NOCASE ORDER BY name",
            (like, like, like)).fetchall()
        return [Student(r["id"], r["student_id"], r["name"], r["email"], r["programme"]) for r in rows]
