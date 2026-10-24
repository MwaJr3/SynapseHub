"""Task domain model with explicit validation."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

PRIORITIES = ("low", "medium", "high")
STATUSES = ("todo", "done")


class TaskError(ValueError):
    pass


@dataclass
class Task:
    id: int
    title: str
    priority: str = "medium"
    deadline: date | None = None
    status: str = "todo"
    notes: str = ""

    def validate(self) -> None:
        if not self.title.strip():
            raise TaskError("Task title must not be empty.")
        if len(self.title) > 200:
            raise TaskError("Task title must be at most 200 characters.")
        if self.priority not in PRIORITIES:
            raise TaskError(f"Priority must be one of {PRIORITIES}.")
        if self.status not in STATUSES:
            raise TaskError(f"Status must be one of {STATUSES}.")

    @property
    def overdue(self) -> bool:
        return self.status == "todo" and self.deadline is not None and self.deadline < date.today()
