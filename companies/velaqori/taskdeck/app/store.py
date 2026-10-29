"""Task storage and operations: separation of logic, storage and presentation."""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from .models import PRIORITIES, STATUSES, Task, TaskError


class TaskStore:
    def __init__(self) -> None:
        self._tasks: dict[int, Task] = {}
        self._next_id = 1

    # -- CRUD -----------------------------------------------------------
    def add(self, title: str, priority: str = "medium", deadline: str | None = None, notes: str = "") -> Task:
        task = Task(self._next_id, title, priority,
                    date.fromisoformat(deadline) if deadline else None, "todo", notes)
        task.validate()
        self._tasks[task.id] = task
        self._next_id += 1
        return task

    def edit(self, task_id: int, *, title: str | None = None, priority: str | None = None,
             deadline: str | None = None, notes: str | None = None) -> Task:
        task = self._get(task_id)
        if title is not None:
            task.title = title
        if priority is not None:
            task.priority = priority
        if deadline is not None:
            try:
                task.deadline = date.fromisoformat(deadline) if deadline else None
            except ValueError as exc:
                raise TaskError(f"Deadline {deadline!r} must be ISO YYYY-MM-DD.") from exc
        if notes is not None:
            task.notes = notes
        task.validate()
        return task

    def delete(self, task_id: int) -> None:
        self._get(task_id)
        del self._tasks[task_id]

    def complete(self, task_id: int) -> Task:
        task = self._get(task_id)
        task.status = "done"
        return task

    def _get(self, task_id: int) -> Task:
        if task_id not in self._tasks:
            raise TaskError(f"No task with id {task_id}.")
        return self._tasks[task_id]

    # -- queries --------------------------------------------------------
    def filter(self, priority: str | None = None, status: str | None = None) -> list[Task]:
        if priority is not None and priority not in PRIORITIES:
            raise TaskError(f"Priority must be one of {PRIORITIES}.")
        if status is not None and status not in STATUSES:
            raise TaskError(f"Status must be one of {STATUSES}.")
        rows = [t for t in self._tasks.values()
                if (priority is None or t.priority == priority)
                and (status is None or t.status == status)]
        order = {"high": 0, "medium": 1, "low": 2}
        return sorted(rows, key=lambda t: (t.deadline or date.max, order[t.priority], t.id))

    def all(self) -> list[Task]:
        return self.filter()

    # -- persistence ----------------------------------------------------
    def export_data(self) -> dict:
        return {"tasks": [
            {"id": t.id, "title": t.title, "priority": t.priority,
             "deadline": t.deadline.isoformat() if t.deadline else None,
             "status": t.status, "notes": t.notes}
            for t in self._tasks.values()
        ]}

    def import_data(self, data: dict, problems: list[str] | None = None) -> None:
        """Load tasks; malformed rows are reported (never silently dropped)."""
        report = problems if problems is not None else []
        for row in data.get("tasks", []):
            try:
                task = Task(int(row["id"]), str(row["title"]), str(row.get("priority", "medium")),
                            date.fromisoformat(row["deadline"]) if row.get("deadline") else None,
                            str(row.get("status", "todo")), str(row.get("notes", "")))
                task.validate()
                if task.status not in STATUSES:
                    raise TaskError(f"status must be one of {STATUSES}")
                self._tasks[task.id] = task
                self._next_id = max(self._next_id, task.id + 1)
            except (KeyError, TypeError, ValueError, TaskError) as exc:
                report.append(f"skipped malformed task row {row!r}: {exc}")


def save(store: TaskStore, path: str | Path) -> None:
    Path(path).write_text(json.dumps(store.export_data(), indent=2))


def load(path: str | Path) -> tuple[TaskStore, list[str]]:
    store = TaskStore()
    problems: list[str] = []
    try:
        data = json.loads(Path(path).read_text())
    except (OSError, json.JSONDecodeError) as exc:
        problems.append(f"could not read {path}: {exc}")
        return store, problems
    store.import_data(data, problems)
    return store, problems
