"""Concepts, relations, notes and sessions — the learner's own material.

The awkward cases carry the weight here: a catalogue concept that must not be
editable, a prerequisite cycle that would make a concept permanently blocked, a
duplicate relation that must not draw two arrows, and a note search that has to
explain why it matched.
"""

from __future__ import annotations

import uuid

import pytest


def _new_learner(client) -> str:
    email = f"library-{uuid.uuid4().hex[:8]}@example.test"
    assert client.post(
        "/api/auth/register",
        json={"email": email, "password": "correct horse battery", "display_name": "Learner"},
    ).status_code == 200
    return email


@pytest.fixture()
def own(client):
    """A learner, plus one concept they authored."""
    _new_learner(client)
    created = client.post(
        "/api/concepts",
        json={
            "title": "Photosynthesis",
            "subject": "Biology",
            "summary": "Turning light into chemical energy.",
            "explanation": "Chlorophyll absorbs light; the light reactions make ATP and NADPH.",
            "difficulty": 3.5,
        },
    )
    assert created.status_code == 201, created.text
    return created.json()


# ------------------------------------------------------------------ concepts


def test_creating_a_concept_requires_sign_in(client):
    # A valid body, so this tests the session and not the schema: FastAPI
    # validates the body before the handler runs, so malformed JSON would answer
    # 422 whatever the caller's identity.
    body = {"title": "Photosynthesis", "subject": "Biology"}
    assert client.post("/api/concepts", json=body).status_code == 401
    assert client.get("/api/library").status_code == 401
    assert client.post("/api/notes", json={"concept_id": "x", "title": "t", "body": "b"}).status_code == 401
    assert client.post("/api/sessions", json={"concept_id": "x", "objective": "abc", "stopping_condition": "abc"}).status_code == 401


def test_a_created_concept_is_owned_marked_and_named_readably(client, own):
    assert own["own"] is True
    assert own["id"].startswith("own.photosynthesis")
    assert own["title"] == "Photosynthesis"

    overview = client.get("/api/library").json()
    assert [c["id"] for c in overview["concepts"]] == [own["id"]]
    # The catalogue is visible but not listed as theirs.
    assert all(concept["own"] for concept in overview["concepts"])


def test_ids_do_not_collide_when_two_concepts_share_a_title(client, own):
    again = client.post("/api/concepts", json={"title": "Photosynthesis", "subject": "Biology"})
    assert again.status_code == 201
    assert again.json()["id"] != own["id"]
    assert again.json()["id"].startswith("own.photosynthesis")


def test_an_own_concept_appears_in_the_knowledge_bank_and_map(client, own):
    knowledge = client.get("/api/knowledge").json()
    assert own["id"] in {row["concept_id"] for row in knowledge["concepts"]}
    assert "Biology" in {row["subject"] for row in knowledge["subjects"]}

    node = next(node for node in client.get("/api/map").json()["nodes"] if node["id"] == own["id"])
    assert node["title"] == "Photosynthesis"
    assert node["mastery"] == 0.0


def test_a_concept_needs_a_title_and_a_subject(client):
    _new_learner(client)
    assert client.post("/api/concepts", json={"title": " ", "subject": "Biology"}).status_code == 422
    assert client.post("/api/concepts", json={"title": "Valid", "subject": " "}).status_code == 422
    assert client.post("/api/concepts", json={"title": "Valid", "subject": "Biology"}).status_code == 201


def test_editing_changes_only_what_was_sent(client, own):
    patched = client.patch(f"/api/concepts/{own['id']}", json={"summary": "Light in, sugar out."})
    assert patched.status_code == 200
    assert patched.json()["summary"] == "Light in, sugar out."
    assert patched.json()["title"] == "Photosynthesis"
    assert patched.json()["difficulty"] == 3.5


def test_catalogue_material_cannot_be_edited_or_deleted(client):
    _new_learner(client)
    seeded = client.get("/api/knowledge").json()["concepts"][0]["concept_id"]
    edited = client.patch(f"/api/concepts/{seeded}", json={"title": "Hijacked"})
    assert edited.status_code == 403
    assert "catalogue material" in edited.json()["detail"]

    deleted = client.delete(f"/api/concepts/{seeded}?confirm=true")
    assert deleted.status_code == 403


