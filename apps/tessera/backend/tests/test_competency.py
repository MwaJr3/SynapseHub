"""Competency: evidence apart from mastery, and gaps that explain themselves.

The tests in this file are about what the analytics screen is allowed to claim:

* a concept nobody has answered is *unmeasured*, not zero, and is never averaged
  into a score that implies weakness;
* the verdict is computed from evidence, and the stored mastery is reported next
  to it rather than merged with it;
* self-graded evidence is real but counts half, and no amount of it can produce a
  "secure" verdict without one answer the server checked;
* every gap states a reason, the numbers behind it, and the action that changes it;
* one learner's evidence is invisible to another, through HTTP.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app import competency
from app.competency import Observation

CONCEPT = "py.variables"


def _new_learner(client) -> str:
    email = f"comp-{uuid.uuid4().hex[:8]}@example.test"
    assert client.post(
        "/api/auth/register",
        json={"email": email, "password": "correct horse battery", "display_name": "Learner"},
    ).status_code == 200
    return email


def _answer_question(client, concept_id: str = CONCEPT, *, choice: int = 0, confidence: int = 3):
    question = client.get(f"/api/concepts/{concept_id}/questions").json()["questions"][0]
    response = client.post(
        "/api/answers",
        json={"question_id": question["id"], "choice_index": choice, "confidence": confidence, "latency_ms": 800},
    )
    assert response.status_code == 200, response.text
    return response.json()


def _practise(client, concept_id: str = CONCEPT, *, checked: list[int] | None = None):
    """One self-graded free-recall attempt through the real endpoint."""
    prompt = client.get(f"/api/review/{concept_id}/prompt?format=free_recall&seed=0&reveal=true").json()
    response = client.post(
        "/api/review/attempts",
        json={"prompt_id": prompt["prompt_id"], "answer": "something I remember", "checked": checked or []},
    )
    assert response.status_code == 201, response.text
    return response.json()


def _pure(observations: list[Observation], now: datetime) -> dict:
    return competency.summarise(observations, now=now)


def _obs(days_ago: float = 0.0, *, score: float = 1.0, graded_by: str = "auto", weight: float = 1.0) -> Observation:
    return Observation(
        id=f"obs-{days_ago}-{score}-{graded_by}",
        source="retrieval",
        at=datetime.now(timezone.utc) - timedelta(days=days_ago),
        score=score,
        weight=weight,
        graded_by=graded_by,
        format="free_recall" if graded_by == "self" else "multiple_choice",
    )


# ---------------------------------------------------------- unmeasured ≠ zero


def test_a_concept_with_no_answers_is_unmeasured_not_zero(client):
    _new_learner(client)
    payload = client.get("/api/competency").json()

    assert payload["counts"]["observations"] == 0
    assert payload["counts"]["without_evidence"] == payload["counts"]["concepts"]
    assert payload["verdicts"]["no_evidence"] == payload["counts"]["concepts"]

    for row in payload["concepts"]:
        assert row["verdict"] == "no_evidence"
        # The load-bearing assertion: no evidence produces `None`, never 0.0.
        assert row["evidence"]["score"] is None
        assert row["evidence"]["effective"] == 0.0
        assert row["mastery"] is None
        assert row["disagreement"] is None

    assert "unmeasured" in payload["concepts"][0]["verdict_reason"].lower()
    assert payload["coverage_note"].endswith("are reported as unmeasured.")


def test_the_overview_never_averages_an_absent_score_into_a_verdict(client):
    """One answered concept, nine unmeasured: nothing outside it gains a score."""
    _new_learner(client)
    _answer_question(client)
    payload = client.get("/api/competency").json()

    measured = [row for row in payload["concepts"] if row["evidence"]["observations"] > 0]
    unmeasured = [row for row in payload["concepts"] if row["evidence"]["observations"] == 0]
    assert len(measured) == 1
    assert len(unmeasured) == payload["counts"]["concepts"] - 1
    assert all(row["evidence"]["score"] is None for row in unmeasured)


# ------------------------------------------------- evidence apart from mastery


def test_the_two_numbers_are_reported_separately(client):
    _new_learner(client)
    _answer_question(client)
    row = next(
        item for item in client.get("/api/competency").json()["concepts"] if item["concept_id"] == CONCEPT
    )

    # Evidence describes the answers; mastery is the scheduler's estimate. They
    # are separate objects with separate provenance, not two views of one number.
    assert row["evidence"]["observations"] == 1
    assert row["evidence"]["auto"] == 1
    assert row["mastery"] is not None
    assert row["mastery"]["source"].startswith("scheduler state")
    assert row["mastery"]["reps"] == 1
    assert "merged" in client.get("/api/competency").json()["policy"]


def test_evidence_fades_and_one_answer_is_not_confidence():
    now = datetime.now(timezone.utc)
    fresh = _pure([_obs(0)], now)
    month_old = _pure([_obs(30)], now)

    assert fresh["effective"] == 1.0
    # Half-life of thirty days: the same answer a month later is worth half.
    assert month_old["effective"] == 0.5
    # Confidence is about how much was seen, not how good it was.
    assert fresh["confidence"] < 0.4
    assert competency.recency(0) == 1.0
    assert competency.recency(60) == pytest.approx(0.25, abs=1e-6)


def test_a_verdict_needs_a_server_checked_answer():
    now = datetime.now(timezone.utc)
    self_graded = _pure([_obs(graded_by="self", weight=0.5) for _ in range(4)], now)
    label, reason = competency.verdict(self_graded, now=now)
    assert self_graded["score"] == 1.0
    assert self_graded["auto"] == 0
    # Four perfect self-graded recollections are still not "secure": nothing was
    # checked against the source.
    assert label == "developing"
    assert "checked by the server" not in reason

    server_graded = _pure([_obs() for _ in range(3)], now)
    label, reason = competency.verdict(server_graded, now=now)
    assert server_graded["auto"] == 3
    assert label == "secure"
    assert "3 checked by the server" in reason


def test_self_graded_evidence_carries_half_weight_through_the_api(client):
    _new_learner(client)
    _practise(client, checked=[])
    row = next(
        item for item in client.get("/api/competency").json()["concepts"] if item["concept_id"] == CONCEPT
    )

    assert row["evidence"]["observations"] == 1
    assert row["evidence"]["self"] == 1
    assert row["evidence"]["auto"] == 0
    assert row["evidence"]["effective"] == 0.5
    kinds = {gap["kind"] for gap in row["gaps"]}
    assert {"thin_evidence", "self_graded_only"} <= kinds
    assert row["verdict"] == "emerging"


def test_mastery_and_evidence_disagreeing_is_reported_with_its_size():
    now = datetime.now(timezone.utc)
    evidence = _pure([_obs(0.0, score=0.2, graded_by="auto")], now)
    mastery = {"value": 0.9, "retained": 0.85, "scale_min": 0.0, "scale_max": 1.0}
    compare = competency.disagreement(evidence, mastery)

    assert compare["contested"] is True
    assert compare["direction"] == "optimistic"
    assert compare["gap"] == pytest.approx(0.70, abs=1e-6)
    assert "above" in compare["reason"]

    close = {"value": 0.25, "retained": 0.25, "scale_min": 0.0, "scale_max": 1.0}
    assert competency.disagreement(evidence, close) is None


# --------------------------------------------------------------- calibration


def test_calibration_says_there_is_nothing_to_calibrate_yet(client):
    _new_learner(client)
    calibration = client.get("/api/competency").json()["calibration"]

    assert calibration["answered"] == 0
    # No accuracy of 0.0 invented from an empty table.
    assert calibration["accuracy"] is None
    assert calibration["overconfidence"] is None
    assert calibration["buckets"] == []
    assert "No multiple-choice answers" in calibration["reason"]


def test_overconfidence_is_computed_from_answers_not_assumed(client):
    _new_learner(client)
    _answer_question(client, choice=0, confidence=5)
    calibration = client.get("/api/competency").json()["calibration"]

    assert calibration["answered"] == 1
    assert calibration["mean_confidence"] == 1.0  # 5 on a 1..5 scale normalises to 1.0
    assert calibration["buckets"] == [{"confidence": 5, "answered": 1, "accuracy": 0.0}]
    # If the answer happened to be right, confidence and accuracy agree; if not,
    # the gap is positive because the learner was more sure than they were right.
    expected = 1.0 - calibration["accuracy"]
    assert calibration["overconfidence"] == pytest.approx(expected, abs=1e-3)
    assert calibration["overconfidence"] >= 0.0


# ---------------------------------------------------------------------- gaps


def test_every_gap_states_a_reason_an_action_and_where_it_applies(client):
    _new_learner(client)
    payload = client.get("/api/competency").json()
    assert payload["gaps"], "a fresh account has gaps: every axis is unscored"
    assert payload["gaps_total"] >= len(payload["gaps"])

    severities = [gap["severity"] for gap in payload["gaps"]]
    assert severities == sorted(severities, reverse=True)

    for gap in payload["gaps"]:
        assert gap["reason"].strip()
        assert gap["action"].strip()
        assert 0.0 <= gap["severity"] <= 1.0
        assert gap["type"] in ("concept", "axis", "axes")
        if gap["type"] == "concept":
            assert gap["concept_id"]
        elif gap["type"] == "axis":
            assert gap["name"] and gap["instrument"]
        else:
            assert gap["axes"] and all(item["instrument"] for item in gap["axes"])


def test_a_missing_axis_is_a_gap_not_a_zero(client):
    _new_learner(client)
    payload = client.get("/api/competency").json()

    unmeasured = next(gap for gap in payload["gaps"] if gap["kind"] == "unmeasured_axes")
    by_axis = {item["name"]: item for item in unmeasured["axes"]}
    assert "self_management" in by_axis
    assert "10 of 10 baseline axes have no score" in unmeasured["reason"]
    assert "Nothing has been estimated" in unmeasured["reason"]
    # The instrument that would fill each one is named, so the form can be opened
    # from the gap rather than from a list the client has to guess at.
    assert by_axis["self_management"]["instrument"] == "icanstudy-dimensions"
    # A missing axis never appears as a zero-filled row anywhere in the payload.
    assert all(axis["missing"] for axis in client.get("/api/profile").json()["axes"])


# -------------------------------------------------------------------- detail


def test_a_concept_detail_lists_its_observations_newest_first(client):
    _new_learner(client)
    _practise(client, checked=[])
    _answer_question(client)

    detail = client.get(f"/api/competency/{CONCEPT}").json()
    assert len(detail["observation_log"]) == 2
    stamps = [item["at"] for item in detail["observation_log"]]
    assert stamps == sorted(stamps, reverse=True)
    assert {item["source"] for item in detail["observation_log"]} == {"quiz", "retrieval"}
    # The weight each observation carried is shown, not implied.
    assert {item["weight"] for item in detail["observation_log"]} == {0.5, 1.0}
    assert detail["what_would_change_it"]


def test_another_learners_competency_is_invisible(client):
    _new_learner(client)
    _answer_question(client)
    mine = client.get("/api/competency").json()["counts"]["observations"]
    assert mine == 1

    _new_learner(client)  # a different account in the same client
    theirs = client.get("/api/competency").json()
    assert theirs["counts"]["observations"] == 0
    assert all(row["evidence"]["observations"] == 0 for row in theirs["concepts"])

    # Their own concept still resolves; a concept they cannot see does not.
    assert client.get(f"/api/competency/{CONCEPT}").status_code == 200
    assert client.get("/api/competency/not-a-concept").status_code == 404


# -------------------------------------------------------------- query budget


def test_the_overview_costs_a_fixed_number_of_queries():
    """The screen reads every concept, so its cost must not grow per concept.

    Measured on an in-memory database with a learner of the learner's own
    concepts. The budget is a constant: the point is that adding concepts and
    attempts does not add round trips.
    """
    from sqlalchemy import create_engine, event
    from sqlalchemy.orm import sessionmaker

    from app.database import Base
    from app.models import Attempt, Concept, User

    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine, expire_on_commit=False)()
    user = User(email="budget@example.test", password_hash="x")
    db.add(user)
    db.flush()

    def build(start: int, stop: int) -> None:
        for index in range(start, stop):
            concept_id = f"budget.{index}"
            db.add(Concept(id=concept_id, title=f"C{index}", subject="Budget", ordering=index))
            db.flush()
            db.add(
                Attempt(
                    user_id=user.id,
                    concept_id=concept_id,
                    correct=index % 2 == 0,
                    confidence=3,
                    latency_ms=500,
                )
            )
        db.commit()

    counter = {"queries": 0}

    def _count(*_args, **_kwargs) -> None:
        counter["queries"] += 1

    build(0, 20)
    event.listen(engine, "before_cursor_execute", _count)
    try:
        competency.overview(db, user)
        with_twenty = counter["queries"]
        build(20, 60)
        counter["queries"] = 0
        payload = competency.overview(db, user)
        with_sixty = counter["queries"]
    finally:
        event.remove(engine, "before_cursor_execute", _count)

    assert len(payload["concepts"]) == 60
    assert with_twenty == with_sixty, f"{with_twenty} -> {with_sixty} queries as concepts grew"
    assert with_sixty <= 10, f"{with_sixty} queries for 60 concepts is more than a constant budget"
    db.close()
