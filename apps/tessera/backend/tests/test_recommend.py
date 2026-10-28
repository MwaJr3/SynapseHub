"""Recommendations must be ordered sensibly and always explained."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app import recommend

NOW = datetime(2026, 3, 1, tzinfo=timezone.utc)


def signal(**overrides):
    base = dict(
        concept_id="c1",
        title="Concept",
        difficulty=3.0,
        mastery=0.5,
        stability_days=10.0,
        last_reviewed_at=NOW - timedelta(days=1),
        now=NOW,
        prerequisites=(),
        unlocks=0,
        max_unlocks=1,
        goal_relevance=0.0,
        interest=0.0,
    )
    base.update(overrides)
    return recommend.ConceptSignal(**base)


def test_a_blocked_concept_is_not_recommended_but_says_why():
    blocked = signal(
        concept_id="advanced",
        prerequisites=(recommend.Prerequisite("basic", "Basics", 0.1),),
    )
    ranked = recommend.rank([blocked])
    assert ranked == []

    with_blocked = recommend.rank([blocked], include_blocked=True)
    assert with_blocked[0].blocked_by == ["Basics (10%)"]
    assert any("prerequisite" in reason.lower() for reason in with_blocked[0].reasons)


def test_a_ready_prerequisite_does_not_block():
    ready = signal(
        concept_id="advanced",
        prerequisites=(recommend.Prerequisite("basic", "Basics", 0.9),),
    )
    assert len(recommend.rank([ready])) == 1


def test_a_freshly_studied_concept_ranks_below_an_overdue_one():
    overdue = signal(concept_id="overdue", title="Overdue", mastery=0.7, last_reviewed_at=NOW - timedelta(days=90))
    fresh = signal(concept_id="fresh", title="Fresh", mastery=0.7, last_reviewed_at=NOW - timedelta(hours=1))
    ranked = recommend.rank([fresh, overdue])
    assert [item.concept_id for item in ranked] == ["overdue", "fresh"]


def test_an_unstudied_concept_beats_a_well_known_one():
    unknown = signal(concept_id="new", mastery=0.0, last_reviewed_at=None)
    known = signal(concept_id="known", mastery=0.95, last_reviewed_at=NOW - timedelta(days=1))
    ranked = recommend.rank([known, unknown])
    assert ranked[0].concept_id == "new"


def test_goal_relevance_promotes_a_concept():
    on_goal = signal(concept_id="goal", goal_relevance=1.0)
    off_goal = signal(concept_id="other")
    ranked = recommend.rank([off_goal, on_goal])
    assert ranked[0].concept_id == "goal"
    assert any("goal" in reason.lower() for reason in ranked[0].reasons)


def test_every_recommendation_carries_a_reason():
    for item in recommend.rank([signal(), signal(concept_id="c2", mastery=0.0, last_reviewed_at=None)]):
        assert item.reasons, "a recommendation without a reason is unexplained personalisation"


def test_review_queue_contains_only_decayed_concepts():
    due = signal(concept_id="due", last_reviewed_at=NOW - timedelta(days=120))
    fresh = signal(concept_id="fresh", last_reviewed_at=NOW)
    queue = recommend.review_queue([due, fresh])
    assert [item.concept_id for item in queue] == ["due"]
    assert queue[0].forgetting_risk > 0.1


def test_weakness_profile_ranks_studied_weak_concepts():
    weak = signal(concept_id="weak", mastery=0.2, last_reviewed_at=NOW - timedelta(days=2))
    strong = signal(concept_id="strong", mastery=0.9, last_reviewed_at=NOW - timedelta(days=2))
    unstudied = signal(concept_id="unseen", mastery=0.0, last_reviewed_at=None)
    profile = recommend.weakness_profile([weak, strong, unstudied])
    # Unstudied concepts are not weaknesses: there is no evidence yet.
    assert [item.concept_id for item in profile] == ["weak"]


def test_next_lessons_is_limited_and_ordered():
    items = [signal(concept_id=f"c{i}", mastery=i / 10) for i in range(6)]
    shortlist = recommend.next_lessons(items, limit=3)
    assert len(shortlist) == 3
    assert shortlist == sorted(shortlist, key=lambda item: item.score, reverse=True)