def test_deleting_needs_confirmation_and_reports_what_goes_with_it(client, own):
    client.post(
        "/api/notes",
        json={"concept_id": own["id"], "title": "Light reactions", "body": "ATP and NADPH are made."},
    )
    session = client.post(
        "/api/sessions",
        json={
            "concept_id": own["id"],
            "objective": "Understand the light reactions",
            "stopping_condition": "Explain them out loud without notes",
        },
    )
    assert session.status_code == 201

    refused = client.delete(f"/api/concepts/{own['id']}")
    assert refused.status_code == 409
    detail = refused.json()["detail"]
    assert "1 note" in detail and "1 session" in detail and "confirm=true" in detail
    # Nothing was destroyed by the refused attempt.
    assert client.get("/api/library").json()["concepts"][0]["id"] == own["id"]

    confirmed = client.delete(f"/api/concepts/{own['id']}?confirm=true")
    assert confirmed.status_code == 200
    assert confirmed.json()["removed"] == {"notes": 1, "sessions": 1, "relations": 0}
    assert client.get("/api/library").json()["concepts"] == []
    assert client.get("/api/notes").json()["notes"] == []


# ----------------------------------------------------------------- relations


def test_relations_are_typed_listed_and_not_duplicated(client, own):
    other = client.post("/api/concepts", json={"title": "Chlorophyll", "subject": "Biology"}).json()

    first = client.post(
        f"/api/concepts/{other['id']}/relate",
        json={"to": own["id"], "relation": "prerequisite"},
    )
    assert first.status_code == 201
    assert first.json()["created"] is True

    # A double-submitted form must not draw the same arrow twice.
    again = client.post(
        f"/api/concepts/{other['id']}/relate",
        json={"to": own["id"], "relation": "prerequisite"},
    )
    assert again.status_code == 201
    assert again.json()["created"] is False
    assert again.json()["id"] == first.json()["id"]

    relations = client.get(f"/api/concepts/{own['id']}/relations").json()["relations"]
    assert len(relations) == 1
    assert relations[0]["relation"] == "prerequisite"
    assert relations[0]["label"] == "is a prerequisite of"
    assert relations[0]["removable"] is True


def test_unknown_relations_and_self_relations_are_refused(client, own):
    bad = client.post(f"/api/concepts/{own['id']}/relate", json={"to": own["id"], "relation": "vibes_with"})
    assert bad.status_code == 422
    assert "unknown relation" in bad.json()["detail"]
    assert "contrasts_with" in bad.json()["detail"]

    self_link = client.post(
        f"/api/concepts/{own['id']}/relate", json={"to": own["id"], "relation": "related_to"}
    )
    assert self_link.status_code == 422
    assert "itself" in self_link.json()["detail"]


def test_a_prerequisite_cycle_is_refused_because_it_could_never_unblock(client):
    _new_learner(client)
    a = client.post("/api/concepts", json={"title": "Alpha", "subject": "S"}).json()
    b = client.post("/api/concepts", json={"title": "Beta", "subject": "S"}).json()
    c = client.post("/api/concepts", json={"title": "Gamma", "subject": "S"}).json()

    assert client.post(f"/api/concepts/{a['id']}/relate", json={"to": b["id"], "relation": "prerequisite"}).status_code == 201
    assert client.post(f"/api/concepts/{b['id']}/relate", json={"to": c["id"], "relation": "prerequisite"}).status_code == 201

    cycle = client.post(f"/api/concepts/{c['id']}/relate", json={"to": a["id"], "relation": "prerequisite"})
    assert cycle.status_code == 409
    assert "circular" in cycle.json()["detail"]

    # A non-gating relation may still form a loop: it is a note about thinking,
    # not a constraint on what can be unlocked.
    soft = client.post(f"/api/concepts/{c['id']}/relate", json={"to": a["id"], "relation": "related_to"})
    assert soft.status_code == 201


