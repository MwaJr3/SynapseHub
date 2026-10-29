"""LearnBridge quiz grading and progress-rule tests."""
import json

import pytest

from app import core


def make_question(kind, answer, exp_text="because"):
    import types

    return types.SimpleNamespace(id=1, kind=kind, answer_json=json.dumps(answer), explanation=exp_text)


def test_grade_question_all_types():
    assert core.grade_question("mcq", json.dumps(1), 1) is True
    assert core.grade_question("mcq", json.dumps(1), 2) is False
    assert core.grade_question("tf", json.dumps(True), True) is True
    assert core.grade_question("tf", json.dumps(True), False) is False
    assert core.grade_question("multi", json.dumps([0, 2]), [2, 0]) is True
    assert core.grade_question("multi", json.dumps([0, 2]), [0]) is False
    assert core.grade_question("multi", json.dumps([0, 2]), "0,2") is False
    assert core.grade_question("short", json.dumps(["5", "five"]), " Five ") is True
    assert core.grade_question("short", json.dumps(["5"]), 5) is False
    with pytest.raises(core.QuizError):
        core.grade_question("essay", json.dumps([]), "x")


def test_grade_attempt_scoring_and_pass():
    qs = [make_question("mcq", 0), make_question("tf", True), make_question("short", ["x"])]
    for i, q in enumerate(qs):
        q.id = i + 1
    result = core.grade_attempt(qs, {1: 0, 2: True, 3: "x"}, min_score=66)
    assert result.score == 100.0 and result.passed
    partial = core.grade_attempt(qs, {1: 1, 2: True, 3: "x"}, min_score=66)
    assert partial.score == pytest.approx(66.7, abs=0.1) and partial.passed
    fail = core.grade_attempt(qs, {1: 1, 2: False, 3: "y"}, min_score=66)
    assert not fail.passed
    assert all(not r.correct for r in fail.results)


def test_progress_state_machine():
    # page view alone never completes
    assert core.next_progress_state("not_started", "open", False) == "in_progress"
    assert core.next_progress_state("in_progress", "submit_work", False) == "in_progress"
    assert core.next_progress_state("in_progress", "submit_work", True) == "completed"
    assert core.next_progress_state("completed", "open", False) == "completed"
    assert core.next_progress_state("completed", "needs_review", False) == "needs_review"
    assert core.next_progress_state("needs_review", "reset", False) == "not_started"
    with pytest.raises(ValueError):
        core.next_progress_state("not_started", "viewed", False)


def test_requirements_gate_completion():
    req = json.dumps({"min_quiz_score": 70})
    assert core.lesson_requirements_met(req, 70.0) is True
    assert core.lesson_requirements_met(req, 69.9) is False
    assert core.lesson_requirements_met(req, None) is False
    assert core.lesson_requirements_met(json.dumps({}), None) is True
