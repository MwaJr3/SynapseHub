"""Incident workflow transition tests."""
import pytest

from app.workflow import WorkflowError, can_transition, validate_transition


def test_legal_path_new_to_closed():
    validate_transition("new", "triaged")
    validate_transition("triaged", "contained")
    validate_transition("contained", "resolved", "contained and cleaned")
    validate_transition("resolved", "closed")


def test_reopen_from_resolved_and_closed():
    validate_transition("resolved", "triaged")
    validate_transition("closed", "triaged")


def test_illegal_transitions_rejected():
    with pytest.raises(WorkflowError):
        validate_transition("new", "resolved")  # must pass through triaged
    with pytest.raises(WorkflowError):
        validate_transition("new", "closed")
    with pytest.raises(WorkflowError):
        validate_transition("closed", "closed")
    with pytest.raises(WorkflowError):
        validate_transition("closed", "resolved")


def test_resolve_requires_resolution_note():
    with pytest.raises(WorkflowError):
        validate_transition("triaged", "resolved", "   ")
    with pytest.raises(WorkflowError):
        validate_transition("triaged", "resolved")
    validate_transition("triaged", "resolved", "Mitigated by patching")


def test_api_enforces_workflow(admin, scenario):
    inc_id = scenario["incident"]["id"]
    bad = admin.post(f"/api/incidents/{inc_id}/transition", json={"status": "closed"})
    assert bad.status_code == 400 and "Illegal transition" in bad.json()["detail"]

    no_note = admin.post(f"/api/incidents/{inc_id}/transition", json={"status": "triaged"})
    assert no_note.status_code == 200  # new → triaged is legal
    no_note2 = admin.post(f"/api/incidents/{inc_id}/transition", json={"status": "resolved", "resolution_note": ""})
    assert no_note2.status_code == 400 and "resolution note" in no_note2.json()["detail"].lower()

    ok = admin.post(f"/api/incidents/{inc_id}/transition", json={"status": "resolved", "resolution_note": "patched"})
    assert ok.status_code == 200 and ok.json()["status"] == "resolved"

    detail = admin.get(f"/api/incidents/{inc_id}").json()
    assert detail["resolution_note"] == "patched"
    assert "closed" in detail["allowed_transitions"]


def test_can_transition_matrix():
    assert can_transition("new", "triaged")
    assert not can_transition("new", "contained")
    assert not can_transition("resolved", "new")
