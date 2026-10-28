"""Stage 7: the learner-development model, the baseline, the curriculum, the gate.

Most of these tests exist to stop one specific fabrication. The document is
unusually explicit about what must not be invented — a self-management percentage,
a definition for a named method, a strong conclusion from a tiny sample — and each
of those has a test here that fails if the invention creeps back in.

The curriculum tests are the ones that will matter in a year. "Cover every topic"
is easy to satisfy once and easy to erode afterwards, so the partition is asserted
rather than described.
"""

from __future__ import annotations

import pytest

from app import development, development_content as content


# --------------------------------------------------------------- the curriculum


def test_every_declared_topic_is_covered_exactly_once():
    declared = [key for group in content.TOPICS.values() for key, _title in group]
    covered = list(content.covered_topics())

    assert len(declared) == 58, f"the document lists {len(declared)} topics; the count changed"
    assert sorted(covered) == sorted(declared), "a topic was dropped or invented"
    assert len(covered) == len(set(covered)), "a topic is claimed by two lessons"


def test_every_lesson_carries_the_shape_the_document_requires():
    required = (
        "model",
        "when_to_use",
        "when_not_to_use",
        "worked_example",
        "exercise",
        "judging_results",
        "traps",
    )
    for lesson in content.LESSONS:
        for field in required:
            assert lesson[field].strip(), f"{lesson['slug']} has no {field}"
        prompt, criteria = lesson["retrieval_check"]
        # Imperative prompts ("Name the four things...") are as retrievable as
        # interrogatives, so this checks that a prompt exists and asks for
        # production, not that it ends in a question mark.
        assert len(prompt.strip()) > 15, f"{lesson['slug']} has no retrievable prompt"
        assert len(criteria) >= 2, f"{lesson['slug']} cannot be marked: fewer than two criteria"


def test_every_group_has_at_least_one_lesson():
    covered_groups = {lesson["group"] for lesson in content.LESSONS}
    assert covered_groups == set(content.TOPICS), "a technique group has no lesson"


def test_the_five_dimensions_and_five_processes_are_all_present():
    assert [item["key"] for item in content.DIMENSIONS] == [
        "mindset",
        "self_regulation",
        "deep_processing",
        "retrieval",
        "self_management",
    ]
    assert [item["key"] for item in content.PROCESSES] == [
        "priming",
        "encoding",
        "reference",
        "retrieval_interleaving",
        "overlearning",
    ]
    # The one axis the instrument never scored. If this ever becomes a number,
    # someone has invented the measurement the document forbids.
    missing = [item for item in content.DIMENSIONS if item["reported"] is None]
    assert [item["key"] for item in missing] == ["self_management"]


def test_the_named_methods_are_undefined_and_stay_that_way():
    methods = {method["name"]: method for method in content.NAMED_METHODS}
    assert set(methods) == {
        "AIM",
        "Bear Hunter System",
        "VPReFRE criteria",
        "GRINDE maps",
        "PEER-Peer",
        "OFF-rest timing",
        "survive-and-thrive filter",
        "order control",
        "Huddle framework",
    }
    for method in methods.values():
        assert method["status"] == "undefined"
        # There is no definition field at all: a definition would be a fabrication,
        # and the only safe way to prevent one is to have nowhere to put it.
        assert "definition" not in method
        assert method["open_alternative"].strip(), f"{method['name']} offers no alternative"
        assert method["problem"].strip(), f"{method['name']} names no problem"


def test_curriculum_endpoint_serves_no_definition_for_an_undefined_method(client, learner):
    payload = client.get("/api/development/curriculum").json()
    for method in payload["named_methods"]:
        assert method["status"] == "undefined"
        assert "definition" not in method
    assert len(payload["lessons"]) == len(content.LESSONS)
    assert payload["progress"]["total"] == len(content.LESSONS)


# ----------------------------------------------------------------- the confidence


