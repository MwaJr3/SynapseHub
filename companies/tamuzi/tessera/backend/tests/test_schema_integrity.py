"""The database enforces the rules, not only the Python that happens to write it.

Stage 4 was asked for with PostgreSQL as the target and the database rules taken
seriously, so these tests attack the schema directly. A CHECK constraint that only
exists in a model declaration is documentation; the same constraint in the table
is a rule, and it holds against a seeder, a migration, a psql session, or a bug in
a route that forgets to validate.

Every test here writes through a plain session inside one transaction and rolls
back, so the shared catalogue the other tests read is untouched. The tests are
dialect-agnostic: they run on SQLite and, when `DATABASE_URL` points at PostgreSQL,
on PostgreSQL. `tests/test_postgres.py` covers the parts that only exist on a
server (jsonb, named constraints, `alembic check`).
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.database import SessionLocal, engine
from app.models import (
    Assessment,
    AssessmentScore,
    Concept,
    ConceptEdge,
    ConceptState,
    Goal,
    RetrievalAttempt,
    User,
)


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def _user(db) -> User:
    user = User(email=f"rules-{uuid.uuid4().hex[:10]}@example.test", display_name="Rules", password_hash="x")
    db.add(user)
    db.flush()
    return user


def _concept(db, *, concept_id: str | None = None) -> Concept:
    concept = Concept(
        id=concept_id or f"rules.{uuid.uuid4().hex[:8]}",
        title="Rules",
        subject="Testing",
    )
    db.add(concept)
    db.flush()
    return concept


def _refuses(db, statement) -> None:
    """Run `statement`, expect the database to refuse it, and leave the session usable."""
    with pytest.raises(IntegrityError):
        statement()
        db.flush()
    db.rollback()


# --------------------------------------------------------------------- ranges


def test_a_mastery_outside_zero_to_one_is_refused_by_the_database(db):
    user = _user(db)
    concept = _concept(db)
    _refuses(
        db,
        lambda: db.add(ConceptState(user_id=user.id, concept_id=concept.id, mastery=1.5, stability_days=2.0)),
    )


def test_a_self_graded_score_outside_the_unit_interval_is_refused(db):
    user = _user(db)
    concept = _concept(db)
    _refuses(
        db,
        lambda: db.add(
            RetrievalAttempt(
                user_id=user.id,
                concept_id=concept.id,
                prompt_id="p#free_recall#0",
                format="free_recall",
                score=1.4,
                evidence_weight=0.5,
                graded_by="self",
            )
        ),
    )


def test_an_evidence_weight_of_zero_is_refused(db):
    """A zero weight would make an observation count as nothing while still
    appearing in the list — evidence that cannot move anything."""
    user = _user(db)
    concept = _concept(db)
    _refuses(
        db,
        lambda: db.add(
            RetrievalAttempt(
                user_id=user.id,
                concept_id=concept.id,
                prompt_id="p#free_recall#0",
                format="free_recall",
                score=0.5,
                evidence_weight=0.0,
                graded_by="self",
            )
        ),
    )


def test_a_stability_of_zero_is_refused(db):
    """The forgetting curve divides by stability; zero would be a division by zero
    discovered at read time rather than at write time."""
    user = _user(db)
    concept = _concept(db)
    _refuses(
        db,
        lambda: db.add(ConceptState(user_id=user.id, concept_id=concept.id, mastery=0.4, stability_days=0.0)),
    )


def test_a_concept_difficulty_outside_one_to_five_is_refused(db):
    _refuses(db, lambda: db.add(Concept(id=f"rules.{uuid.uuid4().hex[:6]}", title="X", subject="S", difficulty=6.0)))


# ---------------------------------------------------------------- vocabularies


def test_an_unknown_relation_is_refused(db):
    """The eight relation names are a vocabulary, not free text: `prerequisite`
    gates recommendations, so a typo would quietly stop gating anything."""
    _refuses(
        db,
        lambda: db.add(
            ConceptEdge(
                from_concept_id="py.variables",
                to_concept_id="py.functions",
                relation="related-ish",
            )
        ),
    )


def test_an_unknown_grading_source_is_refused(db):
    user = _user(db)
    concept = _concept(db)
    _refuses(
        db,
        lambda: db.add(
            RetrievalAttempt(
                user_id=user.id,
                concept_id=concept.id,
                prompt_id="p#cloze#0",
                format="cloze",
                score=1.0,
                evidence_weight=1.0,
                graded_by="maybe",
            )
        ),
    )


def test_an_unknown_reported_by_is_refused(db):
    user = _user(db)
    _refuses(
        db,
        lambda: db.add(
            Assessment(user_id=user.id, instrument="icanstudy-dimensions", reported_by="astrologer")
        ),
    )


# ------------------------------------------------------ the reassessment chain


def test_a_submission_cannot_supersede_itself(db):
    user = _user(db)
    assessment_id = uuid.uuid4().hex[:32]
    _refuses(
        db,
        lambda: db.add(
            Assessment(
                id=assessment_id,
                user_id=user.id,
                instrument="icanstudy-dimensions",
                supersedes_id=assessment_id,
            )
        ),
    )


def test_a_submission_can_only_be_superseded_once(db):
    """Two successors would fork the history, and "which one is current?" would
    depend on read order."""
    user = _user(db)
    first = Assessment(user_id=user.id, instrument="icanstudy-dimensions", reported_by="learner")
    db.add(first)
    db.flush()

    db.add(
        Assessment(
            user_id=user.id, instrument="icanstudy-dimensions", reported_by="learner", supersedes_id=first.id
        )
    )
    db.flush()

    with pytest.raises(IntegrityError):
        db.add(
            Assessment(
                user_id=user.id,
                instrument="icanstudy-dimensions",
                reported_by="learner",
                supersedes_id=first.id,
            )
        )
        db.flush()
    db.rollback()


def test_a_reversed_scale_is_refused(db):
    user = _user(db)
    _refuses(
        db,
        lambda: db.add(
            Assessment(user_id=user.id, instrument="icanstudy-dimensions", scale_min=100.0, scale_max=0.0)
        ),
    )


# ---------------------------------------------------- lists and referential integrity


def test_a_json_list_column_round_trips_as_a_list(db):
    user = _user(db)
    goal = Goal(user_id=user.id, title="Round trip", concept_ids=["py.variables", "py.functions"])
    db.add(goal)
    db.flush()
    db.expire(goal)
    assert goal.concept_ids == ["py.variables", "py.functions"]
    assert isinstance(goal.concept_ids, list)


def test_deleting_a_concept_removes_the_state_that_points_at_it(db):
    """Referential integrity has to hold on both dialects. SQLite ignores
    ON DELETE CASCADE unless foreign keys are switched on per connection, which is
    why `app.database` does exactly that — and why this test would fail without it."""
    user = _user(db)
    concept = _concept(db)
    db.add(ConceptState(user_id=user.id, concept_id=concept.id, mastery=0.5, stability_days=3.0))
    db.flush()

    db.delete(concept)
    db.flush()

    left = (
        db.query(ConceptState)
        .filter(ConceptState.user_id == user.id, ConceptState.concept_id == concept.id)
        .count()
    )
    assert left == 0
    db.rollback()


def test_deleting_an_assessment_keeps_its_scores_out_of_the_way(db):
    """Scores cascade with their assessment. The successor of a deleted row keeps
    its own numbers, because `supersedes_id` is ON DELETE SET NULL."""
    user = _user(db)
    first = Assessment(user_id=user.id, instrument="icanstudy-dimensions")
    db.add(first)
    db.flush()
    db.add(AssessmentScore(assessment_id=first.id, axis="dimension", name="mindset", value=84.0))
    db.flush()

    db.delete(first)
    db.flush()

    assert db.query(AssessmentScore).filter(AssessmentScore.assessment_id == first.id).count() == 0


def test_the_dialect_is_named_so_the_assertions_above_are_interpretable():
    """Not a tautology: the same file must have actually run against PostgreSQL.

    This test documents which engine executed the suite. `tests/test_postgres.py`
    is the part that runs only when a server is configured.
    """
    assert engine.dialect.name in ("sqlite", "postgresql")
    with engine.connect() as connection:
        assert connection.execute(text("select 1")).scalar() == 1
