"""The learner profile: missing is not zero, and nothing is untraceable.

These tests are the contract for the first slice of the LIFESYSTEM build inside
Tessera. The interesting cases are the awkward ones — a supplied zero, an absent
score, a number outside its instrument's scale, another learner's record — because
those are where a profile screen quietly starts lying.
"""

from __future__ import annotations

import json

import pytest


def _score(axis: str, name: str, value: float | None = None, label: str = "") -> dict:
    return {"axis": axis, "name": name, "value": value, "value_label": label, "note": ""}


def _assessment(instrument: str, scores: list[dict], **extra) -> dict:
    body = {
        "instrument": instrument,
        "reported_by": "learner",
        "administered_on": "2026-10-01",
        "scores": scores,
    }
    body.update(extra)
    return body


def _axis(payload: dict, name: str) -> dict:
    for axis in payload["axes"]:
        if axis["name"] == name:
            return axis
    raise AssertionError(f"axis {name} not in payload")


def test_profile_requires_sign_in(client):
    assert client.get("/api/profile").status_code == 401
    assert client.put("/api/profile", json={"context": "x"}).status_code == 401
    assert client.post("/api/profile/baseline").status_code == 401
    assert client.get("/api/profile/instruments").status_code == 401


def test_empty_profile_reports_every_axis_as_missing(client, learner):
    body = client.get("/api/profile").json()
    assert body["context"] == ""
    assert len(body["axes"]) == 10
    assert all(axis["missing"] is True for axis in body["axes"])
    assert body["assessments"] == []
    # The caveats travel with the numbers, so a client cannot render one alone.
    assert len(body["caveats"]) >= 3
    assert any("never treated as zero" in caveat for caveat in body["caveats"])


def test_supplied_zero_is_a_score_and_absent_score_is_missing(client, learner):
    assert client.post("/api/profile/baseline").status_code == 200
    body = client.get("/api/profile").json()

    reference = _axis(body, "reference")
    assert reference["missing"] is False
    assert reference["score"]["value"] == 0.0
    assert "not a missing value" in reference["score"]["note"]

    self_management = _axis(body, "self_management")
    assert self_management["missing"] is True
    assert self_management["score"] is None

    # A zero must never be rendered as "no evidence", and an absence must never
    # produce a number. Only self-management has no score in the supplied data.
    assert body["missing"] == ["Self-management"]


def test_baseline_is_transcribed_not_invented(client, learner):
    client.post("/api/profile/baseline")
    body = client.get("/api/profile").json()
    assert _axis(body, "retrieval")["score"]["value"] == 43.0
    assert _axis(body, "mindset")["score"]["value"] == 84.0
    assert _axis(body, "overlearning")["score"]["value"] == 33.0

    # Categorical results are stored as labels, never coerced into a number.
    mbti = next(
        score
        for assessment in body["assessments"]
        for score in assessment["scores"]
        if score["name"] == "mbti"
    )
    assert mbti["value"] is None
    assert "INTJ" in mbti["value_label"]

    # Provenance survives: instrument, reporter, date and the source report.
    dimensions = next(a for a in body["assessments"] if a["instrument"] == "icanstudy-dimensions")
    assert dimensions["reported_by"] == "provider-report"
    assert dimensions["administered_on"] == "2026-10-15"
    assert "icanstudy.com" in dimensions["source_url"]
    assert dimensions["scale_min"] == 0.0 and dimensions["scale_max"] == 100.0


def test_baseline_is_idempotent(client, learner):
    first = client.post("/api/profile/baseline").json()
    assert len(first["created"]) == 7
    assert first["skipped"] == []

    second = client.post("/api/profile/baseline").json()
    assert second["created"] == []
    assert sorted(second["skipped"]) == sorted(
        ["icanstudy-dimensions", "icanstudy-processes", "vark", "fastudy", "honey-mumford",
         "intellectual-attributes", "self-described"]
    )
    assert len(client.get("/api/profile").json()["assessments"]) == 7


