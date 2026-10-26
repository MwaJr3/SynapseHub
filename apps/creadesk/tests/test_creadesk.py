"""Tests: workflow transitions, role rights, validation gates, versions, schedule."""
from __future__ import annotations

import pytest

from app.states import WorkflowError, request_transition
from app.store import Store
from app.validate import check_content


BODY = "This is a sufficiently long article body with useful editorial content for review."


def test_workflow_transition_matrix():
    assert request_transition("draft", "in_review", "author") == "in_review"
    assert request_transition("approved", "published", "editor") == "published"
    with pytest.raises(WorkflowError):
        request_transition("draft", "published", "editor")     # illegal jump
    with pytest.raises(WorkflowError):
        request_transition("published", "draft", "editor")     # published is forward-only
    with pytest.raises(WorkflowError):
        request_transition("draft", "approved", "author")      # authors cannot approve
    with pytest.raises(WorkflowError):
        request_transition("archived", "draft", "editor")      # archived is terminal


def test_validation_checks():
    assert any("title is empty" in p for p in check_content("", BODY))
    assert any("at least 40" in p for p in check_content("t", "short"))
    assert any("placeholder" in p for p in check_content("t", BODY + " lorem ipsum"))
    problems = check_content("t", BODY + " see https://evil.example.test/x")
    assert any("allowlist" in p for p in problems)
    assert not check_content("t", BODY + " see https://github.com/o/r")
    assert any("scheduled_at" in p for p in check_content("t", BODY, "tomorrow-ish"))


def test_publish_gate_blocks_invalid(tmp_path):
    store = Store(str(tmp_path / "c.db"))
    post_id = store.create("Title", BODY, "ann")
    store.move(post_id, "in_review", "author", "ann")
    store.move(post_id, "approved", "reviewer", "rev")
    store.conn.execute("UPDATE posts SET body='too short' WHERE id=?", (post_id,))
    store.conn.commit()
    with pytest.raises(ValueError, match="cannot publish"):
        store.move(post_id, "published", "editor", "ed")   # gate fires at publish


def test_full_flow_with_versions(tmp_path):
    store = Store(str(tmp_path / "c.db"))
    post_id = store.create("Title", BODY, "ann")                       # snapshot 1
    assert store.update(post_id, "Title v2", BODY + " More content here.") == []   # snapshot 2
    assert store.update(post_id, "Title v3", BODY + " Even more.") == []           # snapshot 3
    store.move(post_id, "in_review", "author", "ann")
    store.move(post_id, "approved", "reviewer", "rev")
    store.move(post_id, "published", "editor", "ed")
    diffs = store.diff(post_id)          # diffs between consecutive snapshots
    assert len(diffs) == 2 and diffs[-1]["title_changed"] is True
    history = [r["to_state"] for r in store.conn.execute(
        "SELECT to_state FROM transitions WHERE post_id=? ORDER BY id", (post_id,))]
    assert history == ["in_review", "approved", "published"]


def test_schedule_validation(tmp_path):
    store = Store(str(tmp_path / "c.db"))
    post_id = store.create("Title", BODY, "ann")
    assert store.schedule(post_id, "2026-12-01T09:00") == []
    assert store.calendar()[0]["scheduled_at"] == "2026-12-01T09:00"
    assert store.schedule(post_id, "whenever") != []