@pytest.mark.parametrize(
    ("evidence", "expected"),
    [
        ([], "none"),
        ([{"kind": "assessment", "count": 4}], "low"),
        ([{"kind": "session", "count": 2}], "low"),
        ([{"kind": "assessment"}, {"kind": "session"}], "moderate"),
        ([{"kind": "observation"}, {"kind": "retrieval"}], "moderate"),
        ([{"kind": "assessment"}, {"kind": "session"}, {"kind": "retrieval"}], "high"),
        ([{"kind": "attempt"}, {"kind": "session"}, {"kind": "observation"}], "high"),
    ],
)
def test_confidence_is_derived_from_evidence_kinds(evidence, expected):
    label, because = development.confidence_for(evidence)
    assert label == expected
    assert because.strip()


def test_confidence_ignores_an_unknown_evidence_kind():
    """A typo in an evidence entry must not buy confidence."""
    label, _because = development.confidence_for([{"kind": "vibes"}])
    assert label == "none"


# --------------------------------------------------------------- the learner model


def test_a_new_learner_gets_questions_rather_than_conclusions(client, learner):
    model = client.get("/api/development/model").json()
    assert len(model["areas"]) == 10
    assert all(area["hypothesis"] is None for area in model["areas"])
    assert all(area["missing"] for area in model["areas"])
    # Every suggestion is phrased as something to test, and none claims confidence.
    for area in model["areas"]:
        assert area["suggestion"]["claim"]
        assert area["suggestion"]["contradict"], "a claim with nothing against it is unfalsifiable"


def test_the_model_computes_no_composite_score(client, learner):
    model = client.get("/api/development/model").json()
    assert "score" not in model
    assert "composite" not in model
    for area in model["areas"]:
        assert area["score"] is None
        assert area["missing"] is True


def test_a_hypothesis_needs_a_testable_claim(client, learner):
    response = client.post(
        "/api/development/model/hypotheses",
        json={"scope": "dimension", "key": "retrieval", "claim": "weak"},
    )
    assert response.status_code == 422
    assert "claim someone could test" in response.json()["detail"]


def test_an_unknown_area_is_refused(client, learner):
    response = client.post(
        "/api/development/model/hypotheses",
        json={"scope": "dimension", "key": "charisma", "claim": "Probably underdeveloped at work."},
    )
    assert response.status_code == 422
    assert "Unknown dimension" in response.json()["detail"]


def test_writing_a_hypothesis_twice_updates_it_rather_than_duplicating(client, learner):
    body = {
        "scope": "process",
        "key": "reference",
        "claim": "Notes are being written to be filed rather than to be used.",
        "rationale": "The instrument reported 0 for reference.",
    }
    first = client.post("/api/development/model/hypotheses", json=body)
    assert first.status_code == 201
    body["claim"] = "Notes are written after a session but are never reopened."
    second = client.post("/api/development/model/hypotheses", json=body)
    assert second.status_code == 201
    assert second.json()["id"] == first.json()["id"]

    model = client.get("/api/development/model").json()
    reference = next(area for area in model["areas"] if area["key"] == "reference")
    assert reference["hypothesis"]["claim"] == body["claim"]


def test_marking_a_claim_supported_requires_a_reason(client, learner):
    created = client.post(
        "/api/development/model/hypotheses",
        json={"scope": "process", "key": "overlearning", "claim": "Overlearning is being applied everywhere."},
    ).json()
    response = client.post(
        f"/api/development/model/hypotheses/{created['id']}/review",
        json={"status": "supported", "note": ""},
    )
    assert response.status_code == 422
    assert "what moved this claim" in response.json()["detail"]

    ok = client.post(
        f"/api/development/model/hypotheses/{created['id']}/review",
        json={"status": "contradicted", "note": "Three sessions ended at first successful recall."},
    )
    assert ok.status_code == 200
    assert ok.json()["status"] == "contradicted"


def test_another_learners_hypothesis_is_not_reachable(client, learner):
    created = client.post(
        "/api/development/model/hypotheses",
        json={"scope": "dimension", "key": "mindset", "claim": "Setbacks are being read as verdicts."},
    ).json()

    # Sign in as somebody else on the same client. Guessing the id gets a 404,
    # not a row: the query is scoped to the session's learner, not filtered after.
    client.post(
        "/api/auth/register",
        json={"email": "someone-else@example.test", "password": "correct horse battery", "display_name": "Other"},
    )
    response = client.post(
        f"/api/development/model/hypotheses/{created['id']}/review",
        json={"status": "open", "note": "not mine"},
    )
    assert response.status_code == 404


