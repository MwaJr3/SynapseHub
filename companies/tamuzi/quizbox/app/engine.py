"""Quiz session state machine and scoring."""
from __future__ import annotations

from dataclasses import dataclass, field

from .models import Question


class QuizError(ValueError):
    pass


@dataclass
class AnswerRecord:
    question: Question
    chosen_index: int
    correct: bool


@dataclass
class QuizSession:
    questions: list[Question]
    score: int = 0
    index: int = 0
    finished: bool = False
    records: list[AnswerRecord] = field(default_factory=list)

    @property
    def current(self) -> Question:
        if self.finished or self.index >= len(self.questions):
            raise QuizError("The quiz is over.")
        return self.questions[self.index]

    def answer(self, chosen_index: int) -> AnswerRecord:
        if self.finished:
            raise QuizError("The quiz is over.")
        q = self.current
        if not isinstance(chosen_index, int) or not 0 <= chosen_index < len(q.options):
            raise QuizError(f"Choose an option between 0 and {len(q.options) - 1}.")
        record = AnswerRecord(q, chosen_index, chosen_index == q.correct_index)
        self.records.append(record)
        if record.correct:
            self.score += 1
        self.index += 1
        if self.index >= len(self.questions):
            self.finished = True
        return record

    def summary(self) -> dict:
        by_category: dict[str, dict] = {}
        for r in self.records:
            row = by_category.setdefault(r.question.category, {"correct": 0, "total": 0})
            row["total"] += 1
            if r.correct:
                row["correct"] += 1
        return {
            "score": self.score,
            "answered": len(self.records),
            "total": len(self.questions),
            "percent": round(100 * self.score / len(self.questions), 1) if self.questions else 0.0,
            "by_category": by_category,
        }
