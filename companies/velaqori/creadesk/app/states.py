"""Editorial state machine: draft -> in_review -> approved -> published -> archived."""
from __future__ import annotations


class WorkflowError(ValueError):
    pass


STATES = {"draft", "in_review", "approved", "published", "archived"}
TRANSITIONS = {
    "draft": {"in_review", "archived"},
    "in_review": {"draft", "approved"},          # reviewer can request changes (back to draft)
    "approved": {"published", "draft"},          # unapprove before publish
    "published": {"archived"},
    "archived": set(),                            # terminal
}

ROLE_RIGHTS = {
    "author": {"draft", "in_review"},            # authors submit; cannot approve/publish
    "reviewer": {"draft", "approved", "in_review"},
    "editor": {"draft", "in_review", "approved", "published", "archived"},
}


def request_transition(current: str, target: str, role: str) -> str:
    if current not in STATES or target not in STATES:
        raise WorkflowError(f"Unknown state (current={current!r}, target={target!r})")
    if target not in TRANSITIONS[current]:
        raise WorkflowError(f"Illegal transition {current} -> {target} "
                            f"(allowed: {sorted(TRANSITIONS[current]) or 'none'})")
    if role not in ROLE_RIGHTS:
        raise WorkflowError(f"Unknown role {role!r}")
    if target not in ROLE_RIGHTS[role] and target != "draft":
        raise WorkflowError(f"Role {role!r} cannot move content to {target!r}")
    return target
