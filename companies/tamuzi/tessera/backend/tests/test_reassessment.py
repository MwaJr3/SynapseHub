"""Reassessment: a successor row, a diff, and no invented deltas.

The behaviour these tests pin down, in the order it matters:

* reassessing archives the prior row and points the new one at it — nothing is
  edited, and the pair can be read in both directions;
* a score that was not supplied stays missing, and the diff says so rather than
  reporting a delta against zero;
* the chain is linear: a second reassessment of the same row is refused and names
  the current row, while reassessing the successor is allowed;
* the instrument belongs to the prior submission, so a reassessment cannot
  silently change what is being measured;
* another learner's assessment is a 404 on every one of these routes.
"""

from __future__ import annotations

import uuid

from app import reassessment


def _new_learner(client) -> str:
    email = f"reassess-{uuid.uuid4().hex[:8]}@example.test"
    assert client.post(
        "/api/auth/register",
        json={"email": email, "password": "correct horse battery", "display_name": "Learner"},
    ).status_code == 200
    return email


DIMENSIONS = [
    {"axis": "dimension", "name": "mindset", "value": 84.0, "value_label": "", "note": "reported 84%"},
    {"axis": "dimension", "name": "self_regulation", "value": 80.0, "value_label": "", "note": ""},
    {
        "axis": "dimension",
        "name": "self_management",
        "value": None,
        "value_label": "",
        "note": "not scored by the diagnostic",
    },
]


