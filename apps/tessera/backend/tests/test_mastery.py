"""Mastery must move on evidence and decay with forgetting."""
from __future__ import annotations

from app import mastery


def test_correct_answers_raise_mastery_and_wrong_answers_lower_it():
    start = 0.5
    up = mastery.update_mastery(start, correct=True, difficulty=3.0)
    down = mastery.update_mastery(start, correct=False, difficulty=3.0)
    assert up.mastery > start > down.mastery


def test_a_single_answer_cannot_make_a_concept_mastered():
    # One correct answer from zero must not read as mastery.
    first = mastery.update_mastery(0.0, correct=True, difficulty=1.0)
    assert first.mastery < 0.4
    assert mastery.tier(first.mastery) == "weak"


def test_mastery_stays_within_bounds_under_repeated_evidence():
    value = 0.0
    for _ in range(40):
        value = mastery.update_mastery(value, correct=True, difficulty=5.0).mastery
    assert value <= 1.0
    for _ in range(40):
        value = mastery.update_mastery(value, correct=False, difficulty=5.0).mastery
    assert value >= 0.0


def test_harder_questions_move_mastery_further():
    easy = mastery.update_mastery(0.5, correct=True, difficulty=1.0)
    hard = mastery.update_mastery(0.5, correct=True, difficulty=5.0)
    assert hard.delta > easy.delta


def test_mastery_decays_when_the_concept_is_not_retained():
    assert mastery.decayed_mastery(0.9, stability_days=10.0, elapsed_days=0.0) == 0.9
    later = mastery.decayed_mastery(0.9, stability_days=10.0, elapsed_days=60.0)
    assert later < 0.9
    # The stored mastery is not rewritten by decay.
    assert 0.0 <= later <= 1.0


def test_tiers_reflect_the_thresholds():
    assert mastery.tier(0.0) == "unseen"
    assert mastery.tier(0.2) == "weak"
    assert mastery.tier(0.6) == "developing"
    assert mastery.tier(0.9) == "mastered"


def test_needs_review_only_applies_to_studied_concepts():
    assert mastery.needs_review(0.0, 10.0, 100.0) is False
    assert mastery.needs_review(0.8, 10.0, 0.0) is False
    assert mastery.needs_review(0.8, 10.0, 90.0) is True