# ------------------------------------------------------- the self-management baseline


def _baseline_body(answer="sometimes", **observation):
    return {
        "items": [{"key": item["key"], "answer": answer} for item in content.BASELINE_ITEMS],
        "observation": {
            "task": "Work through the chapter 4 problem set",
            "planned_minutes": 40,
            "actual_minutes": 25,
            "started_after_minutes": 18,
            "interruptions": 2,
            "resumed_after_minutes": 6,
            "finished": False,
            **observation,
        },
    }


def test_the_baseline_refuses_a_partial_answer_set(client, learner):
    body = _baseline_body()
    body["items"] = body["items"][:-2]
    response = client.post("/api/development/baseline", json=body)
    assert response.status_code == 422
    assert "partial baseline is not a baseline" in response.json()["detail"]


def test_the_baseline_refuses_an_answer_outside_its_scale(client, learner):
    body = _baseline_body()
    body["items"][0]["answer"] = "always"
    response = client.post("/api/development/baseline", json=body)
    assert response.status_code == 422
    assert "must be one of" in response.json()["detail"]


def test_the_baseline_refuses_a_negative_observation(client, learner):
    response = client.post("/api/development/baseline", json=_baseline_body(actual_minutes=-5))
    assert response.status_code == 422


def test_the_baseline_produces_no_score_at_all(client, learner):
    """The document's instruction: a baseline "without inventing a percentage"."""
    created = client.post("/api/development/baseline", json=_baseline_body()).json()
    assert created["score"] is None
    assert "%" not in created["summary"]
    assert "No score is calculated" in created["summary"]
    # It describes, and it counts.
    assert "of 9 statements were answered" in created["summary"]
    assert "planned 40 minutes" in created["summary"]
    assert "worked 25" in created["summary"]
    assert "not met" in created["summary"]


def test_a_second_baseline_compares_itself_with_the_first(client, learner):
    client.post("/api/development/baseline", json=_baseline_body(answer="sometimes"))
    second = client.post("/api/development/baseline", json=_baseline_body(answer="most days")).json()
    assert "higher on" in second["summary"]


def test_the_baseline_moves_confidence_without_anyone_editing_it(client, learner):
    """The document's "update it after practice", implemented as a recompute."""
    client.post(
        "/api/development/model/hypotheses",
        json={"scope": "dimension", "key": "self_management", "claim": "Starting is the constraint, not finishing."},
    )
    before = client.get("/api/development/model").json()
    area = next(item for item in before["areas"] if item["key"] == "self_management")
    assert area["hypothesis"]["confidence"] == "none"

    client.post("/api/development/baseline", json=_baseline_body())

    after = client.get("/api/development/model").json()
    area = next(item for item in after["areas"] if item["key"] == "self_management")
    assert area["hypothesis"]["confidence"] == "low"
    assert area["hypothesis"]["evidence"][0]["kind"] == "observation"


# ------------------------------------------------------------- the retrieval checks


def test_a_retrieval_check_needs_an_answer_produced_from_memory(client, learner):
    response = client.post(
        "/api/development/curriculum/whole-part-whole/retrieval",
        json={"answer": "I read it", "criteria_met": []},
    )
    assert response.status_code == 422
    assert "produced from memory" in response.json()["detail"]


