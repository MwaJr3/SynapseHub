"""Incident workflow rules (pure, tested).

Status flow: new → triaged → contained → resolved → closed.
Resolved incidents may be reopened to triaged (documented exception).
Closing requires the incident to be resolved first. Resolving requires a
resolution note.
"""
from __future__ import annotations

from .models import Incident

ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "new": {"triaged"},
    "triaged": {"contained", "resolved"},
    "contained": {"resolved"},
    "resolved": {"closed", "triaged"},  # triaged = reopen
    "closed": {"triaged"},              # reopen from closed
}

WORKFLOW_NOTE = (
    "Incident status flow: new → triaged → contained → resolved → closed. "
    "Resolved/closed incidents can be reopened to triaged. A suspicious pattern "
    "is not proof of an attack — status reflects triage judgement, not certainty."
)


class WorkflowError(ValueError):
    """A workflow rule violation with a user-facing message."""


def can_transition(current: str, target: str) -> bool:
    return target in ALLOWED_TRANSITIONS.get(current, set())


def validate_transition(current: str, target: str, resolution_note: str = "") -> None:
    if target not in ("new", "triaged", "contained", "resolved", "closed"):
        raise WorkflowError(f"Unknown status '{target}'.")
    if current == target:
        raise WorkflowError(f"Incident is already '{current}'.")
    if not can_transition(current, target):
        raise WorkflowError(f"Illegal transition '{current}' → '{target}'. Allowed: {sorted(ALLOWED_TRANSITIONS.get(current, set()))}.")
    if target == "resolved" and not resolution_note.strip():
        raise WorkflowError("A resolution note is required before resolving an incident.")


def status_label(current: str) -> str:
    return {
        "new": "New",
        "triaged": "Triaged",
        "contained": "Contained",
        "resolved": "Resolved",
        "closed": "Closed",
    }.get(current, current)
