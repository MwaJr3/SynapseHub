"""OpenLearn Commons domain logic: license guidance, attribution, translation review, dedupe.

Honesty rules encoded here: a publicly accessible resource is NOT assumed to
be openly licensed; an unknown license yields no legal certainty; machine
translations stay labelled until a human approves them.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

LICENSE_MATRIX: dict[str, dict] = {
    "CC BY 4.0": {"adapt": True, "redistribute": True, "commercial": True,
                  "obligation": "Credit the creator, license link, indicate changes."},
    "CC BY-SA 4.0": {"adapt": True, "redistribute": True, "commercial": True,
                     "obligation": "Credit the creator; share adaptations under the same license."},
    "CC BY-NC 4.0": {"adapt": True, "redistribute": True, "commercial": False,
                     "obligation": "Credit the creator; non-commercial use only."},
    "CC BY-NC-SA 4.0": {"adapt": True, "redistribute": True, "commercial": False,
                        "obligation": "Credit; non-commercial; share-alike."},
    "CC0 1.0": {"adapt": True, "redistribute": True, "commercial": True,
                "obligation": "No attribution required (waiver), but courtesy is good practice."},
    "Public Domain": {"adapt": True, "redistribute": True, "commercial": True,
                      "obligation": "Check the jurisdiction's term rules before assuming public domain."},
    "All Rights Reserved": {"adapt": False, "redistribute": False, "commercial": False,
                            "obligation": "Contact the rights holder for any reuse beyond viewing."},
    "Unknown": {"adapt": False, "redistribute": False, "commercial": False,
                "obligation": "License unknown — no legal certainty. Contact the creator before reusing."},
}


@dataclass
class ReuseGuidance:
    license: str
    can_adapt: bool
    can_redistribute: bool
    can_commercial: bool
    obligation: str
    uncertain: bool


def license_guidance(license_name: str) -> ReuseGuidance:
    key = license_name.strip() if license_name.strip() in LICENSE_MATRIX else "Unknown"
    entry = LICENSE_MATRIX[key]
    return ReuseGuidance(
        license=key,
        can_adapt=entry["adapt"],
        can_redistribute=entry["redistribute"],
        can_commercial=entry["commercial"],
        obligation=entry["obligation"],
        uncertain=key == "Unknown",
    )


def attribution_line(title: str, creator: str, license_name: str, source_url: str = "") -> str:
    parts = [f'"{title}"']
    if creator:
        parts.append(f"by {creator}")
    parts.append(f"licensed under {license_name if license_name.strip() in LICENSE_MATRIX else 'an unverified license'}")
    if source_url:
        parts.append(f"source: {source_url}")
    return ", ".join(parts) + "."


def collection_attribution(items: list[dict]) -> str:
    lines = [attribution_line(i.get("title", ""), i.get("creator", ""), i.get("license", "Unknown"), i.get("source_url", "")) for i in items]
    return "\n".join(f"- {line}" for line in lines) if lines else "(empty collection)"


# ------------------------------------------------------------ dedupe ---


def _norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def is_duplicate(title_a: str, source_a: str, title_b: str, source_b: str) -> bool:
    """Duplicate candidates: same normalised title, or same non-empty source URL."""
    if source_a and source_b and source_a.strip() == source_b.strip():
        return True
    return _norm(title_a) == _norm(title_b) and bool(_norm(title_a))


# ------------------------------------------------- translation workflow ---

TRANSLATION_TRANSITIONS = {
    "draft": {"in_review"},
    "in_review": {"approved", "rejected", "draft"},
    "approved": {"draft"},
    "rejected": {"draft"},
}


class WorkflowError(ValueError):
    pass


def validate_translation_transition(current: str, target: str) -> None:
    if target not in TRANSLATION_TRANSITIONS.get(current, set()):
        raise WorkflowError(f"Illegal translation transition '{current}' → '{target}'.")


def approve_translation(machine: str) -> None:
    """Machine drafts cannot be approved without human review (the reviewer
    action itself is the human step; the MT label is preserved in history)."""
    if machine not in ("yes", "no"):
        raise WorkflowError("machine must be yes or no.")


def public_translation(row) -> bool:
    """Unpublished translations stay hidden from public listings."""
    return row.status == "approved"


def rating_display(stars: int, moderated: str, community_average: float | None, expert_reviewed: bool) -> dict:
    return {
        "stars": stars if moderated == "visible" else None,
        "community_average": community_average,
        "expert_reviewed": expert_reviewed,
        "note": "Community ratings are distinct from expert review; neither is an official curriculum alignment.",
    }
