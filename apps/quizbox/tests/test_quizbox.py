"""Tests: question validation, selection, scoring, state machine."""
from __future__ import annotations

import random

import pytest

from app.bank import load_bank, select_questions
from app.engine import QuizError, QuizSession
from app.models import Question, QuestionError, validate_question


def make_q(qid="T1", options=("a", "b", "c"), correct=0):
    return Question(qid, "science", "easy", "prompt?", options, correct, "because")


def test_bank_loads_and_validates():
    bank = load_bank()
    assert len(bank) >= 12
    cats = {q.category for q in bank}
    assert {"science", "programming", "mathematics", "history"} <= cats


def test_question_validation():
    with pytest.raises(QuestionError):
        validate_question(make_q(options=("a",)))
    with pytest.raises(QuestionError):
        validate_question(make_q(correct=5))
    with pytest.raises(QuestionError):
        validate_question(make_q(options=("a", "a", "b")))
    with pytest.raises(QuestionError):
        validate_question(Question("T", "science", "easy", "p", ("a", "b"), 0, "  "))


def test_selection_filters_and_counts():
    bank = load_bank()
    picked = select_questions(bank, 2, category="science", rng=random.Random(1))
    assert len(picked) == 2 and all(q.category == "science" for q in picked)
    with pytest.raises(QuestionError):
        select_questions(bank, 999, category="science")
    with pytest.raises(QuestionError):
        select_questions(bank, 0)


def test_selection_is_reproducible_with_seed():
    bank = load_bank()
    a = select_questions(bank, 5, rng=random.Random(42))
    b = select_questions(bank, 5, rng=random.Random(42))
    assert [q.id for q in a] == [q.id for q in b]


def test_scoring_and_feedback():
    session = QuizSession([make_q(correct=1), make_q(qid="T2", correct=0)])
    r = session.answer(1)
    assert r.correct and "because" == r.question.explanation
    r = session.answer(1)
    assert not r.correct
    assert session.finished
    s = session.summary()
    assert s == {"score": 1, "answered": 2, "total": 2, "percent": 50.0, "by_category": {"science": {"correct": 1, "total": 2}}}


def test_invalid_and_double_answers():
    session = QuizSession([make_q()])
    with pytest.raises(QuizError):
        session.answer(3)
    with pytest.raises(QuizError):
        session.answer(-1)
    session.answer(0)
    with pytest.raises(QuizError):
        session.answer(0)          # double submission cannot change results
    with pytest.raises(QuizError):
        _ = session.current
