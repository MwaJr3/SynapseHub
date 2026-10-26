"""Question bank loading and validated selection."""
from __future__ import annotations

import json
from pathlib import Path

from .models import Question, QuestionError, validate_question

DEFAULT_BANK = Path(__file__).resolve().parent.parent / "data" / "questions.json"


def load_bank(path: str | Path | None = None) -> list[Question]:
    raw = json.loads(Path(path or DEFAULT_BANK).read_text())
    questions: list[Question] = []
    seen: set[str] = set()
    for row in raw:
        q = Question(
            id=str(row["id"]), category=str(row["category"]), difficulty=str(row["difficulty"]),
            prompt=str(row["prompt"]), options=tuple(row["options"]),
            correct_index=int(row["correct_index"]), explanation=str(row["explanation"]),
        )
        validate_question(q)
        if q.id in seen:
            raise QuestionError(f"Duplicate question id {q.id!r}.")
        seen.add(q.id)
        questions.append(q)
    return questions


def select_questions(bank: list[Question], count: int, category: str | None = None,
                     difficulty: str | None = None, rng=None) -> list[Question]:
    """Randomised selection honouring filters; deterministic under a seeded rng."""
    import random
    pool = [q for q in bank
            if (category is None or q.category == category)
            and (difficulty is None or q.difficulty == difficulty)]
    if count < 1:
        raise QuestionError("Count must be at least 1.")
    if count > len(pool):
        raise QuestionError(f"Only {len(pool)} question(s) match those filters.")
    chooser = rng or random.Random()
    return chooser.sample(pool, count)
