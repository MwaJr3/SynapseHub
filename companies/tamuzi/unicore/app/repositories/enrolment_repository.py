"""Persistence for enrolments."""
from __future__ import annotations

import sqlite3

from app.exceptions import EnrolmentRuleError, NotFoundError
from app.models import Enrolment


class EnrolmentRepository:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self.conn = conn

    def add(self, student_id: int, course_id: int) -> Enrolment:
        if self.conn.execute(
                "SELECT 1 FROM enrolments WHERE student_id=? AND course_id=?",
                (student_id, course_id)).fetchone():
            raise EnrolmentRuleError("The student is already enrolled in this course.")
        cur = self.conn.execute(
            "INSERT INTO enrolments(student_id, course_id, grade) VALUES (?,?,NULL)",
            (student_id, course_id))
        self.conn.commit()
        return Enrolment(cur.lastrowid, student_id, course_id)

    def record_grade(self, student_id: int, course_id: int, grade: float) -> Enrolment:
        row = self.conn.execute(
            "SELECT * FROM enrolments WHERE student_id=? AND course_id=?",
            (student_id, course_id)).fetchone()
        if row is None:
            raise EnrolmentRuleError("Cannot record a grade for a student who is not enrolled in this course.")
        self.conn.execute("UPDATE enrolments SET grade=? WHERE id=?", (grade, row["id"]))
        self.conn.commit()
        return Enrolment(row["id"], student_id, course_id, grade)

    def for_student(self, student_id: int) -> list[dict]:
        rows = self.conn.execute(
            "SELECT e.grade, c.code, c.title, c.credit_hours FROM enrolments e "
            "JOIN courses c ON c.id = e.course_id WHERE e.student_id=? ORDER BY c.code",
            (student_id,)).fetchall()
        return [dict(r) for r in rows]
