"""Student entity."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Student:
    id: int
    student_id: str      # institutional identifier (unique)
    name: str
    email: str = ""
    programme: str = ""
