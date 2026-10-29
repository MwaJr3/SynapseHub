"""Modern features: cloze cards, tags, difficult-cards session.

Scheduler honesty: the bundled scheduler is an SM-2-style interval heuristic
(Anki-family method). It is NOT FSRS and NOT presented as validated
spaced-repetition research.
"""
from __future__ import annotations

import re


class FeatureError(ValueError):
    pass


CLOZE = re.compile(r"\{\{(.*?)\}\}")


def parse_cloze(text: str) -> dict:
    """'The {{mitochondria}} is the {{powerhouse}}' ->
    prompt with blanks + full answers."""
    blanks = CLOZE.findall(text)
    if not blanks:
        raise FeatureError("no {{cloze}} blanks found")
    prompt = CLOZE.sub("[...]", text)
    return {"prompt": prompt, "answers": blanks,
            "note": "Cloze deletion card; answers are exactly the blanked spans."}


def add_tags(card: dict, tags: list[str]) -> dict:
    existing = set(card.get("tags", []))
    for tag in tags:
        if not tag.strip():
            raise FeatureError("tags must be non-empty")
        existing.add(tag.strip())
    card["tags"] = sorted(existing)
    return card


def filter_by_tag(cards: list[dict], tag: str) -> list[dict]:
    return [c for c in cards if tag in c.get("tags", [])]


def difficult_session(cards: list[dict], limit: int = 10) -> list[dict]:
    """Cards with the lowest success rate first. Deterministic tie-break by
    card id. Bounded to `limit`."""
    if limit < 1:
        raise FeatureError("limit must be positive")
    def rate(card: dict) -> float:
        reviews = card.get("reviews", 0)
        return card.get("correct", 0) / reviews if reviews else 0.0
    ranked = sorted(cards, key=lambda c: (rate(c), c.get("id", 0)))
    return ranked[:limit]
