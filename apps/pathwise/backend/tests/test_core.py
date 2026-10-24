"""PathWise scoring, mastery and recommendation tests."""
import json
from datetime import datetime, timedelta, timezone

import pytest

from app import core


def test_scoring_all_kinds_with_partial_credit():
    assert core.score_response("mcq", json.dumps(1), 1) == 1.0
    assert core.score_response("tf", json.dumps(False), False) == 1.0
    assert core.score_response("numeric", json.dumps(12), 12.0) == 1.0
    assert core.score_response("numeric", json.dumps(12), "12") == 1.0
    assert core.score_response("short", json.dumps(["21"]), " 21 ") == 1.0
    # partial credit: 2 correct of 2 expected, 1 wrong → (2-1)/2
    assert core.score_response("multi", json.dumps([0, 1]), [0, 1, 2]) == pytest.approx(0.5)
    assert core.score_response("multi", json.dumps([0, 1]), [0, 1]) == 1.0
    assert core.score_response("multi", json.dumps([0, 1]), [2]) == 0.0
    with pytest.raises(core.ScoringError):
        core.score_response("essay", json.dumps([]), "x")


def test_mastery_recency_and_blending():
    update = core.update_mastery(0.0, 0, [(1.0, 0.0), (1.0, 0.0), (0.0, 0.0)])
    assert update.score == pytest.approx(66.7, abs=0.1)
    assert update.evidence_count == 3 and update.confidence == "high"
    # blending with prior evidence
    blended = core.update_mastery(50.0, 2, [(1.0, 0.0)])
    assert blended.evidence_count == 3
    assert 50.0 < blended.score < 100.0


def test_mastery_recency_weighting_prefers_recent():
    old_perfect = core.update_mastery(0.0, 0, [(1.0, 28.0), (0.0, 0.0)])
    # old perfect evidence (half-life 14d → weight 0.25) vs fresh zero: weighted ≈ 20%
    assert old_perfect.score < 40.0


def test_confidence_and_status_show_uncertainty():
    assert core.confidence_for(0) == "low"
    assert core.confidence_for(1) == "low"
    assert core.confidence_for(2) == "moderate"
    assert core.confidence_for(5) == "high"
    assert core.mastery_status(0, 70, 0) == "not_yet_assessed"
    assert core.mastery_status(90, 70, 1) == "developing"  # thin evidence is never 'mastered'
    assert core.mastery_status(80, 70, 3) == "mastered"
    assert core.mastery_status(40, 70, 3) == "developing"


def test_recommendations_carry_plain_language_rationale():
    import types

    skills = [
        types.SimpleNamespace(id=1, name="Addition", mastery_threshold=70),
        types.SimpleNamespace(id=2, name="Subtraction", mastery_threshold=70),
        types.SimpleNamespace(id=3, name="Multiplication", mastery_threshold=70),
    ]
    edges = [
        types.SimpleNamespace(skill_id=2, prereq_skill_id=1),
        types.SimpleNamespace(skill_id=3, prereq_skill_id=1),
    ]
    # Addition not yet assessed → gap propagates: Subtraction/Multiplication blocked
    recs = core.recommend_next(skills, edges, {})
    texts = {r.skill_name: r.rationale for r in recs}
    assert "diagnostic" in texts["Addition"]
    assert "prerequisite" in texts["Subtraction"] and "Addition" in texts["Subtraction"]

    # Addition mastered → the others get gap-based recommendations instead
    mastery = {1: core.MasteryUpdate(85.0, 3, "high")}
    recs2 = core.recommend_next(skills, edges, mastery)
    texts2 = {r.skill_name: r.rationale for r in recs2}
    assert "Addition" not in texts2
    assert "practise this next" in texts2["Subtraction"] or "diagnostic" in texts2["Subtraction"]


def test_spaced_review_intervals():
    now = datetime(2026, 10, 24, tzinfo=timezone.utc)
    assert core.schedule_review(30, now) == (now + timedelta(days=1)).isoformat()
    assert core.schedule_review(60, now) == (now + timedelta(days=3)).isoformat()
    assert core.schedule_review(90, now) == (now + timedelta(days=7)).isoformat()


def test_pre_post_separates_participation():
    report = core.pre_post_report({1: 40.0, 2: 50.0}, {1: 80.0}, threshold=70)
    rows = {r["skill_id"]: r for r in report["rows"]}
    assert rows[1]["delta"] == 40.0 and rows[1]["improved"]
    assert rows[2]["delta"] is None  # missing post-test data is reported as missing
    assert report["matched_skills"] == 1
    assert "participation" in report["note"]