def test_latest_score_wins_by_when_it_was_taken(client, learner):
    older = _assessment(
        "icanstudy-dimensions",
        [_score("dimension", "retrieval", 20.0)],
        administered_on="2026-01-01",
        label="older",
    )
    newer = _assessment(
        "icanstudy-dimensions",
        [_score("dimension", "retrieval", 61.0)],
        administered_on="2026-06-01",
        label="newer",
    )
    # Entered in the opposite order to the dates, to prove ordering is by the
    # assessment date rather than by insertion.
    assert client.post("/api/profile/assessments", json=newer).status_code == 201
    assert client.post("/api/profile/assessments", json=older).status_code == 201
    assert _axis(client.get("/api/profile").json(), "retrieval")["score"]["value"] == 61.0


def test_archiving_retires_a_score_without_deleting_history(client, learner):
    created = client.post(
        "/api/profile/assessments",
        json=_assessment("icanstudy-processes", [_score("process", "encoding", 55.0)]),
    ).json()

    archived = client.post(
        f"/api/profile/assessments/{created['id']}/archive",
        json={"reason": "wrong instrument, entered twice"},
    )
    assert archived.status_code == 200
    assert archived.json()["archived"] is True
    assert archived.json()["archive_reason"] == "wrong instrument, entered twice"

    body = client.get("/api/profile").json()
    assert _axis(body, "encoding")["missing"] is True
    # History keeps the row, marked retired, so the correction is auditable.
    assert len(body["assessments"]) == 1
    assert body["assessments"][0]["archived"] is True

    # Archiving twice is a no-op rather than an error.
    again = client.post(f"/api/profile/assessments/{created['id']}/archive", json={"reason": "again"})
    assert again.status_code == 200
    assert again.json()["archive_reason"] == "wrong instrument, entered twice"


@pytest.mark.parametrize(
    "body,fragment",
    [
        (_assessment("nonsense", [_score("dimension", "retrieval", 50.0)]), "unknown instrument"),
        (_assessment("vark", [_score("dimension", "retrieval", 50.0)]), "has no axis"),
        (_assessment("icanstudy-dimensions", [_score("dimension", "retrieval", 140.0)]), "outside"),
        (_assessment("icanstudy-dimensions", [_score("dimension", "retrieval", -1.0)]), "outside"),
        (
            _assessment(
                "icanstudy-dimensions",
                [_score("dimension", "retrieval", 50.0), _score("dimension", "retrieval", 60.0)],
            ),
            "twice",
        ),
        (_assessment("icanstudy-dimensions", []), "at least one score"),
        (_assessment("icanstudy-dimensions", [_score("dimension", "retrieval", 50.0)], reported_by="nobody"), "reported_by"),
        (_assessment("icanstudy-dimensions", [_score("dimension", "retrieval", 50.0)], administered_on="2026-13-40"), "ISO date"),
        (_assessment("icanstudy-dimensions", [_score("dimension", "retrieval", 50.0)], administered_on="2099-01-01"), "future"),
        (_assessment("self-described", [_score("label", "mbti", 4.0)]), "categorical"),
        (_assessment("self-described", [_score("label", "mbti", label="")]), "needs a label"),
        (_assessment("icanstudy-dimensions", [_score("dimension", "retrieval", label="high")]), "scored"),
    ],
)
def test_invalid_assessments_are_rejected(client, learner, body, fragment):
    response = client.post("/api/profile/assessments", json=body)
    assert response.status_code == 422, response.text
    assert fragment in response.json()["detail"]
    # Nothing invalid reached storage.
    assert client.get("/api/profile").json()["assessments"] == []


def test_non_finite_value_is_rejected(client, learner):
    body = json.dumps(_assessment("icanstudy-dimensions", [_score("dimension", "retrieval", 50.0)])).replace(
        "50.0", "NaN"
    )
    response = client.post(
        "/api/profile/assessments", content=body, headers={"content-type": "application/json"}
    )
    assert response.status_code == 422
    assert "finite" in response.json()["detail"]


