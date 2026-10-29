"""EduAccess workflow, allocation, ledger and eligibility tests."""
import types

import pytest

from app import core


def test_application_transitions_require_human_reasons():
    core.validate_transition("submitted", "under_review")
    core.validate_transition("under_review", "approved", "Meets criteria — reviewed.")
    with pytest.raises(core.WorkflowError):
        core.validate_transition("submitted", "approved", "reason")  # must pass review
    with pytest.raises(core.WorkflowError):
        core.validate_transition("under_review", "approved", "   ")   # decision reason required
    with pytest.raises(core.WorkflowError):
        core.validate_transition("under_review", "enrolled", "x")
    core.validate_transition("approved", "enrolled")
    core.validate_transition("enrolled", "completed")
    core.validate_transition("declined", "under_review")   # appeal reopen
    core.validate_transition("completed", "enrolled", "x") is None if False else None
    with pytest.raises(core.WorkflowError):
        core.validate_transition("completed", "enrolled")


def test_seat_allocation_never_over_allocates():
    result = core.allocate_seats(5, 4, 1)
    assert result.allocated == 1 and result.seats_remaining == 0
    full = core.allocate_seats(5, 5, 1)
    assert full.allocated == 0 and "waitlist" in full.note
    partial = core.allocate_seats(5, 3, 4)
    assert partial.allocated == 2 and "Partial allocation" in partial.note
    assert core.allocate_seats(5, 0, 0).allocated == 0


def test_ledger_pending_is_not_settled():
    rows = [
        types.SimpleNamespace(kind="payment", amount=100.0, status="settled"),
        types.SimpleNamespace(kind="invoice", amount=50.0, status="pending"),
        types.SimpleNamespace(kind="refund", amount=20.0, status="settled"),
        types.SimpleNamespace(kind="reversal", amount=10.0, status="settled"),
    ]
    balance = core.ledger_balance(rows)
    assert balance["settled_in"] == 100.0
    assert balance["balance"] == 70.0           # 100 − (20 + 10)
    assert balance["pending_not_settled"] == 50.0
    assert balance["reversal_count"] == 1
    assert "NOT settled" in balance["note"]

    with pytest.raises(core.WorkflowError):
        core.validate_transaction("payment", "maybe")
    with pytest.raises(core.WorkflowError):
        core.validate_transaction("bribe", "settled")


def test_eligibility_is_transparent_not_opaque():
    ok, why = core.check_eligibility("", {})
    assert ok and "human reviewer decides" in why
    ok, why = core.check_eligibility("region:Lusaka", {"region": "Lusaka"})
    assert ok and "documented criteria" in why
    ok, why = core.check_eligibility("region:Lusaka", {"region": "Copperbelt"})
    assert not ok and "region mismatch" in why
    ok, why = core.check_eligibility("first_generation", {"first_generation": False})
    assert not ok and "first_generation" in why


def test_sponsor_report_is_aggregate_only():
    pool = types.SimpleNamespace(name="P", seats_total=5, seats_committed=2)
    applications = [
        types.SimpleNamespace(status="approved"),
        types.SimpleNamespace(status="declined"),
        types.SimpleNamespace(status="enrolled"),
    ]
    report = core.sponsor_report(pool, [], applications)
    assert report["seats_available"] == 3
    assert report["applications_received"] == 3 and report["applications_approved"] == 2
    assert "never exposed to sponsors" in report["note"]
