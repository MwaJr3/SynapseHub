"""Modern features: review mode with explanations, confidence tracking,
quiz-bank import/export validation.

DSA notes: review assembly is O(n) over attempts; calibration summary is
O(n); bank validation is linear in rows.
"""
from __future__ import annotations

import json


def review_misses(attempts: list[dict]) -> list[dict]:
    """Wrong answers with their explanations — the review queue."""
    out = []
    for a in attempts:
        if not a.get("correct", False):
            out.append({"prompt": a.get("prompt", ""), "given": a.get("given"),
                        "answer": a.get("answer"),
                        "explanation": a.get("explanation", "(no explanation recorded)")})
    return out


def confidence_vs_score(confidences: list[int], correct: list[bool]) -> dict:
    """Compare self-reported confidence (1-5) with actual results. Calibrated
    self-assessment is the goal; this is descriptive, not predictive."""
    if len(confidences) != len(correct):
        raise ValueError("confidences and results must have equal length")
    if any(not 1 <= c <= 5 for c in confidences):
        raise ValueError("confidence must be within 1..5")
    pairs = sorted(zip(confidences, correct))
    by_level: dict[int, list[bool]] = {}
    for conf, ok in pairs:
        by_level.setdefault(conf, []).append(ok)
    table = {conf: {"count": len(v), "accuracy": round(sum(v) / len(v), 3)} for conf, v in by_level.items()}
    overall = round(sum(correct) / len(correct), 3) if correct else 0.0
    return {"by_confidence": table, "overall_accuracy": overall,
            "note": ("Self-reported confidence compared with actual results; "
                     "descriptive feedback for calibration — not a prediction.")}


REQUIRED_FIELDS = ("prompt", "options", "answer_index")


def import_bank(text: str) -> dict:
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid JSON: {exc}") from exc
    rows = payload.get("questions") if isinstance(payload, dict) else None
    if rows is None or not isinstance(rows, list):
        raise ValueError("quiz bank must be an object with a 'questions' list")
    valid, invalid = [], []
    for i, row in enumerate(rows):
        problems = []
        if not isinstance(row, dict):
            invalid.append({"index": i, "reasons": ["not an object"]})
            continue
        for f in REQUIRED_FIELDS:
            if f not in row:
                problems.append(f"missing field: {f}")
        if "options" in row and (not isinstance(row["options"], list) or len(row["options"]) < 2):
            problems.append("options must be a list of at least 2")
        if "answer_index" in row and isinstance(row.get("options"), list):
            if not isinstance(row["answer_index"], int) or not 0 <= row["answer_index"] < len(row["options"]):
                problems.append("answer_index out of range")
        if problems:
            invalid.append({"index": i, "reasons": problems})
        else:
            valid.append(row)
    return {"valid": valid, "invalid": invalid,
            "note": "Rejected rows carry reasons — nothing is dropped silently."}


def export_bank(cards: list[dict]) -> str:
    return json.dumps({"questions": [
        {"prompt": c["prompt"], "options": c["options"], "answer_index": c["answer_index"],
         "explanation": c.get("explanation", "")} for c in cards]}, indent=2)
