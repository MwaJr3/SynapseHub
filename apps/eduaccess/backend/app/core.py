"""EduAccess domain logic: application workflow, seat allocation, ledger math.

Fairness rules encoded here: consequential decisions require recorded human
review; allocation never silently ranks people with opaque scoring; sponsors
see only their own aggregates; pending payments are never treated as settled.
"""
from __future__ import annotations

from dataclasses import dataclass

# ------------------------------------------------------ application workflow ---

TRANSITIONS = {
    "submitted": {"needs_info", "under_review", "withdrawn"},
    "needs_info": {"under_review", "withdrawn"},
    "under_review": {"approved", "waitlisted", "declined", "needs_info", "withdrawn"},
    "approved": {"enrolled", "withdrawn"},
    "waitlisted": {"approved", "declined", "withdrawn"},
    "declined": {"under_review"},          # reopened on appeal
    "enrolled": {"completed", "withdrawn"},
    "completed": set(),
    "withdrawn": {"under_review"},          # re-entry
}

DECISION_STATUSES = {"approved", "waitlisted", "declined"}


class WorkflowError(ValueError):
    pass


def validate_transition(current: str, target: str, decision_reason: str = "") -> None:
    if target not in TRANSITIONS.get(current, set()):
        raise WorkflowError(f"Illegal application transition '{current}' → '{target}'. Allowed: {sorted(TRANSITIONS.get(current, set()))}.")
    if target in DECISION_STATUSES and not decision_reason.strip():
        raise WorkflowError("A decision reason is required for approved/waitlisted/declined outcomes.")


# -------------------------------------------------------- seat allocation ---


@dataclass
class AllocationResult:
    allocated: int
    seats_remaining: int
    note: str


def allocate_seats(seats_total: int, seats_committed: int, requested: int = 1) -> AllocationResult:
    """Human-reviewable allocation with a hard cap — never over-allocate."""
    available = max(0, seats_total - seats_committed)
    if requested <= 0:
        return AllocationResult(0, available, "Nothing requested.")
    if available <= 0:
        return AllocationResult(0, 0, "No seats available — place the applicant on the waitlist.")
    granted = min(requested, available)
    remaining = available - granted
    note = "Allocated within pool capacity."
    if granted < requested:
        note = f"Partial allocation: {granted} of {requested} seats (pool capacity)."
    return AllocationResult(granted, remaining, note)


# ------------------------------------------------------------- ledger math ---


def ledger_balance(transactions) -> dict:
    """Committed cash = settled payments + settled invoices MINUS settled refunds
    and reversals. Pending rows are reported separately and never counted as
    settled funds."""
    settled_in = sum(t.amount for t in transactions if t.status == "settled" and t.kind in ("payment", "invoice"))
    settled_out = sum(t.amount for t in transactions if t.status == "settled" and t.kind in ("refund", "reversal"))
    pending_in = sum(t.amount for t in transactions if t.status == "pending" and t.kind in ("payment", "invoice"))
    reversed_rows = [t for t in transactions if t.kind == "reversal" or t.status == "reversed"]
    return {
        "settled_in": round(settled_in, 2),
        "settled_out": round(settled_out, 2),
        "balance": round(settled_in - settled_out, 2),
        "pending_not_settled": round(pending_in, 2),
        "reversal_count": len(reversed_rows),
        "note": "Pending payments are NOT settled funds. Refunds and reversals are distinct entries.",
    }


def validate_transaction(kind: str, status: str) -> None:
    if kind not in ("payment", "invoice", "refund", "reversal"):
        raise WorkflowError(f"Unknown transaction kind '{kind}'.")
    if status not in ("pending", "settled", "reversed"):
        raise WorkflowError(f"Unknown transaction status '{status}'.")


# ------------------------------------------------------------ eligibility ---


def check_eligibility(pool_criteria: str, learner_context: dict) -> tuple[bool, str]:
    """Documented, transparent criteria (keyword rules). No opaque scoring,
    no sensitive attributes. Returns (eligible, explanation)."""
    criteria = [c.strip().lower() for c in pool_criteria.split(";") if c.strip()]
    if not criteria:
        return True, "Pool states no specific criteria — human reviewer decides."
    for criterion in criteria:
        if criterion.startswith("region:"):
            want = criterion.split(":", 1)[1].strip()
            have = str(learner_context.get("region", "")).lower()
            if want != have:
                return False, f"Does not meet documented criterion '{criterion}' (region mismatch)."
        elif criterion.startswith("first_generation"):
            if not learner_context.get("first_generation"):
                return False, f"Does not meet documented criterion '{criterion}'."
    return True, "Meets the pool's documented criteria (reviewer still decides)."


# ------------------------------------------------------------ sponsor reports ---


def sponsor_report(pool, allocations, applications) -> dict:
    """Aggregate-only sponsor reporting: never exposes applicant details."""
    total_apps = len(applications)
    approved = sum(1 for a in applications if a.status in ("approved", "enrolled", "completed"))
    return {
        "pool": pool.name,
        "seats_total": pool.seats_total,
        "seats_committed": pool.seats_committed,
        "seats_available": max(0, pool.seats_total - pool.seats_committed),
        "applications_received": total_apps,
        "applications_approved": approved,
        "note": "Aggregate figures only. Individual applicants and their statements are never exposed to sponsors.",
    }
