"""Tests: scheduling math, confidence-vs-recall separation, progress."""
from __future__ import annotations

from datetime import date

import pytest

from app.scheduler import MAX_INTERVAL, ScheduleError, next_interval
from app.services import FlashcardError, Flashcards


@pytest.fixture()
def fc(tmp_path):
    f = Flashcards(str(tmp_path / "f.db"))
    f.add_deck("Biology", "science")
    f.add_card(1, "What is a cell?", "The basic unit of life")
    f.add_card(1, "What is osmosis?", "Water diffusion across a membrane")
    return f


def test_interval_doubling_and_reset():
    assert next_interval(1, True, 3) == 2
    assert next_interval(2, True, 3) == 4
    assert next_interval(4, True, 3) == 8
    assert next_interval(8, False, 5) == 1     # failure resets regardless of confidence
    assert next_interval(MAX_INTERVAL, True, 3) == MAX_INTERVAL   # cap


def test_confidence_modifies_interval_but_never_replaces_recall():
    assert next_interval(4, True, 5) == 10      # +25%
    assert next_interval(4, True, 1) == 6       # -25%
    with pytest.raises(ScheduleError):
        next_interval(4, True, 0)
    with pytest.raises(ScheduleError):
        next_interval(4, True, 6)


def test_review_records_due_date(fc):
    r = fc.review(1, correct=True, confidence=3, today=date(2026, 10, 1))
    assert r["interval_days"] == 2
    assert r["due_on"] == "2026-10-03"


def test_due_cards_selection(fc):
    fc.review(1, correct=True, confidence=3, today=date(2026, 10, 1))   # due 10-03
    fc.review(2, correct=False, confidence=5, today=date(2026, 10, 1))  # due 10-02
    due = fc.due_cards(1, today=date(2026, 10, 2))
    assert [c["id"] for c in due] == [2]            # confident-but-wrong still due first
    due = fc.due_cards(1, today=date(2026, 10, 3))
    assert [c["id"] for c in due] == [2, 1]  # earliest due date first


def test_progress_separates_confidence_from_recall(fc):
    fc.review(1, correct=False, confidence=5, today=date(2026, 10, 1))
    fc.review(2, correct=True, confidence=1, today=date(2026, 10, 1))
    p = fc.progress(1)
    assert p["attempts"] == 2 and p["correct"] == 1 and p["accuracy"] == 0.5
    assert p["confident_but_wrong"] == 1
    assert p["unsure_but_right"] == 1
    assert "never substituted" in p["note"]


def test_validation(fc):
    with pytest.raises(FlashcardError):
        fc.add_deck("")
    with pytest.raises(FlashcardError):
        fc.add_card(99, "f", "b")
    with pytest.raises(FlashcardError):
        fc.add_card(1, "", "b")
    with pytest.raises(FlashcardError):
        fc.review(99, True, 3)
    with pytest.raises(FlashcardError):
        fc.review(1, True, 9)
