"""Domain models for students and marks."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Student:
    student_id: str
    name: str


@dataclass
class Mark:
    student_id: str
    subject: str
    score: float


@dataclass
class Result:
    student: Student
    marks: dict[str, float] = field(default_factory=dict)

    @property
    def total(self) -> float:
        return round(sum(self.marks.values()), 2)

    @property
    def average(self) -> float | None:
        if not self.marks:
            return None
        return round(sum(self.marks.values()) / len(self.marks), 2)

    @property
    def complete(self) -> bool:
        return bool(self.marks)
