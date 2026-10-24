"""Course entity."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Course:
    id: int
    code: str            # unique course code
    title: str
    credit_hours: int
    lecturer_id: int | None = None