def test_a_learner_relation_shows_on_the_map_and_can_be_removed(client, own):
    other = client.post("/api/concepts", json={"title": "Cell", "subject": "Biology"}).json()
    edge = client.post(
        f"/api/concepts/{other['id']}/relate", json={"to": own["id"], "relation": "related_to"}
    ).json()

    edges = client.get("/api/map").json()["edges"]
    mine = next(item for item in edges if item["id"] == edge["id"])
    assert mine["own"] is True

    assert client.delete(f"/api/relations/{edge['id']}").status_code == 200
    assert all(item["id"] != edge["id"] for item in client.get("/api/map").json()["edges"])


def test_catalogue_relations_are_visible_but_not_removable(client):
    _new_learner(client)
    edges = client.get("/api/map").json()["edges"]
    seeded = next(edge for edge in edges if edge["own"] is False)
    removed = client.delete(f"/api/relations/{seeded['id']}")
    assert removed.status_code == 403
    assert "catalogue" in removed.json()["detail"]


# --------------------------------------------------------------------- notes


def test_a_note_is_stored_against_a_concept_and_returned_with_its_title(client, own):
    created = client.post(
        "/api/notes",
        json={
            "concept_id": own["id"],
            "title": "Light reactions",
            "body": "Water is split, oxygen is released, ATP and NADPH are made.",
            "source_ref": "Lecture 4, slide 12",
        },
    )
    assert created.status_code == 201
    note = created.json()
    assert note["source_ref"] == "Lecture 4, slide 12"

    listed = client.get("/api/notes").json()["notes"]
    assert [item["id"] for item in listed] == [note["id"]]
    assert listed[0]["concept_title"] == "Photosynthesis"


def test_a_note_needs_a_title_and_content(client, own):
    assert client.post("/api/notes", json={"concept_id": own["id"], "title": " ", "body": "x"}).status_code == 422
    assert client.post("/api/notes", json={"concept_id": own["id"], "title": "t", "body": " "}).status_code == 422


def test_search_explains_why_each_note_matched(client, own):
    client.post(
        "/api/notes",
        json={"concept_id": own["id"], "title": "Spacing", "body": "Reviews spread over days beat cramming."},
    )
    client.post(
        "/api/notes",
        json={"concept_id": own["id"], "title": "Light", "body": "Chlorophyll absorbs red and blue light."},
    )

    result = client.get("/api/notes?q=spacing%20light").json()
    titles = [note["title"] for note in result["notes"]]
    # "Spacing" wins: its title matches (worth three), the other only its body.
    assert titles[0] == "Spacing"
    assert set(titles) == {"Spacing", "Light"}
    for note in result["notes"]:
        assert note["matched"], "a matched note must say which terms matched"
        assert note["score"] > 0
    assert "title match worth three" in result["explanation"]

    nothing = client.get("/api/notes?q=photosynthesis").json()
    assert nothing["notes"] == []
    assert nothing["terms"] == ["photosynthesis"]


def test_search_ignores_question_words(client, own):
    client.post("/api/notes", json={"concept_id": own["id"], "title": "ATP", "body": "Energy currency."})
    # "what" and "is" are not evidence of relevance; "atp" is.
    result = client.get("/api/notes?q=what%20is%20atp").json()
    assert result["terms"] == ["atp"]
    assert len(result["notes"]) == 1


def test_a_note_can_be_edited_moved_and_deleted(client, own):
    other = client.post("/api/concepts", json={"title": "Chlorophyll", "subject": "Biology"}).json()
    note = client.post(
        "/api/notes", json={"concept_id": own["id"], "title": "Draft", "body": "Rough."}
    ).json()

    patched = client.patch(f"/api/notes/{note['id']}", json={"title": "Final", "body": "Clear."})
    assert patched.status_code == 200
    assert patched.json()["title"] == "Final"

    moved = client.patch(f"/api/notes/{note['id']}", json={"concept_id": other["id"]})
    assert moved.status_code == 200
    assert moved.json()["concept_id"] == other["id"]

    assert client.delete(f"/api/notes/{note['id']}").status_code == 200
    assert client.get("/api/notes").json()["notes"] == []


# ------------------------------------------------------------------ sessions


def _session_body(concept_id: str, **overrides) -> dict:
    body = {
        "concept_id": concept_id,
        "objective": "Explain the light reactions from memory",
        "stopping_condition": "Two clean explanations in a row, or 25 minutes",
        "planned_minutes": 25,
    }
    body.update(overrides)
    return body