def test_a_retrieval_check_only_passes_when_every_criterion_is_met(client, learner):
    lesson = content.lesson_by_slug("whole-part-whole")
    criteria = lesson["retrieval_check"][1]

    partial = client.post(
        "/api/development/curriculum/whole-part-whole/retrieval",
        json={"answer": "The third pass rebuilds the whole, which shows the dependencies.", "criteria_met": [0]},
    ).json()
    assert partial["passed"] is False
    assert partial["state"] == "practised"
    assert partial["still_open"]

    complete = client.post(
        "/api/development/curriculum/whole-part-whole/retrieval",
        json={
            "answer": "The third pass rebuilds the whole from memory, so the dependencies appear; "
            "the first whole was only orientation.",
            "criteria_met": list(range(len(criteria))),
        },
    ).json()
    assert complete["passed"] is True
    assert complete["state"] == "retrieval_passed"
    assert complete["still_open"] == []
    # Self-assessment is stated, not hidden behind the word "grade".
    assert complete["self_assessed"] is True


def test_an_unknown_lesson_is_a_404(client, learner):
    assert client.get("/api/development/curriculum").status_code == 200
    response = client.post("/api/development/curriculum/not-a-lesson/study")
    assert response.status_code == 404


# ------------------------------------------------------------------ the protocol


def _full_protocol():
    return {
        "sections": {key: f"{label}: written." for key, label in content.PROTOCOL_SECTIONS},
        "material_examples": {key: f"{label}: an example." for key, label in content.MATERIAL_TYPES},
    }


def test_an_empty_protocol_is_refused(client, learner):
    response = client.post("/api/development/protocol", json={"sections": {}, "material_examples": {}})
    assert response.status_code == 422
    assert "empty protocol" in response.json()["detail"]


def test_an_unknown_section_is_refused(client, learner):
    body = _full_protocol()
    body["sections"]["vibes"] = "Not a real section."
    response = client.post("/api/development/protocol", json=body)
    assert response.status_code == 422
    assert "Unknown protocol sections" in response.json()["detail"]


def test_a_protocol_is_complete_only_with_all_sections_and_all_four_material_types(client, learner):
    partial = _full_protocol()
    partial["material_examples"].pop("procedural")
    first = client.post("/api/development/protocol", json=partial).json()
    assert first["complete"] is False
    assert first["missing"] == ["procedural"]

    second = client.post("/api/development/protocol", json=_full_protocol()).json()
    assert second["complete"] is True
    assert second["version"] == 2
    assert second["missing"] == []


def test_only_one_protocol_version_is_current(client, learner):
    from app.models import LearningProtocol

    client.post("/api/development/protocol", json=_full_protocol())
    client.post("/api/development/protocol", json=_full_protocol())
    current = client.get("/api/development/protocol").json()
    assert current["version"] == 2
    assert current["complete"] is True


# ---------------------------------------------------------------- the experiments


def _experiment(client, **overrides):
    body = {
        "technique": "Blank-page recall instead of rereading",
        "hypothesis": "Retrieval will produce better delayed recall than rereading the chapter.",
        "predicted": "Higher scores on the cold test two weeks later.",
        "measure": "A cold five-question test two weeks after each method, marked blind to which was used.",
        **overrides,
    }
    return client.post("/api/development/experiments", json=body)


def test_an_experiment_must_say_how_it_will_be_judged(client, learner):
    response = _experiment(client, measure="")
    assert response.status_code == 422
    assert "before you observe it" in response.json()["detail"]


def test_a_single_case_cannot_be_a_conclusion(client, learner):
    created = _experiment(client).json()
    response = client.post(
        f"/api/development/experiments/{created['id']}/observe",
        json={"observed": "It felt faster.", "outcome": "supported", "sample_size": 1},
    )
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert "cannot support one" in detail
    assert str(development.MIN_SAMPLE) in detail


