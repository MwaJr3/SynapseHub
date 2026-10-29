"""The daily plan must not cost a query per concept.

Measured before the fix, on this machine, with 200 concepts for one learner:

    all_signals (per-concept loop): 1200 queries, ~299 ms
    all_signals (bulk):                4 queries,  ~14 ms

The rewrite is only worth anything if it computes the same thing, so the first
test here is equivalence against the per-concept path, and the second is the query
budget. A performance claim without a behaviour proof is a rewrite, not a fix; a
behaviour proof without a budget is a fix that grows back.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app import learner
from app.database import Base
from app.library import visible_concepts
from app.models import Concept, ConceptEdge, ConceptState, Goal, User


@pytest.fixture()
def dataset():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine, expire_on_commit=False)()
    user = User(email="bulk@example.test", password_hash="x")
    db.add(user)
    db.flush()

    now = datetime.now(timezone.utc)
    for index in range(40):
        concept_id = f"bulk.{index}"
        db.add(
            Concept(
                id=concept_id,
                title=f"Concept {index}",
                subject="Bulk",
                difficulty=2.0 + (index % 4),
                ordering=index,
            )
        )
        db.flush()
        if index:
            db.add(
                ConceptEdge(
                    id=f"edge-{index}",
                    from_concept_id=f"bulk.{index - 1}",
                    to_concept_id=concept_id,
                    relation="prerequisite",
                )
            )
        if index % 3 == 0:
            db.add(
                ConceptState(
                    user_id=user.id,
                    concept_id=concept_id,
                    mastery=0.3,
                    stability_days=2.5,
                    difficulty=3.0,
                    reps=2,
                    lapses=index % 2,
                    last_reviewed_at=now - timedelta(days=index % 7),
                    next_review_at=now - timedelta(days=1),
                )
            )
    db.add(Goal(user_id=user.id, title="goal", concept_ids=["bulk.3", "bulk.7"]))
    db.commit()
    yield db, user, engine
    db.close()


def test_bulk_signals_agree_with_the_per_concept_path(dataset):
    db, user, _engine = dataset
    now = datetime.now(timezone.utc)

    bulk = learner.all_signals(db, user, now=now)
    concepts = visible_concepts(db, user).all()
    one_by_one = [learner.concept_signal(db, user, concept, now=now) for concept in concepts]

    assert [signal.concept_id for signal in bulk] == [signal.concept_id for signal in one_by_one]
    for fast, slow in zip(bulk, one_by_one):
        assert fast == slow, f"bulk signal differs for {fast.concept_id}"


def test_the_signal_query_count_does_not_grow_with_the_number_of_concepts(dataset):
    db, user, engine = dataset
    counter = {"queries": 0}

    @event.listens_for(engine, "before_cursor_execute")
    def _count(*_args, **_kwargs):
        counter["queries"] += 1

    try:
        learner.all_signals(db, user, now=datetime.now(timezone.utc))
        with_forty = counter["queries"]

        # Twenty more concepts: the count must not move. Before the rewrite this
        # would have added roughly 120 queries.
        for index in range(40, 60):
            db.add(
                Concept(
                    id=f"bulk.{index}",
                    title=f"Concept {index}",
                    subject="Bulk",
                    difficulty=3.0,
                    ordering=index,
                )
            )
        db.commit()
        counter["queries"] = 0
        learner.all_signals(db, user, now=datetime.now(timezone.utc))
        with_sixty = counter["queries"]
    finally:
        event.remove(engine, "before_cursor_execute", _count)

    assert with_forty == with_sixty, f"{with_forty} -> {with_sixty} queries as concepts grew"
    assert with_sixty <= 8, f"{with_sixty} queries for 60 concepts is more than a constant budget"


def test_private_concepts_from_another_learner_are_excluded_from_signals(dataset):
    """The bulk path is where a missing filter would leak quietly."""
    db, user, _engine = dataset
    other = User(email="other@example.test", password_hash="x")
    db.add(other)
    db.flush()
    db.add(
        Concept(
            id="own.theirs",
            owner_id=other.id,
            title="Their private concept",
            subject="Private",
            difficulty=3.0,
            ordering=0,
        )
    )
    db.commit()

    ids = {signal.concept_id for signal in learner.all_signals(db, user)}
    assert "own.theirs" not in ids
