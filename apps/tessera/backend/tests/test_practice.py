"""Retrieval practice: prompts, grading, evidence and the due queue.

The tests that matter here are the ones about honesty:

* a prompt response never contains the expected answer;
* a self-graded attempt moves the schedule less than a server-graded one;
* a partially correct cloze is worth something, and a wrong word is worth nothing;
* the queue explains itself with the numbers it was ordered by;
* recovery mode limits today's work without rewriting anybody's schedule;
* a queue item for a concept the learner cannot see never appears.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app import learner, practice, review, srs
from app.models import ConceptState, RetrievalAttempt, User


def _new_learner(client) -> str:
    email = f"practice-{uuid.uuid4().hex[:8]}@example.test"
    assert client.post(
        "/api/auth/register",
        json={"email": email, "password": "correct horse battery", "display_name": "Learner"},
    ).status_code == 200
    return email


@pytest.fixture()
def studied(client):
    """A learner who has answered one question, so the concept is scheduled."""
    _new_learner(client)
    concept_id = "py.variables"
    question = client.get(f"/api/concepts/{concept_id}/questions").json()["questions"][0]
    # Answering through the real endpoint is what puts the concept in the queue;
    # writing ConceptState rows directly would test a state the app cannot reach.
    for _ in range(1):
        client.post(
            "/api/answers",
            json={"question_id": question["id"], "choice_index": 0, "confidence": 3, "latency_ms": 900},
        )
    return concept_id


# ------------------------------------------------------------------- prompts


def test_a_prompt_never_contains_the_expected_answer(client, studied):
    """The cloze key stays on the server. If it leaked, the exercise would be a
    reading comprehension task with the answer printed above it."""
    prompt = client.get(f"/api/review/{studied}/prompt?format=cloze&seed=0").json()
    assert prompt["format"] == "cloze"
    assert "_____" in prompt["prompt"]
    assert prompt["graded_by"] == "auto"
    # No field of the response carries the blanked term.
    assert "expected" not in prompt
    assert "answer" not in prompt

    # The key does come back after answering — that is the point of answering.
    answered = client.post(
        "/api/review/attempts", json={"prompt_id": prompt["prompt_id"], "answer": "definitely-wrong"}
    )
    assert answered.status_code == 201
    assert answered.json()["attempt"]["expected"]


def test_cloze_grading_accepts_the_term_and_its_inflection_but_not_another_word(client, studied):
    prompt = client.get(f"/api/review/{studied}/prompt?format=cloze&seed=0").json()

    # Learn the expected term the way a learner does: answer once, and the result
    # says what the source had. No database poking to reconstruct the key.
    first = client.post(
        "/api/review/attempts", json={"prompt_id": prompt["prompt_id"], "answer": "bafflegab"}
    ).json()
    expected = first["attempt"]["expected"]
    assert first["attempt"]["score"] == 0.0
    assert expected in first["explanation"]

    exact = client.post(
        "/api/review/attempts", json={"prompt_id": prompt["prompt_id"], "answer": expected}
    ).json()
    assert exact["attempt"]["score"] == 1.0
    assert exact["attempt"]["correct"] is True

    # An inflection of the same word is the same knowledge, at reduced credit.
    inflection = client.post(
        "/api/review/attempts",
        json={"prompt_id": prompt["prompt_id"], "answer": expected[:-1]},
    ).json()
    assert 0.0 < inflection["attempt"]["score"] <= 0.75
    # Above the 0.7 threshold the term counts as produced — the recorded score is
    # what preserves the difference, so the history does not claim it was exact.
    assert inflection["attempt"]["correct"] is True
    assert inflection["attempt"]["score"] < 1.0


def test_free_recall_hides_its_criteria_until_asked(client, studied):
    """Showing the source lines before the answer would turn recall into copying."""
    hidden = client.get(f"/api/review/{studied}/prompt?format=free_recall&seed=0").json()
    assert hidden["criteria"] == []
    assert hidden["criteria_hidden"] is True

    revealed = client.get(f"/api/review/{studied}/prompt?format=free_recall&seed=0&reveal=true").json()
    assert revealed["criteria"]
    assert len(revealed["criteria"]) <= practice.MAX_CRITERIA


def test_a_cued_prompt_shows_its_criteria_immediately_because_it_is_the_cue(client, studied):
    prompt = client.get(f"/api/review/{studied}/prompt?format=cued_recall&seed=0").json()
    assert prompt["criteria"]
    assert prompt["graded_by"] == "self"
    assert prompt["evidence_weight"] == 0.5


def test_the_suggested_format_rotates_and_respects_what_the_material_supports(client, studied):
    first = client.get(f"/api/review/{studied}/prompt?format=free_recall&seed=0").json()
    assert "multiple_choice" in first["available_formats"]
    assert set(first["available_formats"]) <= set(practice.FORMAT_EVIDENCE)
    assert first["suggested_format"] in first["available_formats"]


def test_an_unknown_format_is_refused_with_the_valid_names(client, studied):
    response = client.get(f"/api/review/{studied}/prompt?format=interpretive_dance")
    assert response.status_code == 422
    assert "multiple_choice" in response.json()["detail"]


def test_a_malformed_prompt_id_cannot_be_used_to_reach_another_concept(client, studied):
    response = client.post("/api/review/attempts", json={"prompt_id": "nonsense", "answer": "x"})
    assert response.status_code == 422


# ------------------------------------------------------------------ evidence


def test_a_correct_cloze_extends_the_interval_and_records_the_attempt(client, studied):
    prompt = client.get(f"/api/review/{studied}/prompt?format=cloze&seed=0").json()
    key = client.post(
        "/api/review/attempts", json={"prompt_id": prompt["prompt_id"], "answer": "bafflegab"}
    ).json()["attempt"]["expected"]

    graded = client.post(
        "/api/review/attempts",
        json={"prompt_id": prompt["prompt_id"], "answer": key, "latency_ms": 4200},
    )
    assert graded.status_code == 201, graded.text
    body = graded.json()
    assert body["attempt"]["score"] == 1.0
    assert body["attempt"]["graded_by"] == "auto"
    assert body["attempt"]["evidence_weight"] == 1.0
    assert body["model"]["interval_days"] > 0
    assert body["next"]["next_review_at"]
    assert "server-graded" in body["next"]["reasons"][0]
    assert body["attempt"]["latency_ms"] == 4200

    history = client.get("/api/review/attempts").json()["attempts"]
    assert body["attempt"]["id"] in [item["id"] for item in history]
    stored = next(item for item in history if item["id"] == body["attempt"]["id"])
    # The prompt is stored with the attempt: history stays readable even if the
    # lesson is edited later.
    assert stored["prompt"] == prompt["prompt"]


def test_self_graded_evidence_moves_the_schedule_less_than_server_graded(client, studied):
    """The same answer, judged by two methods, must not produce the same interval."""
    prompt = client.get(f"/api/review/{studied}/prompt?format=free_recall&seed=0&reveal=true").json()
    criteria = prompt["criteria"]

    partial = client.post(
        "/api/review/attempts",
        json={
            "prompt_id": prompt["prompt_id"],
            "answer": "Something about names and objects.",
            "checked": list(range(len(criteria))),
        },
    )
    assert partial.status_code == 201
    body = partial.json()
    assert body["attempt"]["score"] == 1.0
    assert body["attempt"]["graded_by"] == "self"
    assert body["attempt"]["evidence_weight"] == 0.5
    assert "self-graded" in body["next"]["reasons"][0]

    # The weaker weight shows up where forgetting has actually happened: 5 days
    # after a review, a full-weight success grows stability more than a
    # self-graded one from the same state.
    full_weight = srs.schedule(
        srs.MemoryState(stability_days=1.0, difficulty=3.0),
        correct=True,
        elapsed_days=5.0,
        now=datetime.now(timezone.utc),
        evidence_weight=1.0,
    )
    half_weight = srs.schedule(
        srs.MemoryState(stability_days=1.0, difficulty=3.0),
        correct=True,
        elapsed_days=5.0,
        now=datetime.now(timezone.utc),
        evidence_weight=0.5,
    )
    assert half_weight.state.stability_days < full_weight.state.stability_days
    # And the weight cannot be used to dodge a failure entirely: it still costs.
    failed_weak = srs.schedule(
        srs.MemoryState(stability_days=4.0),
        correct=False,
        elapsed_days=5.0,
        now=datetime.now(timezone.utc),
        evidence_weight=0.5,
    )
    assert failed_weak.state.stability_days < 4.0


def test_a_review_with_no_elapsed_time_earns_no_stability():
    """A property of the model worth pinning: growth comes from observed
    forgetting. Answering twice in a row does not buy a longer interval."""
    now = datetime.now(timezone.utc)
    result = srs.schedule(
        srs.MemoryState(stability_days=3.0),
        correct=True,
        elapsed_days=0.0,
        now=now,
    )
    assert result.state.stability_days == pytest.approx(3.0)
    assert result.retrievability_before == 1.0


def test_recall_formats_require_the_criteria_they_were_judged_against(client, studied):
    prompt = client.get(f"/api/review/{studied}/prompt?format=free_recall&seed=0").json()
    missing = client.post("/api/review/attempts", json={"prompt_id": prompt["prompt_id"], "answer": "text"})
    assert missing.status_code == 422
    assert "checked" in missing.json()["detail"]


def test_an_empty_tick_list_is_a_valid_answer_scored_zero(client, studied):
    prompt = client.get(f"/api/review/{studied}/prompt?format=free_recall&seed=0&reveal=true").json()
    blank = client.post(
        "/api/review/attempts",
        json={"prompt_id": prompt["prompt_id"], "answer": "", "checked": []},
    )
    assert blank.status_code == 201
    assert blank.json()["attempt"]["score"] == 0.0
    assert blank.json()["attempt"]["correct"] is False
    # The explanation does not moralise about failure.
    assert "useful information" in blank.json()["explanation"]


def test_a_ticked_criterion_outside_the_list_is_refused(client, studied):
    prompt = client.get(f"/api/review/{studied}/prompt?format=free_recall&seed=0&reveal=true").json()
    response = client.post(
        "/api/review/attempts",
        json={"prompt_id": prompt["prompt_id"], "answer": "x", "checked": [99]},
    )
    assert response.status_code == 422
    assert "not in this prompt" in response.json()["detail"]


def test_multiple_choice_answers_are_graded_server_side(client, studied):
    prompt = client.get(f"/api/review/{studied}/prompt?format=multiple_choice&seed=0").json()
    assert prompt["choices"]
    wrong = [
        index for index in range(len(prompt["choices"]))
    ]
    response = client.post(
        "/api/review/attempts",
        json={"prompt_id": prompt["prompt_id"], "choice_index": wrong[-1], "answer": prompt["choices"][-1]},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["attempt"]["score"] in (0.0, 1.0)
    assert body["attempt"]["expected"], "the correct option is revealed only after answering"


def test_attempts_are_append_only(client, studied):
    prompt = client.get(f"/api/review/{studied}/prompt?format=free_recall&seed=0&reveal=true").json()
    client.post("/api/review/attempts", json={"prompt_id": prompt["prompt_id"], "checked": []})
    client.post("/api/review/attempts", json={"prompt_id": prompt["prompt_id"], "checked": [0]})

    history = client.get("/api/review/attempts").json()["attempts"]
    assert len(history) == 2
    # There is no route that edits or deletes one.
    assert client.patch("/api/review/attempts/x", json={}).status_code in (404, 405)
    assert client.delete(f"/api/review/attempts/{history[0]['id']}").status_code in (404, 405)


def test_practice_requires_sign_in(client):
    assert client.get("/api/review").status_code == 401
    assert client.get("/api/review/py.variables/prompt").status_code == 401
    assert client.post("/api/review/attempts", json={"prompt_id": "a#cloze#0"}).status_code == 401


# -------------------------------------------------------------------- queue


def test_a_studied_concept_appears_in_the_queue_with_its_reasons(client):
    _new_learner(client)
    question = client.get("/api/concepts/py.variables/questions").json()["questions"][0]
    client.post("/api/answers", json={"question_id": question["id"], "choice_index": 0})

    # Nothing is due immediately after answering: the scheduler just set a date.
    queue = client.get("/api/review").json()
    assert queue["due"] == []
    assert queue["empty_state"] is None
    assert queue["upcoming"], "a studied concept must be visible as upcoming"

    # Move the clock past the due date the way a week would.
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email.like("practice-%")).order_by(User.created_at.desc()).first()
        state = db.query(ConceptState).filter(ConceptState.user_id == user.id).first()
        state.next_review_at = datetime.now(timezone.utc) - timedelta(days=2)
        state.last_reviewed_at = datetime.now(timezone.utc) - timedelta(days=3)
        db.commit()
    finally:
        db.close()

    queue = client.get("/api/review").json()
    assert len(queue["due"]) == 1
    item = queue["due"][0]
    assert item["concept_id"] == "py.variables"
    assert item["reasons"]
    assert any("Recall probability" in reason for reason in item["reasons"])
    assert any("Overdue by" in reason for reason in item["reasons"])
    assert queue["recovery"]["active"] is False


def test_an_unstudied_learner_gets_an_explanation_not_an_empty_box(client):
    _new_learner(client)
    queue = client.get("/api/review").json()
    assert queue["due"] == []
    assert "reviews appear after you have answered something" in queue["empty_state"]


def test_recovery_mode_caps_today_and_does_not_touch_the_schedule():
    plan = review.recovery_plan(0)
    assert plan["active"] is False and plan["today_target"] == 0

    ordinary = review.recovery_plan(review.RECOVERY_THRESHOLD)
    assert ordinary["active"] is False
    assert ordinary["today_target"] == review.RECOVERY_THRESHOLD

    backlog = review.recovery_plan(30)
    assert backlog["active"] is True
    assert backlog["today_target"] == review.RECOVERY_DAILY_TARGET
    assert backlog["remaining_after_today"] == 30 - review.RECOVERY_DAILY_TARGET
    assert backlog["spread_days"] >= 1
    # The wording promises no amnesty and no punishment, because neither happens.
    assert "Nothing has been reset" in backlog["reason"]


def test_recovery_mode_only_trims_what_is_shown_today(client, studied):
    """The full backlog stays in `due`; only the working set shrinks."""
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email.like("practice-%")).order_by(User.created_at.desc()).first()
        now = datetime.now(timezone.utc)
        for index in range(20):
            concept_id = f"own.bulk-{index}"
            db.add(
                __import__("app.models", fromlist=["Concept"]).Concept(
                    id=concept_id,
                    owner_id=user.id,
                    title=f"Bulk {index}",
                    subject="Load",
                    difficulty=3.0,
                    ordering=2000 + index,
                )
            )
            db.add(
                ConceptState(
                    user_id=user.id,
                    concept_id=concept_id,
                    mastery=0.5,
                    stability_days=3.0,
                    difficulty=3.0,
                    reps=2,
                    last_reviewed_at=now - timedelta(days=10),
                    next_review_at=now - timedelta(days=7),
                )
            )
        db.commit()
    finally:
        db.close()

    queue = client.get("/api/review").json()
    assert queue["overdue_count"] >= 20
    assert queue["recovery"]["active"] is True
    assert len(queue["today"]) == review.RECOVERY_DAILY_TARGET
    # Every due item is still reported, so nothing is hidden from the learner.
    assert len(queue["due"]) == queue["overdue_count"]


def test_the_queue_never_shows_another_learners_concept(client, studied):
    _new_learner(client)
    other = client.get("/api/review").json()
    assert other["due"] == []
    assert other["upcoming"] == []

    # And a guessed prompt id for somebody else's private concept is a 404.
    assert client.get("/api/review/own.private/prompt").status_code == 404


# ------------------------------------------------------------------- summary


def test_the_summary_separates_grading_methods_rather_than_averaging_them(client, studied):
    prompt = client.get(f"/api/review/{studied}/prompt?format=free_recall&seed=0&reveal=true").json()
    client.post("/api/review/attempts", json={"prompt_id": prompt["prompt_id"], "checked": [0]})

    stats = client.get("/api/review/stats").json()
    formats = {row["format"]: row for row in stats["summary"]["by_format"]}
    assert formats["free_recall"]["self_graded"] == 1
    assert formats["free_recall"]["auto_graded"] == 0
    assert "weaker evidence" in stats["summary"]["note"]
    # No composite "recall score" is offered.
    assert "recall_score" not in stats["summary"]
    assert stats["prediction"][0]["predicted_recall"] <= 1.0


def test_a_concept_with_no_material_is_queued_but_not_offered_a_format(client):
    """A title and nothing else cannot support any prompt. The queue must say so
    instead of suggesting a format that would answer 409."""
    _new_learner(client)
    client.post("/api/concepts", json={"title": "Bare concept", "subject": "Test"})
    concept = client.get("/api/library").json()["concepts"][0]
    assert concept["summary"] == ""

    from app.database import SessionLocal

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email.like("practice-%")).order_by(User.created_at.desc()).first()
        db.add(
            ConceptState(
                user_id=user.id,
                concept_id=concept["id"],
                mastery=0.4,
                stability_days=2.0,
                reps=1,
                last_reviewed_at=datetime.now(timezone.utc) - timedelta(days=4),
                next_review_at=datetime.now(timezone.utc) - timedelta(days=1),
            )
        )
        db.commit()
    finally:
        db.close()

    queue = client.get("/api/review").json()
    item = next(row for row in queue["due"] if row["concept_id"] == concept["id"])
    assert item["available_formats"] == []
    assert item["suggested_format"] is None

    # And asking for one anyway gives an explanation rather than an empty prompt.
    response = client.get(f"/api/review/{concept['id']}/prompt?format=free_recall")
    assert response.status_code == 409
    assert "no prose" in response.json()["detail"]