def test_a_session_needs_an_objective_and_a_stopping_condition(client, own):
    missing_objective = client.post("/api/sessions", json=_session_body(own["id"], objective=""))
    assert missing_objective.status_code == 422

    vague = client.post("/api/sessions", json=_session_body(own["id"], objective="x"))
    assert vague.status_code == 422
    # Pydantic reports the offending field; spelling it out is the difference
    # between a usable error and "invalid input".
    assert "objective" in str(vague.json()["detail"])

    no_stop = client.post("/api/sessions", json=_session_body(own["id"], stopping_condition=" "))
    assert no_stop.status_code == 422
    assert "stopping_condition" in str(no_stop.json()["detail"])


def test_one_open_session_per_concept_so_work_is_resumed_not_duplicated(client, own):
    first = client.post("/api/sessions", json=_session_body(own["id"]))
    assert first.status_code == 201

    again = client.post("/api/sessions", json=_session_body(own["id"]))
    assert again.status_code == 409
    assert "already an open session" in again.json()["detail"]

    open_sessions = client.get("/api/sessions?status=open").json()["sessions"]
    assert [item["id"] for item in open_sessions] == [first.json()["id"]]


def test_activities_are_validated_and_reported_back_as_what_was_covered(client, own):
    session = client.post("/api/sessions", json=_session_body(own["id"])).json()

    bad = client.patch(f"/api/sessions/{session['id']}", json={"activities": [{"stage": "napping"}]})
    assert bad.status_code == 422
    assert "priming" in bad.json()["detail"]

    patched = client.patch(
        f"/api/sessions/{session['id']}",
        json={
            "activities": [
                {"stage": "priming", "note": "Recalled what I know about leaves"},
                {"stage": "retrieval", "note": "Two blank-page explanations"},
            ]
        },
    )
    assert patched.status_code == 200
    assert patched.json()["covered"] == ["priming", "retrieval"]


def test_a_worked_session_cannot_be_finished_without_reflection(client, own):
    session = client.post("/api/sessions", json=_session_body(own["id"])).json()

    refused = client.post(f"/api/sessions/{session['id']}/finish", json={"outcome": "completed"})
    assert refused.status_code == 422
    assert "reflection" in refused.json()["detail"]

    # Abandoning does not require a reflection: the point is not to punish a stop.
    abandoned = client.post(f"/api/sessions/{session['id']}/finish", json={"outcome": "abandoned"})
    assert abandoned.status_code == 200
    assert abandoned.json()["status"] == "abandoned"


def test_a_finished_session_is_a_record_not_a_draft(client, own):
    session = client.post("/api/sessions", json=_session_body(own["id"])).json()
    finished = client.post(
        f"/api/sessions/{session['id']}/finish",
        json={"outcome": "completed", "reflection": "Explaining it aloud exposed a gap.", "minutes_spent": 22},
    )
    assert finished.status_code == 200
    assert finished.json()["minutes_spent"] == 22
    assert finished.json()["finished_at"] is not None

    assert client.patch(f"/api/sessions/{session['id']}", json={"reflection": "rewriting"}).status_code == 409
    assert client.post(f"/api/sessions/{session['id']}/finish", json={"outcome": "completed"}).status_code == 409


def test_stats_count_what_was_recorded_and_say_that_is_all_they_are(client, own):
    session = client.post("/api/sessions", json=_session_body(own["id"])).json()
    client.post(
        f"/api/sessions/{session['id']}/finish",
        json={"outcome": "partial", "reflection": "Got halfway.", "minutes_spent": 15},
    )
    client.post("/api/notes", json={"concept_id": own["id"], "title": "T", "body": "B"})

    stats = client.get("/api/library").json()["stats"]
    assert stats["concepts_own"] == 1
    assert stats["notes"] == 1
    assert stats["sessions_finished"] == 1
    assert stats["minutes_recorded"] == 15
    assert "not a measure of what you learned" in stats["note"]


def test_a_explicit_unknown_session_status_is_rejected(client):
    _new_learner(client)
    assert client.get("/api/sessions?status=someday").status_code == 422
