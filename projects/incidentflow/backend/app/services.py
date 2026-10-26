"""Incident lifecycle state machine + role rights. Rules are enforced
server-side on every transition; illegal transitions are refused, not guessed."""
from __future__ import annotations

STATUSES = ("new", "triaged", "contained", "resolved", "closed", "reopened")

TRANSITIONS: dict[str, set[str]] = {
    "new": {"triaged"},
    "triaged": {"contained", "new"},
    "contained": {"resolved", "triaged"},
    "resolved": {"closed", "reopened"},
    "closed": {"reopened"},
    "reopened": {"triaged"},
}

# role -> allowed actions
ROLE_RIGHTS = {
    "observer": {"read"},
    "responder": {"read", "create", "update", "comment", "task", "evidence", "transition", "assign"},
    "lead": {"read", "create", "update", "comment", "task", "evidence", "transition", "assign", "close"},
}


class TransitionError(ValueError):
    pass


class RoleError(ValueError):
    pass


def can(role: str, action: str) -> bool:
    return action in ROLE_RIGHTS.get(role, set())


def require(role: str, action: str) -> None:
    if not can(role, action):
        raise RoleError(f"role {role!r} may not {action}")


def transition(current: str, target: str, role: str) -> str:
    # path legality first: an illegal transition is a 409 for every role
    if target not in TRANSITIONS.get(current, set()):
        raise TransitionError(f"illegal transition {current} -> {target}")
    require(role, "transition")
    if target == "closed":
        require(role, "close")
    return target