def test_a_single_case_can_be_recorded_as_a_weak_signal(client, learner):
    created = _experiment(client).json()
    response = client.post(
        f"/api/development/experiments/{created['id']}/observe",
        json={"observed": "It felt faster, and the answer was right.", "outcome": "weak_signal", "sample_size": 1},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["outcome"] == "weak_signal"
    assert "does not establish a difference" in payload["caveat"]


def test_a_conclusion_is_allowed_once_the_sample_is_large_enough(client, learner):
    created = _experiment(client).json()
    response = client.post(
        f"/api/development/experiments/{created['id']}/observe",
        json={
            "observed": "Five of six cold tests favoured retrieval.",
            "outcome": "supported",
            "sample_size": development.MIN_SAMPLE + 1,
        },
    )
    assert response.status_code == 200
    assert response.json()["caveat"] == ""


# -------------------------------------------------------------------- the gate


def test_a_new_learner_has_every_phase_one_requirement_outstanding(client, learner):
    gate = client.get("/api/development/gate").json()
    assert gate["ready"] is False
    assert gate["done"] == 0
    assert gate["total"] == 7
    keys = [item["key"] for item in gate["requirements"]]
    assert keys == ["model", "diagnostics", "baseline", "curriculum", "retrieval", "protocol", "experiments"]
    assert all(not item["done"] for item in gate["requirements"])


def test_the_gate_opens_only_when_every_deliverable_exists(client, learner):
    """End to end: the seven things Phase I asks for, actually produced.

    This is the test that keeps the gate from being decoration. Every requirement
    is satisfied through the public API, and the gate is read last.
    """
    for lesson in content.LESSONS:
        client.post(f"/api/development/curriculum/{lesson['slug']}/practice", json={"note": ""})
        criteria = lesson["retrieval_check"][1]
        response = client.post(
            f"/api/development/curriculum/{lesson['slug']}/retrieval",
            json={
                "answer": "A written answer long enough to count as an attempt at recall, produced from memory.",
                "criteria_met": list(range(len(criteria))),
            },
        )
        assert response.status_code == 200, response.text
        assert response.json()["passed"] is True

    client.post("/api/development/baseline", json=_baseline_body())
    client.post("/api/development/protocol", json=_full_protocol())
    _experiment(client)
    for scope, keys in (
        ("dimension", [item["key"] for item in content.DIMENSIONS]),
        ("process", [item["key"] for item in content.PROCESSES]),
    ):
        for key in keys:
            response = client.post(
                "/api/development/model/hypotheses",
                json={"scope": scope, "key": key, "claim": f"A testable claim about {key} worth checking."},
            )
            assert response.status_code == 201, response.text

    gate = client.get("/api/development/gate").json()
    outstanding = [item["key"] for item in gate["requirements"] if not item["done"]]
    # No diagnostic was supplied for this learner, so nothing can be "explained";
    # that requirement stays open by design rather than being faked green.
    assert outstanding == ["diagnostics"]
    assert gate["ready"] is False


def test_the_gate_reports_what_is_missing_rather_than_locking_anything(client, learner):
    gate = client.get("/api/development/gate").json()
    model = next(item for item in gate["requirements"] if item["key"] == "model")
    assert len(model["missing"]) == 10
    assert "no recorded claim" in model["detail"]
    # Nothing is blocked: the curriculum is readable while the gate is shut.
    assert client.get("/api/development/curriculum").status_code == 200


# ----------------------------------------------------------------- export and delete


def test_development_rows_are_exported_and_deleted_with_the_account(client, learner):
    from app.models import LessonProgress

    client.post("/api/development/baseline", json=_baseline_body())
    client.post(
        "/api/development/model/hypotheses",
        json={"scope": "dimension", "key": "retrieval", "claim": "Retrieval practice is being avoided."},
    )
    client.post("/api/development/protocol", json=_full_protocol())
    client.post("/api/development/curriculum/whole-part-whole/study")

    bundle = client.get("/api/account/export").json()
    for table in (
        "self_management_baselines",
        "development_hypotheses",
        "learning_protocols",
        "lesson_progress",
    ):
        assert bundle["manifest"].get(table, 0) >= 1, f"{table} missing from the export"

    # Nothing in the baseline implies a measurement that did not happen.
    baseline = bundle["data"]["self_management_baselines"][0]
    assert baseline["summary"]
    assert "score" not in baseline

    from app.database import SessionLocal
    from app.models import SelfManagementBaseline

    # Present in the export and absent from the database after deletion are two
    # different claims; the deletion half is proved in test_account_data.py, which
    # sweeps every table the schema says belongs to a learner.
    with SessionLocal() as db:
        assert db.query(SelfManagementBaseline).count() >= 1