def test_an_axis_may_be_listed_with_no_value(client, learner):
    """An instrument that did not score an axis can still record the absence."""
    response = client.post(
        "/api/profile/assessments",
        json=_assessment("icanstudy-dimensions", [_score("dimension", "self_management")]),
    )
    assert response.status_code == 201
    axis = _axis(client.get("/api/profile").json(), "self_management")
    assert axis["missing"] is True
    assert axis["score"] is None


def test_one_learner_cannot_read_or_archive_another(client, learner):
    created = client.post(
        "/api/profile/assessments",
        json=_assessment("icanstudy-dimensions", [_score("dimension", "mindset", 90.0)]),
    ).json()

    other = client.__class__(client.app)
    with other as stranger:
        email = f"stranger-{created['id'][:8]}@example.test"
        assert stranger.post(
            "/api/auth/register",
            json={"email": email, "password": "correct horse battery", "display_name": "Other"},
        ).status_code == 200
        assert stranger.get("/api/profile").json()["assessments"] == []
        # A guessed id is a 404: it does not confirm the record exists.
        assert stranger.post(
            f"/api/profile/assessments/{created['id']}/archive", json={"reason": "mine now"}
        ).status_code == 404

    # And the owner's row is untouched by the attempt.
    assert client.get("/api/profile").json()["assessments"][0]["archived"] is False


def test_context_is_editable_and_trimmed(client, learner):
    saved = client.put("/api/profile", json={"context": "  Two hours a week, exam in May.  "})
    assert saved.status_code == 200
    assert saved.json()["context"] == "Two hours a week, exam in May."

    updated = client.put("/api/profile", json={"context": "Changed my mind: three hours."})
    assert updated.status_code == 200
    assert client.get("/api/profile").json()["context"] == "Changed my mind: three hours."
    assert client.put("/api/profile", json={"context": "x" * 4001}).status_code == 422


def test_instrument_catalogue_matches_what_the_server_accepts(client, learner):
    catalogue = client.get("/api/profile/instruments").json()["instruments"]
    by_id = {instrument["id"]: instrument for instrument in catalogue}
    assert set(by_id) == {
        "icanstudy-dimensions",
        "icanstudy-processes",
        "icanstudy-learner-type",
        "vark",
        "fastudy",
        "honey-mumford",
        "intellectual-attributes",
        "self-described",
    }

    # Every numeric instrument's declared scale is the one validation enforces:
    # its top value is accepted, one step above is refused.
    for instrument in catalogue:
        if instrument["value_kind"] != "number":
            continue
        axis = next(a for a in instrument["axes"] if a["axis"] in {"dimension", "process", "preference", "attribute"})
        top = instrument["scale_max"]
        ok = client.post(
            "/api/profile/assessments",
            json=_assessment(instrument["id"], [_score(axis["axis"], axis["name"], float(top))]),
        )
        assert ok.status_code == 201, (instrument["id"], ok.text)
        too_big = client.post(
            "/api/profile/assessments",
            json=_assessment(instrument["id"], [_score(axis["axis"], axis["name"], float(top) + 1)]),
        )
        assert too_big.status_code == 422, (instrument["id"], too_big.text)


# --------------------------------------------------------------- new accounts
#
# The profile is per learner. A new account starts with nothing filled in, and
# one learner's results never appear in another's profile — including the
# transcribed baseline, which belongs to the person who supplied it.


def test_a_new_learner_starts_with_every_axis_unscored(client, learner):
    body = client.get("/api/profile").json()
    assert all(axis["missing"] for axis in body["axes"])
    assert body["assessments"] == []
    assert body["context"] == ""


