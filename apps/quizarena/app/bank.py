"""Quiz-bank import/export with validation (invalid rows carry reasons)."""
from __future__ import annotations

import json


class BankError(ValueError):
    pass


REQUIRED = ("prompt", "options", "answer_index")


def validate_bank(data) -> tuple[list[dict], list[dict]]:
    """Return (valid_rows, invalid_rows_with_reasons). Never silently drops data."""
    valid, invalid = [], []
    if not isinstance(data, dict) or "questions" not in data:
        raise BankError("Quiz bank must be an object with a 'questions' list.")
    for i, row in enumerate(data["questions"]):
        problems = []
        if not isinstance(row, dict):
            invalid.append({"index": i, "row": row, "reasons": ["not an object"]})
            continue
        for field in REQUIRED:
            if field not in row:
                problems.append(f"missing field: {field}")
        if "options" in row:
            if not isinstance(row["options"], list) or len(row["options"]) < 2:
                problems.append("options must be a list with at least 2 entries")
        if "answer_index" in row:
            opts = row.get("options") or []
            if not isinstance(row["answer_index"], int) or not (0 <= row["answer_index"] < len(opts)):
                problems.append("answer_index out of range")
        if "prompt" in row and (not str(row["prompt"]).strip()):
            problems.append("prompt is empty")
        if problems:
            invalid.append({"index": i, "row": row, "reasons": problems})
        else:
            valid.append(row)
    return valid, invalid


def export_bank(questions: list[dict], title: str = "") -> str:
    rows = [{"prompt": q["prompt"], "options": json.loads(q["options"]) if isinstance(q["options"], str) else q["options"],
             "answer_index": q["answer_index"], "explanation": q.get("explanation", ""),
             "difficulty": q.get("difficulty", "medium"), "tags": q.get("tags", "")} for q in questions]
    return json.dumps({"title": title, "questions": rows}, indent=2)
