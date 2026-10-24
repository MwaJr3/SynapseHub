"""Enrolment entity: the relationship between a student and a course."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Enrolment:
    id: int
    student_id: int
    course_id: int
    grade: float | None = None    # None = in progress
