"""Awareness checkpoints (quiz scoring). Deterministic, answer keys stay
server-side — the learner-facing payload never includes correct answers."""
from __future__ import annotations

import json


def score_attempt(quiz_json: str, answers: list[int]) -> tuple[int, int]:
    questions = json.loads(quiz_json or "[]")
    total = len(questions)
    score = 0
    for q, given in zip(questions, answers):
        try:
            if int(given) == int(q.get("correct", -1)):
                score += 1
        except (TypeError, ValueError):
            continue
    return score, total


def public_questions(quiz_json: str) -> list[dict]:
    return [{"prompt": q.get("prompt", ""), "choices": q.get("choices", [])}
            for q in json.loads(quiz_json or "[]")]