def _first(client, *, instrument: str = "icanstudy-dimensions", scores: list[dict] | None = None) -> dict:
    response = client.post(
        "/api/profile/assessments",
        json={
            "instrument": instrument,
            "label": "Original submission",
            "reported_by": "provider-report",
            "administered_on": "2026-10-15",
            "scores": scores if scores is not None else DIMENSIONS,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _reassess(client, assessment_id: str, body: dict):
    return client.post(f"/api/profile/assessments/{assessment_id}/reassess", json=body)


# ------------------------------------------------------------------ the chain


def test_reassessing_creates_a_successor_and_archives_the_prior(client):
    _new_learner(client)
    first = _first(client)

    response = _reassess(
        client,
        first["id"],
        {
            "label": "Second submission",
            "scores": [
                {"axis": "dimension", "name": "mindset", "value": 91.0},
                {"axis": "dimension", "name": "self_regulation", "value": 78.0},
            ],
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    second = body["assessment"]

    assert second["supersedes_id"] == first["id"]
    assert body["previous"]["replaced_by"] == second["id"]
    assert body["previous"]["archived"] is True
    assert second["id"] in body["previous"]["archive_reason"]
    # The earlier numbers are untouched, not rewritten by the newer ones.
    assert body["previous"]["scores"][0]["value"] == 84.0
    assert second["scores"][0]["value"] == 91.0

    live = [row for row in client.get("/api/profile").json()["assessments"] if not row["archived"]]
    assert [row["id"] for row in live] == [second["id"]]


def test_the_diff_reports_direction_and_delta_without_inventing_either(client):
    _new_learner(client)
    first = _first(client)
    body = _reassess(
        client,
        first["id"],
        {
            "scores": [
                {"axis": "dimension", "name": "mindset", "value": 91.0},
                {"axis": "dimension", "name": "self_regulation", "value": 80.0},
            ]
        },
    ).json()

    rows = {(row["axis"], row["name"]): row for row in body["diff"]}
    assert rows[("dimension", "mindset")]["direction"] == "up"
    assert rows[("dimension", "mindset")]["delta"] == 7.0
    assert rows[("dimension", "self_regulation")]["direction"] == "same"
    assert rows[("dimension", "self_regulation")]["delta"] == 0.0

    summary = body["summary"]
    assert summary["up"] == 1
    assert summary["unchanged"] == 1
    assert summary["comparable"] == 2
    assert summary["mean_delta"] == 3.5


def test_missing_stays_missing_and_is_not_a_gain(client):
    """`self_management` was never scored; a new submission does not make it 0."""
    _new_learner(client)
    first = _first(client)
    body = _reassess(
        client,
        first["id"],
        {
            "scores": [
                {"axis": "dimension", "name": "mindset", "value": 91.0},
                {"axis": "dimension", "name": "self_management", "value": None},
                {"axis": "dimension", "name": "retrieval", "value": 55.0},
            ]
        },
    ).json()

    rows = {(row["axis"], row["name"]): row for row in body["diff"]}
    still_missing = rows[("dimension", "self_management")]
    assert still_missing["previous"] is None
    assert still_missing["value"] is None
    assert still_missing["delta"] is None
    assert still_missing["direction"] == "missing"

    newly = rows[("dimension", "retrieval")]
    assert newly["direction"] == "new"
    assert newly["delta"] is None, "a newly supplied axis is a change in what was reported, not a gain"

    assert body["summary"]["missing"] == 1
    assert body["summary"]["newly_supplied"] == 1
    assert body["summary"]["moved"] == 1


def test_a_second_reassessment_of_the_same_row_is_refused_and_names_the_successor(client):
    _new_learner(client)
    first = _first(client)
    second = _reassess(
        client, first["id"], {"scores": [{"axis": "dimension", "name": "mindset", "value": 91.0}]}
    ).json()["assessment"]

    blocked = _reassess(
        client, first["id"], {"scores": [{"axis": "dimension", "name": "mindset", "value": 50.0}]}
    )
    assert blocked.status_code == 409
    assert blocked.json()["detail"]["current_id"] == second["id"]

    # Following the chain is allowed, and produces a third submission.
    third = _reassess(
        client, second["id"], {"scores": [{"axis": "dimension", "name": "mindset", "value": 95.0}]}
    )
    assert third.status_code == 201
    assert third.json()["assessment"]["supersedes_id"] == second["id"]


def test_history_returns_the_whole_chain_oldest_first_with_a_diff_per_step(client):
    _new_learner(client)
    first = _first(client)
    second = _reassess(
        client, first["id"], {"scores": [{"axis": "dimension", "name": "mindset", "value": 91.0}]}
    ).json()["assessment"]
    third = _reassess(
        client, second["id"], {"scores": [{"axis": "dimension", "name": "mindset", "value": 95.0}]}
    ).json()["assessment"]

    history = client.get(f"/api/profile/assessments/{third['id']}/history").json()
    assert [step["assessment"]["id"] for step in history["submissions"]] == [
        first["id"],
        second["id"],
        third["id"],
    ]
    assert history["current_id"] == third["id"]
    # The first submission has nothing before it, so there is no diff to show.
    assert history["submissions"][0]["diff"] == []
    assert history["submissions"][2]["diff"][0]["delta"] == 4.0

    # Asking from the oldest row returns the same chain in the same order.
    from_first = client.get(f"/api/profile/assessments/{first['id']}/history").json()
    assert [step["assessment"]["id"] for step in from_first["submissions"]] == [
        first["id"],
        second["id"],
        third["id"],
    ]


# ------------------------------------------------------------------- guards


def test_the_instrument_belongs_to_the_prior_submission(client):
    _new_learner(client)
    first = _first(client)

    mismatch = _reassess(
        client,
        first["id"],
        {
            "instrument": "icanstudy-processes",
            "scores": [{"axis": "process", "name": "priming", "value": 70.0}],
        },
    )
    assert mismatch.status_code == 422
    assert "same instrument" in mismatch.json()["detail"]

    wrong_axis = _reassess(
        client,
        first["id"],
        {"scores": [{"axis": "process", "name": "priming", "value": 70.0}]},
    )
    assert wrong_axis.status_code == 422


def test_a_score_outside_the_scale_is_refused(client):
    _new_learner(client)
    first = _first(client)
    response = _reassess(
        client, first["id"], {"scores": [{"axis": "dimension", "name": "mindset", "value": 140.0}]}
    )
    assert response.status_code == 422
    assert "140" in response.json()["detail"]


def test_a_retired_submission_cannot_be_reassessed(client):
    _new_learner(client)
    first = _first(client)
    assert client.post(f"/api/profile/assessments/{first['id']}/archive", json={"reason": "entered twice"}).status_code == 200

    response = _reassess(
        client, first["id"], {"scores": [{"axis": "dimension", "name": "mindset", "value": 91.0}]}
    )
    assert response.status_code == 409
    assert "retired" in response.json()["detail"]["message"]


def test_another_learners_submission_is_invisible(client):
    _new_learner(client)
    first = _first(client)

    _new_learner(client)  # a different account, same client
    blocked = _reassess(
        client, first["id"], {"scores": [{"axis": "dimension", "name": "mindset", "value": 91.0}]}
    )
    assert blocked.status_code == 404
    assert client.get(f"/api/profile/assessments/{first['id']}/history").status_code == 404


# --------------------------------------------------------- pure diff helpers


def test_the_diff_engine_keeps_categorical_results_categorical():
    rows = reassessment.diff_scores(
        [{"axis": "preference", "name": "vark", "value": None, "value_label": "Kinesthetic"}],
        [{"axis": "preference", "name": "vark", "value": None, "value_label": "Kinesthetic"}],
    )
    assert rows[0]["direction"] == "same"
    assert rows[0]["delta"] is None
    assert rows[0]["new_label"] == "Kinesthetic"


def test_a_withdrawn_axis_is_reported_as_withdrawn():
    rows = reassessment.diff_scores(
        [{"axis": "dimension", "name": "retrieval", "value": 43.0, "value_label": ""}],
        [],
    )
    assert rows[0]["direction"] == "not_supplied"
    assert rows[0]["delta"] is None
    summary = reassessment.summarise_changes(rows)
    assert summary["withdrawn"] == 1
    assert summary["mean_delta"] is None
