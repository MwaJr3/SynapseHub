"""ReachLearn domain logic: channel rendering, learner state, consent, scheduling.

Honesty rules encoded here: the local simulator is labelled everywhere and is
never represented as real carrier delivery; non-essential messages require
recorded consent; STOP always wins.
"""
from __future__ import annotations

import json
from dataclasses import dataclass

# ---------------------------------------------------------- channel rendering ---

GSM_SINGLE, GSM_MULTI = 160, 153
UNICODE_SINGLE, UNICODE_MULTI = 70, 67


def is_gsm7(text: str) -> bool:
    return all(ord(c) < 128 for c in text)


def render_sms(text: str) -> dict:
    """Segmentation with correct single/multipart sizes (GSM-7 vs UCS-2)."""
    if is_gsm7(text):
        single, multi = GSM_SINGLE, GSM_MULTI
    else:
        single, multi = UNICODE_SINGLE, UNICODE_MULTI
    length = len(text)
    count = 1 if length <= single else -(-length // multi)
    parts = [text[i * multi:(i + 1) * multi] for i in range(count)] if count > 1 else [text]
    return {"segments": count, "charset": "GSM-7" if is_gsm7(text) else "UCS-2", "parts": parts,
            "note": "Multipart messages are billed per segment by carriers."}


USSD_MAX_DEPTH = 7
USSD_MAX_LEN = 182


def render_ussd(items: list[str], prefix: str = "") -> dict:
    """USSD menu with depth and length limits enforced."""
    lines = [f"{i + 1}. {item}" for i, item in enumerate(items)]
    body = "\n".join(lines)
    if prefix:
        body = f"{prefix}\n{body}"
    truncated = body[:USSD_MAX_LEN]
    return {"menu": truncated, "depth": 1, "truncated": truncated != body,
            "max_depth": USSD_MAX_DEPTH, "max_length": USSD_MAX_LEN}


def ussd_depth_ok(depth: int) -> bool:
    return 1 <= depth <= USSD_MAX_DEPTH


def render_ivr(body: str, question: str, options: list[str]) -> str:
    """IVR script: plain speech lines with explicit PAUSE/keypress markers."""
    lines = [body, "[PAUSE]", question or "(no question)"]
    for i, option in enumerate(options):
        lines.append(f"[PRESS {i + 1}] {option}")
    lines.append("[PAUSE]")
    lines.append("To repeat, press 9. To stop messages, say STOP.")
    return "\n".join(lines)


# ---------------------------------------------------------- learner state ---

STATES = ("new", "active", "paused", "completed", "opted_out")
TRANSITIONS = {
    "new": {"active", "opted_out"},
    "active": {"paused", "completed", "opted_out"},
    "paused": {"active", "opted_out"},
    "completed": {"active", "opted_out"},
    "opted_out": {"active"},  # explicit re-consent only
}


class StateError(ValueError):
    pass


def transition_state(current: str, target: str, consent: str = "yes") -> str:
    if target not in TRANSITIONS.get(current, set()):
        raise StateError(f"Illegal learner-state transition '{current}' → '{target}'.")
    if target == "active" and current == "opted_out" and consent != "yes":
        raise StateError("Re-subscribing after STOP requires fresh recorded consent.")
    return target


def handle_inbound(text: str) -> str:
    """Inbound keywords: STOP wins immediately; other keywords are informational."""
    stripped = text.strip().lower().strip(".!")
    if stripped in ("stop", "unsubscribe", "cancel", "quit"):
        return "opted_out"
    if stripped in ("start", "subscribe"):
        return "resubscribe_requested"
    return "received"


# ------------------------------------------------------- consent & scheduling ---


@dataclass
class SendDecision:
    allowed: bool
    reason: str


def quiet_hours_ok(local_hour: int, quiet_start: int, quiet_end: int) -> bool:
    """Quiet window may wrap midnight (e.g. 21 → 7)."""
    if quiet_start == quiet_end:
        return True
    if quiet_start < quiet_end:
        return not (quiet_start <= local_hour < quiet_end)
    return not (local_hour >= quiet_start or local_hour < quiet_end)


def can_send(subscription, kind: str, local_hour: int, sent_today: int) -> SendDecision:
    if subscription.state == "opted_out":
        return SendDecision(False, "Learner opted out (STOP) — no further messages.")
    if subscription.state == "paused":
        return SendDecision(False, "Subscription paused.")
    if kind != "lesson" and subscription.consent != "yes":
        return SendDecision(False, "Non-essential messages require recorded consent.")
    if not quiet_hours_ok(local_hour, _hour(subscription.quiet_start), _hour(subscription.quiet_end)):
        return SendDecision(False, "Within quiet hours — rescheduled.")
    if sent_today >= subscription.max_per_day:
        return SendDecision(False, "Daily frequency cap reached.")
    return SendDecision(True, "ok")


def _hour(hhmm: str) -> int:
    try:
        return int(hhmm.split(":")[0])
    except (ValueError, AttributeError):
        return 0


# --------------------------------------------------------- provider adapters ---


class SimulatorProvider:
    """Local development/demo provider. Sends are NEVER real carrier delivery."""
    name = "local-simulator"

    def send(self, to: str, body: str) -> dict:
        return {"provider_uid": f"sim-{abs(hash((to, body))) % 10**10}",
                "status": "simulated",
                "note": "SIMULATOR — this send is not real carrier delivery."}


def provider_status() -> dict:
    import os

    configured = bool(os.environ.get("REACHLEARN_PROVIDER_URL") and os.environ.get("REACHLEARN_PROVIDER_KEY"))
    return {
        "provider": "configured-provider" if configured else SimulatorProvider.name,
        "simulator": not configured,
        "message": (
            "A real messaging provider is configured."
            if configured
            else "SIMULATOR MODE — messages are recorded locally and are never real carrier delivery."
        ),
    }


# --------------------------------------------------------- idempotent callbacks ---


def process_webhook(provider_uid: str, payload_json: str, existing_uids: set[str]) -> dict:
    """Duplicate provider callbacks (retries) must be idempotent."""
    if not provider_uid:
        return {"applied": False, "reason": "provider_uid is required."}
    if provider_uid in existing_uids:
        return {"applied": False, "reason": "duplicate callback — already processed (idempotent)."}
    try:
        payload = json.loads(payload_json or "{}")
    except json.JSONDecodeError:
        return {"applied": False, "reason": "unparseable payload."}
    status = str(payload.get("status", "unknown"))
    return {"applied": True, "status": status if status in ("sent", "delivered", "failed", "unknown") else "unknown"}


def completion_report(state_rows, lessons_total: int) -> dict:
    return {
        "learners": len(state_rows),
        "lessons_total": lessons_total,
        "completed_counts": [r.completed_count for r in state_rows],
        "note": "Completion reports reflect recorded responses only; unrecorded offline study is missing evidence.",
    }
