"""LearnBridge domain logic: quiz grading, lesson progress rules, offline sync merges.

Pure functions — the test suite exercises these directly.
"""
from __future__ import annotations

import json
from dataclasses import dataclass

# ---------------------------------------------------------------- quizzes ---

class QuizError(ValueError):
    pass


def grade_question(kind: str, answer_json: str, response) -> bool:
    """Grade one question response. response: int | list | bool | str."""
    expected = json.loads(answer_json)
    if kind == "mcq":
        return isinstance(response, int) and response == expected
    if kind == "tf":
        return isinstance(response, bool) and response is expected
    if kind == "multi":
        if not isinstance(response, list):
            return False
        return sorted(int(i) for i in response) == sorted(int(i) for i in expected)
    if kind == "short":
        if not isinstance(response, str):
            return False
        given = response.strip().lower()
        return any(given == str(accepted).strip().lower() for accepted in expected)
    raise QuizError(f"Unknown question kind '{kind}'.")


@dataclass
class QuestionResult:
    question_id: int
    correct: bool
    explanation: str


@dataclass
class AttemptResult:
    score: float  # 0-100
    passed: bool
    results: list[QuestionResult]


def grade_attempt(questions, responses: dict[int, object], min_score: float) -> AttemptResult:
    """questions: ORM Question rows keyed by id in responses. responses: {question_id: answer}."""
    results: list[QuestionResult] = []
    for question in questions:
        response = responses.get(question.id)
        correct = response is not None and grade_question(question.kind, question.answer_json, response)
        results.append(QuestionResult(question.id, correct, question.explanation))
    total = len(questions)
    score = round(100.0 * sum(1 for r in results if r.correct) / total, 1) if total else 0.0
    return AttemptResult(score=score, passed=score >= min_score and total > 0, results=results)


# --------------------------------------------------------------- progress ---

STATES = ("not_started", "in_progress", "completed", "needs_review")


def next_progress_state(current: str, event: str, requirements_met: bool) -> str:
    """Progress advances only via explicit learner actions and configured
    lesson requirements — never from page views alone.

    events: open | submit_work | requirements_met | needs_review | reset
    """
    if event == "reset":
        return "not_started"
    if event == "needs_review":
        return "needs_review"
    if event == "open":
        return current if current in ("completed", "needs_review") else "in_progress"
    if event in ("submit_work", "requirements_met"):
        return "completed" if requirements_met else "in_progress"
    raise ValueError(f"Unknown progress event '{event}'.")


def lesson_requirements_met(requirements_json: str, quiz_score: float | None) -> bool:
    """Requirements: {} means 'explicit mark-complete'; {min_quiz_score: N} needs a
    passing quiz score before completion."""
    requirements = json.loads(requirements_json or "{}")
    min_score = requirements.get("min_quiz_score")
    if min_score is None:
        return True
    return quiz_score is not None and quiz_score >= float(min_score)


# ------------------------------------------------------------------- sync ---

@dataclass
class SyncOutcome:
    status: str  # applied | conflict | rejected
    record: dict
    server_snapshot: dict


def apply_synced_change(kind: str, server_record: dict | None, change: dict, server_now: str) -> SyncOutcome:
    """Merge one queued offline change into the server record.

    Rules: a change based on a stale copy (client_base_ts older than the
    server's updated_at) is a CONFLICT — both versions are preserved and the
    learner chooses; nothing is silently discarded. Malformed changes are
    rejected with a reason.
    """
    if kind not in ("progress", "note", "bookmark"):
        return SyncOutcome("rejected", {}, {"reason": f"Unknown sync kind '{kind}'."})
    payload = change.get("payload")
    if not isinstance(payload, dict):
        return SyncOutcome("rejected", {}, {"reason": "payload must be an object."})

    if server_record is None:
        record = dict(payload)
        record["updated_at"] = server_now
        return SyncOutcome("applied", record, {})

    server_snapshot = dict(server_record)
    client_base = str(change.get("client_base_ts") or "")
    server_updated = str(server_record.get("updated_at") or "")
    if client_base and server_updated and client_base < server_updated:
        return SyncOutcome("conflict", dict(server_record), server_snapshot)

    record = dict(server_record)
    record.update(payload)
    record["updated_at"] = server_now
    return SyncOutcome("applied", record, server_snapshot)


def resolve_conflict(resolution: str, server_snapshot: dict, client_payload: dict) -> dict:
    """Explicit learner resolution: keep_client | keep_server | merge (merge keeps
    the server text plus the client's additive fields)."""
    if resolution == "keep_client":
        merged = dict(server_snapshot)
        merged.update(client_payload)
        return merged
    if resolution == "keep_server":
        return dict(server_snapshot)
    if resolution == "merge":
        merged = dict(server_snapshot)
        for key, value in client_payload.items():
            if key not in merged or merged[key] in ("", None, []):
                merged[key] = value
            elif key == "body" and value not in merged[key]:
                merged[key] = f"{merged[key]}\n[merged offline edit] {value}"
        return merged
    raise ValueError("resolution must be keep_client, keep_server or merge.")
