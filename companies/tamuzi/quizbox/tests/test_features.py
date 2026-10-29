"""Phase-B feature tests: review mode, confidence calibration, bank IO."""
from __future__ import annotations

import json

import pytest

from app.features import confidence_vs_score, export_bank, import_bank, review_misses


def test_review_misses_shows_explanations():
    attempts = [{"prompt": "Q1", "given": 2, "answer": 1, "correct": False, "explanation": "because X"},
                {"prompt": "Q2", "given": 0, "answer": 0, "correct": True}]
    misses = review_misses(attempts)
    assert len(misses) == 1 and misses[0]["explanation"] == "because X"


def test_review_misses_missing_explanation_labelled():
    misses = review_misses([{"prompt": "Q", "correct": False}])
    assert "no explanation recorded" in misses[0]["explanation"]


def test_confidence_vs_score_descriptive():
    result = confidence_vs_score([5, 5, 2, 1], [True, False, False, False])
    assert result["overall_accuracy"] == 0.25
    assert result["by_confidence"][5]["accuracy"] == 0.5
    assert "not a prediction" in result["note"]
    with pytest.raises(ValueError):
        confidence_vs_score([5], [])
    with pytest.raises(ValueError):
        confidence_vs_score([9], [True])


def test_bank_round_trip_and_validation():
    cards = [{"prompt": "p", "options": ["a", "b"], "answer_index": 1, "explanation": "e"}]
    exported = export_bank(cards)
    result = import_bank(exported)
    assert len(result["valid"]) == 1 and not result["invalid"]
    bad = import_bank(json.dumps({"questions": [
        {"prompt": "x", "options": ["a"], "answer_index": 0},
        {"options": ["a", "b"], "answer_index": 0}]}))
    assert len(bad["invalid"]) == 2
    assert any("at least 2" in r for r in bad["invalid"][0]["reasons"])
    assert any("missing field" in r for r in bad["invalid"][1]["reasons"])
    with pytest.raises(ValueError):
        import_bank("{not json")
