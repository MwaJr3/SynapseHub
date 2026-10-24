import pytest

from app.services import TransitionError, RoleError, can, transition


def test_legal_path_walks_the_lifecycle():
    status = "new"
    for target in ("triaged", "contained", "resolved", "closed"):
        status = transition(status, target, "responder" if target != "closed" else "lead")
    assert status == "closed"


def test_illegal_transitions_refused():
    with pytest.raises(TransitionError):
        transition("new", "closed", "lead")
    with pytest.raises(TransitionError):
        transition("closed", "contained", "lead")


def test_role_rights():
    assert can("observer", "read") and not can("observer", "create")
    assert not can("responder", "close")
    with pytest.raises(RoleError):
        transition("resolved", "closed", "responder")
