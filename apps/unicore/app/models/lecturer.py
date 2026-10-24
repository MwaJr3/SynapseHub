"""Lecturer entity."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Lecturer:
    id: int
    staff_id: str
    name: str
    department: str = ""
