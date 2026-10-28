"""One account must never see another account's learning.

This is the test file that matters commercially: the product's promise is that a
learner's profile, progress and evidence are theirs. Every endpoint either reads
from the session's user or refuses, and the checks below go through the public
HTTP surface rather than trusting the handler code to look right.

The approach: build two independent learners, give one of them data of every kind
the app can store, then ask every read endpoint the other learner has access to
and assert it returns nothing of the first's. Then attempt the direct-object
attacks — a known id passed as somebody else.
"""

from __future__ import annotations

import uuid

import pytest


def _register(client, suffix: str) -> str:
    # A unique address per call: these tests register repeatedly against one
    # session database, and a reused address is a duplicate-account 422.
    email = f"isolation-{suffix}-{uuid.uuid4().hex[:8]}@example.test"
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "correct horse battery", "display_name": suffix.title()},
    )
    assert response.status_code == 200, response.text
    return email


@pytest.fixture()
def owner(client):
    """A learner with a filled-in profile and history."""
    _register(client, "owner")
    assert client.post("/api/profile/baseline").status_code == 200
    client.put("/api/profile", json={"context": "Owner's private context."})

    concept = client.get("/api/knowledge").json()["concepts"][0]
    question = client.get(f"/api/concepts/{concept['concept_id']}/questions").json()["questions"][0]
    answered = client.post(
        "/api/answers",
        json={"question_id": question["id"], "choice_index": 0, "confidence": 3, "latency_ms": 1200},
    )
    assert answered.status_code == 200, answered.text

    goal = client.post("/api/goals", json={"title": "Owner's exam in May", "concept_ids": [concept["concept_id"]]})
    assert goal.status_code == 200, goal.text
    assessment_id = client.get("/api/profile").json()["assessments"][0]["id"]
    return {
        "concept_id": concept["concept_id"],
        "goal_id": goal.json()["id"],
        "assessment_id": assessment_id,
    }


@pytest.fixture()
def stranger(client):
    """A second learner on the same deployment, with nothing of their own."""
    return _register(client, "stranger")


def test_a_new_learner_sees_no_profile_or_history(client, owner, stranger):
    profile = client.get("/api/profile").json()
    assert profile["learner"]["email"] == stranger
    assert profile["context"] == ""
    assert profile["assessments"] == []
    assert all(axis["missing"] for axis in profile["axes"])


def test_goals_are_scoped_to_their_owner(client, owner, stranger):
    assert client.get("/api/goals").json()["goals"] == []


def test_a_stranger_cannot_archive_another_learners_assessment(client, owner, stranger):
    # The stranger cannot see any assessment id, which is the point. The direct
    # object attempt still has to fail rather than confirm the record exists.
    assert client.get("/api/profile").json()["assessments"] == []
    for assessment_id in ["0" * 32, "f" * 32, "deadbeef"]:
        response = client.post(
            f"/api/profile/assessments/{assessment_id}/archive", json={"reason": "not mine"}
        )
        assert response.status_code == 404, (assessment_id, response.text)
        assert response.json()["detail"] == "assessment not found"


def test_knowledge_state_is_per_learner(client, owner, stranger):
    """Mastery is stored per (learner, concept): two learners, two states."""
    metrics = client.get("/api/knowledge").json()["concepts"]
    # Every concept reads as untouched for the stranger, because the owner's
    # answers belong to the owner.
    assert all(row["reps"] == 0 for row in metrics)
    assert all(row["mastery"] == 0 for row in metrics)


def test_review_queue_is_empty_for_a_learner_who_has_reviewed_nothing(client, owner, stranger):
    today = client.get("/api/today?available_minutes=30").json()
    review_items = [item for item in today["items"] if item["kind"] == "review"]
    assert review_items == []


def test_competency_is_computed_from_one_learners_evidence(client, owner, stranger):
    """The stranger must not inherit the owner's verdict, its numbers or its gaps.

    A shared competency screen is the most tempting place to leak this: one global
    aggregate is easy to compute and would tell every learner that somebody else's
    answers are theirs.
    """
    stranger_payload = client.get("/api/competency").json()
    assert stranger_payload["counts"]["observations"] == 0
    assert stranger_payload["counts"]["with_evidence"] == 0
    assert stranger_payload["verdicts"]["secure"] == 0
    # Unmeasured is `null`, not a borrowed 0.0 or the owner's score.
    assert all(row["evidence"]["score"] is None for row in stranger_payload["concepts"])

    # The concept detail is readable (it is catalogue material) but empty.
    detail = client.get(f"/api/competency/{owner['concept_id']}").json()
    assert detail["evidence"]["observations"] == 0
    assert detail["observation_log"] == []


def test_a_stranger_cannot_reassess_another_learners_submission(client, owner, stranger):
    blocked = client.post(
        f"/api/profile/assessments/{owner['assessment_id']}/reassess",
        json={"scores": [{"axis": "dimension", "name": "mindset", "value": 50.0}]},
    )
    assert blocked.status_code == 404
    assert blocked.json()["detail"] == "assessment not found"

    history = client.get(f"/api/profile/assessments/{owner['assessment_id']}/history")
    assert history.status_code == 404

    # And nothing was written into the stranger's own account by the attempt.
    assert client.get("/api/profile").json()["assessments"] == []


def test_tutor_threads_are_owner_scoped(client, owner, stranger):
    assert client.get("/api/tutor/threads").json()["threads"] == []
    # A guessed thread id is a 404, not an empty transcript that confirms it exists.
    assert client.get("/api/tutor/threads/does-not-exist").status_code == 404
    assert client.delete("/api/tutor/threads/does-not-exist").status_code == 404


def test_the_session_cookie_is_the_only_identity_and_it_is_not_reusable(client, owner, stranger):
    """Signing out must invalidate the token, not just clear the browser's copy.

    The token lives in the database, so dropping the cookie client-side is not
    enough: a copied token must stop working.
    """
    assert api_me(client).status_code == 200
    token = client.cookies.get("ts_session")
    assert token

    assert client.post("/api/auth/logout").status_code == 200
    assert api_me(client).status_code == 401

    # Replaying the old token directly must fail too.
    replay = client.get("/api/auth/me", cookies={"ts_session": token})
    assert replay.status_code == 401


def test_another_learners_identifier_does_not_reveal_an_account(client, owner, stranger):
    """Sign-in does not distinguish 'no such account' from 'wrong password'."""
    missing = client.post("/api/auth/login", json={"email": "nobody-here@example.test", "password": "x" * 20})
    wrong = client.post("/api/auth/login", json={"email": stranger, "password": "x" * 20})
    assert missing.status_code == wrong.status_code == 401
    assert missing.json()["detail"] == wrong.json()["detail"]


def api_me(client):
    return client.get("/api/auth/me")
