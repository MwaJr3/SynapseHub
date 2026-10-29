"""Questions are modelled independently from presentation."""
from __future__ import annotations

from dataclasses import dataclass


class QuestionError(ValueError):
    pass


@dataclass(frozen=True)
class Question:
    id: str
    category: str
    difficulty: str          # easy | medium | hard
    prompt: str
    options: tuple[str, ...]
    correct_index: int
    explanation: str


def validate_question(q: Question) -> None:
    if not q.id.strip():
        raise QuestionError("Question id must not be empty.")
    if not q.category.strip():
        raise QuestionError("Question category must not be empty.")
    if q.difficulty not in ("easy", "medium", "hard"):
        raise QuestionError(f"Unknown difficulty {q.difficulty!r}.")
    if len(q.options) < 2:
        raise QuestionError("A question needs at least two options.")
    if any(not o.strip() for o in q.options):
        raise QuestionError("Options must not be empty.")
    if len(set(q.options)) != len(q.options):
        raise QuestionError("Options must be unique.")
    if not 0 <= q.correct_index < len(q.options):
        raise QuestionError("correct_index out of range.")
    if not q.explanation.strip():
        raise QuestionError("An explanation is required for answer feedback.")
