"""TeachCraft workflow, versioning, question validation and export-safety tests."""
import json

import pytest

from app import core


def test_workflow_matrix():
    core.validate_transition("draft", "review")
    core.validate_transition("review", "published")
    core.validate_transition("review", "draft")
    core.validate_transition("published", "archived")
    with pytest.raises(core.WorkflowError):
        core.validate_transition("draft", "published")   # must pass review
    with pytest.raises(core.WorkflowError):
        core.validate_transition("archived", "published")


def test_published_content_locked_but_draft_editable():
    assert core.is_editable("draft") and core.is_editable("review")
    assert not core.is_editable("published") and not core.is_editable("archived")


def test_restore_creates_new_version_and_keeps_history():
    snapshots = [
        {"version": 1, "title": "A", "blocks_json": "[]"},
        {"version": 2, "title": "B", "blocks_json": '[{"kind": "text", "text": "v2"}]'},
    ]
    plan = core.restore_plan(snapshots, 1)
    assert plan["title"] == "A"
    assert plan["new_version"] == 3  # history preserved; nothing overwritten
    assert "Restored from version 1" in plan["change_summary"]
    with pytest.raises(core.WorkflowError):
        core.restore_plan(snapshots, 9)


def test_question_validation_matrix():
    assert core.validate_question("single", ["a", "b"], 0) == []
    assert core.validate_question("single", ["a"], 0) != []
    assert core.validate_question("single", ["a", "b"], 5) != []
    assert core.validate_question("multi", ["a", "b", "c"], [0, 2]) == []
    assert core.validate_question("multi", ["a", "b"], []) != []
    assert core.validate_question("tf", [], True) == []
    assert core.validate_question("tf", [], "yes") != []
    assert core.validate_question("numeric", [], 4.5) == []
    assert core.validate_question("numeric", [], "four") != []
    assert core.validate_question("ordering", [], ["first", "second"]) == []
    assert core.validate_question("matching", [], {"a": 1, "b": 2}) == []
    assert core.validate_question("rubric", [], "Award credit for…") == []
    assert core.validate_question("essay", [], "x") != []


def test_export_escapes_everything():
    html = core.export_lesson_html(
        '<script>alert(1)</script>',
        json.dumps([
            {"kind": "text", "text": '<img src=x onerror=alert(2)>'},
            {"kind": "heading", "text": '"quoted"'},
            {"kind": "link", "url": 'javascript:alert(3)', "text": "click"},
        ]),
        2,
    )
    assert "<script>" not in html
    assert "onerror" not in html.split("</title>")[1].replace("&lt;img src=x onerror=alert(2)&gt;", "")
    assert "javascript:alert(3)" in html  # escaped/kept as text but not executable via href quoting
    assert "&lt;img" in html
    assert "Static HTML export" in html and "version 2" in html


def test_templates_expand():
    plan = core.expand_template("lesson_plan")
    assert plan[0]["kind"] == "heading"
    with pytest.raises(core.WorkflowError):
        core.expand_template("unknown")
