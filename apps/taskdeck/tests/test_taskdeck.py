"""Tests: CRUD, validation, filtering, persistence and malformed data."""
from __future__ import annotations

import json

import pytest

from app.models import TaskError
from app.store import TaskStore, load, save


@pytest.fixture()
def store():
    s = TaskStore()
    s.add("Write report", "high", "2026-11-01")
    s.add("Buy milk", "low")
    s.add("Draft essay", "medium", "2026-10-20")
    return s


def test_add_and_validate(store):
    assert len(store.all()) == 3
    with pytest.raises(TaskError):
        store.add("  ")
    with pytest.raises(TaskError):
        store.add("x" * 201)
    with pytest.raises(TaskError):
        store.add("ok", "urgent")


def test_filter_by_priority_and_status(store):
    assert [t.title for t in store.filter(priority="high")] == ["Write report"]
    store.complete(2)
    assert [t.id for t in store.filter(status="done")] == [2]
    assert [t.id for t in store.filter(status="todo")] == [3, 1]  # standard sort: earliest deadline first


def test_sort_deadline_then_priority(store):
    assert [t.id for t in store.all()] == [3, 1, 2]  # earliest deadline first; none -> last


def test_edit_complete_delete(store):
    store.edit(2, title="Buy oat milk", priority="high", deadline="2026-10-25")
    t = store.filter(priority="high")[0]
    assert t.title == "Buy oat milk"
    store.complete(2)
    assert store.all()[0].status in ("todo", "done")
    store.delete(2)
    assert len(store.all()) == 2
    with pytest.raises(TaskError):
        store.delete(999)


def test_persistence_roundtrip(tmp_path, store):
    save(store, tmp_path / "t.json")
    restored, problems = load(tmp_path / "t.json")
    assert not problems
    assert [t.id for t in restored.all()] == [t.id for t in store.all()]


def test_malformed_rows_reported_not_silently_dropped(tmp_path):
    data = {"tasks": [
        {"id": 1, "title": "fine", "priority": "low", "deadline": None, "status": "todo", "notes": ""},
        {"id": 2, "title": "", "priority": "low", "deadline": None, "status": "todo", "notes": ""},
        {"id": 3, "priority": "low"},
        {"id": 4, "title": "bad date", "priority": "low", "deadline": "10/20/2026", "status": "todo", "notes": ""},
    ]}
    (tmp_path / "t.json").write_text(json.dumps(data))
    store, problems = load(tmp_path / "t.json")
    assert [t.id for t in store.all()] == [1]
    assert len(problems) == 3


def test_corrupt_file_reported(tmp_path):
    (tmp_path / "t.json").write_text("{not json")
    store, problems = load(tmp_path / "t.json")
    assert store.all() == [] and problems