def test_one_learners_baseline_is_not_another_learners(client, learner):
    client.post("/api/profile/baseline")
    assert len(client.get("/api/profile").json()["assessments"]) == 7

    with client.__class__(client.app) as other:
        email = f"fresh-{len(learner)}@example.test"
        assert other.post(
            "/api/auth/register",
            json={"email": email, "password": "correct horse battery", "display_name": "Fresh"},
        ).status_code == 200
        fresh = other.get("/api/profile").json()
        assert fresh["assessments"] == []
        assert all(axis["missing"] for axis in fresh["axes"])
        # The other account sees the same instruments and offers the same route,
        # but none of the data.
        assert {instrument["id"] for instrument in fresh["instruments"]} == {
            instrument["id"] for instrument in client.get("/api/profile").json()["instruments"]
        }


def test_the_transcribed_baseline_is_off_unless_enabled(client, learner, monkeypatch):
    monkeypatch.delenv("TESSERA_DEMO_BASELINE", raising=False)

    # The payload says so, so a client can hide the button instead of offering
    # something that will fail.
    assert client.get("/api/profile").json()["demo_baseline"] is False

    response = client.post("/api/profile/baseline")
    assert response.status_code == 403
    assert "TESSERA_DEMO_BASELINE" in response.json()["detail"]
    assert client.get("/api/profile").json()["assessments"] == []
    # Normal entry still works: only the shortcut is off.
    assert client.post(
        "/api/profile/assessments",
        json=_assessment("icanstudy-dimensions", [_score("dimension", "retrieval", 40.0)]),
    ).status_code == 201


def test_the_learner_type_quiz_is_recorded_as_a_label(client, learner):
    response = client.post(
        "/api/profile/assessments",
        json=_assessment(
            "icanstudy-learner-type",
            [_score("label", "archetype", label="Spark")],
            reported_by="provider-report",
        ),
    )
    assert response.status_code == 201, response.text
    stored = response.json()["scores"][0]
    assert stored["value"] is None
    assert stored["value_label"] == "Spark"
    # A label is not one of the ten core axes, so it cannot move a dimension.
    assert all(axis["missing"] for axis in client.get("/api/profile").json()["axes"])


def test_quiz_links_are_configuration_and_hidden_when_unset(client, learner, monkeypatch):
    monkeypatch.delenv("TESSERA_QUIZ_LEARNER_TYPE_URL", raising=False)
    monkeypatch.delenv("TESSERA_QUIZ_DIAGNOSTIC_URL", raising=False)
    assert client.get("/api/profile").json()["quiz_links"] == []

    monkeypatch.setenv("TESSERA_QUIZ_LEARNER_TYPE_URL", "https://quiz.icanstudy.com/learner-type")
    monkeypatch.setenv("TESSERA_QUIZ_DIAGNOSTIC_URL", "https://quiz.icanstudy.com/learning-diagnostic")
    links = client.get("/api/profile").json()["quiz_links"]
    assert [link["id"] for link in links] == ["learner-type", "diagnostic"]
    assert links[0]["url"].startswith("https://")
    assert links[1]["records"].startswith("icanstudy-dimensions")

    # A malformed value is not rendered as a broken anchor.
    monkeypatch.setenv("TESSERA_QUIZ_LEARNER_TYPE_URL", "quiz.icanstudy.com")
    assert [link["id"] for link in client.get("/api/profile").json()["quiz_links"]] == ["diagnostic"]


def test_quiz_links_do_not_leak_between_accounts(client, learner, monkeypatch):
    monkeypatch.setenv("TESSERA_QUIZ_DIAGNOSTIC_URL", "https://quiz.icanstudy.com/learning-diagnostic")
    monkeypatch.delenv("TESSERA_QUIZ_LEARNER_TYPE_URL", raising=False)
    with client.__class__(client.app) as other:
        other.post(
            "/api/auth/register",
            json={"email": f"links-{len(learner)}@example.test", "password": "correct horse battery"},
        )
        # Configuration is deployment-wide, so both see it; what stays private is
        # the data. Asserting it here keeps the two ideas from being conflated.
        assert [link["id"] for link in other.get("/api/profile").json()["quiz_links"]] == ["diagnostic"]
        assert other.get("/api/profile").json()["assessments"] == []
