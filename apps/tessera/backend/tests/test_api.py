"""The whole loop: register → learn → answer → mastery moves → review scheduled."""
from __future__ import annotations

import uuid


def register(client, password="correct horse battery"):
    email = f"u-{uuid.uuid4().hex[:8]}@example.test"
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "display_name": "Learner"},
    )
    return email, response


def test_health_and_registration(client):
    assert client.get("/health").json()["app"] == "tessera"
    email, response = register(client)
    assert response.status_code == 200
    assert client.get("/api/auth/me").json()["email"] == email


def test_short_passwords_and_bad_emails_are_rejected(client):
    assert client.post("/api/auth/register", json={"email": "x@y.z", "password": "short"}).status_code == 422
    assert client.post("/api/auth/register", json={"email": "not-an-email", "password": "a" * 14}).status_code == 422


def test_duplicate_registration_does_not_reveal_an_account_exists(client):
    email, first = register(client)
    assert first.status_code == 200
    _, second = register(client)
    duplicate = client.post("/api/auth/register", json={"email": email, "password": "correct horse battery"})
    assert duplicate.status_code == 422
    assert "exists" not in duplicate.text.lower()
    assert email not in duplicate.text


def test_endpoints_require_authentication(client):
    for path in ("/api/knowledge", "/api/map", "/api/today", "/api/chess/puzzles", "/api/sources"):
        assert client.get(path).status_code == 401, path


def test_anonymous_leak_check_after_logout(client, learner):
    assert client.get("/api/knowledge").status_code == 200
    client.post("/api/auth/logout")
    assert client.get("/api/knowledge").status_code == 401


def test_knowledge_bank_starts_unseen_and_is_not_fake_progress(client, learner):
    payload = client.get("/api/knowledge").json()
    assert payload["concepts"], "the seed must provide concepts"
    assert all(row["mastery"] == 0.0 for row in payload["concepts"])
    assert all(row["tier"] == "unseen" for row in payload["concepts"])


def test_map_exposes_the_prerequisite_graph(client, learner):
    payload = client.get("/api/map").json()
    node_ids = {node["id"] for node in payload["nodes"]}
    assert {"py.variables", "py.functions", "chess.pieces", "chess.tactics"} <= node_ids
    edges = {(edge["from"], edge["to"]) for edge in payload["edges"]}
    assert ("py.variables", "py.functions") in edges


def test_answering_updates_mastery_and_schedules_a_review(client, learner):
    detail = client.get("/api/concepts/py.variables").json()
    questions = detail["questions"]
    assert questions, "a concept must have questions to practise"
    # The learner-facing payload must not contain the answers.
    assert "correct_index" not in questions[0]

    graded = client.get("/api/concepts/py.variables").json()
    assert "correct_index" not in graded["questions"][0]

    answer = client.post(
        "/api/answers",
        json={"question_id": "q-py-variables-1", "choice_index": 1, "confidence": 4},
    )
    assert answer.status_code == 200
    body = answer.json()
    assert body["correct"] is True
    assert body["mastery"] > 0.0
    assert body["next_review_at"]
    assert body["explanation"]

    bank = client.get("/api/knowledge").json()
    row = next(item for item in bank["concepts"] if item["concept_id"] == "py.variables")
    assert row["mastery"] > 0.0
    assert row["tier"] != "unseen"


def test_a_wrong_answer_reports_the_misconception(client, learner):
    body = client.post(
        "/api/answers",
        json={"question_id": "q-py-variables-1", "choice_index": 0, "confidence": 2},
    ).json()
    assert body["correct"] is False
    assert body["misconception"]
    assert body["correct_index"] == 1
    assert body["mastery"] == 0.0


def test_recommendations_explain_themselves_and_respect_prerequisites(client, learner):
    payload = client.get("/api/recommendations").json()
    assert payload["all_ranked"]
    for item in payload["all_ranked"]:
        assert item["reasons"], "every recommendation must explain itself"
        assert item["blocked_by"] == [], "blocked concepts are excluded from the ranked list"

    # py.exceptions needs py.functions, which is untouched — so it must be blocked.
    everything = client.get("/api/recommendations?x=1").json()
    assert "py.exceptions" not in {item["concept_id"] for item in everything["all_ranked"]}


def test_today_offers_a_session_with_an_honest_empty_state(client, learner):
    payload = client.get("/api/today?available_minutes=10").json()
    assert payload["available_minutes"] == 10
    assert payload["items"], "a fresh learner should have something to start"
    kinds = {item["kind"] for item in payload["items"]}
    assert "new_concept" in kinds
    for item in payload["items"]:
        assert item["reasons"]


def test_sources_report_licence_and_usage_decision(client, learner):
    payload = client.get("/api/sources").json()
    assert payload["sources"]
    source = payload["sources"][0]
    assert source["license_class"] in {"OPEN", "AUTHORIZED", "LINK_ONLY", "PROPRIETARY", "UNKNOWN"}
    assert source["usage"] in {"full", "reference_only", "refused"}
    assert source["attribution"]


def test_concept_detail_includes_provenance(client, learner):
    detail = client.get("/api/concepts/py.functions").json()
    assert detail["lesson"]["recap"]
    assert detail["provenance"]["license_name"]
    assert detail["provenance"]["url"].startswith("https://")


def test_unknown_concept_is_404(client, learner):
    assert client.get("/api/concepts/does.not.exist").status_code == 404
    assert client.post("/api/answers", json={"question_id": "nope", "choice_index": 0}).status_code == 404


def test_chess_puzzle_hides_the_solution_and_accepts_the_winning_move(client, learner):
    listing = client.get("/api/chess/puzzles").json()["puzzles"]
    assert len(listing) >= 3

    puzzle = client.get("/api/chess/puzzles/pz-back-rank").json()
    assert "solution_uci" not in str(puzzle)
    assert puzzle["board"]["side_to_move"] == "white"

    wrong = client.post(
        "/api/chess/puzzles/pz-back-rank/move",
        json={"uci": "a1a2", "plies_played": 0},
    ).json()
    assert wrong["legal"] is True
    assert wrong["on_solution"] is False
    assert wrong["solved"] is False

    solved = client.post(
        "/api/chess/puzzles/pz-back-rank/move",
        json={"uci": "a1a8", "plies_played": 0},
    ).json()
    assert solved["solved"] is True
    assert solved["san_history"] == ["Ra8#"]

    # A solved chess puzzle feeds the same learner model as a quiz answer.
    bank = client.get("/api/knowledge").json()
    tactics = next(item for item in bank["concepts"] if item["concept_id"] == "chess.tactics")
    assert tactics["mastery"] > 0.0


def test_illegal_chess_move_is_reported_not_accepted(client, learner):
    body = client.post(
        "/api/chess/puzzles/pz-back-rank/move",
        json={"uci": "a1b3", "plies_played": 0},
    ).json()
    assert body["legal"] is False
    assert body["error"]


def test_goal_can_be_created_and_promotes_its_concepts(client, learner):
    created = client.post(
        "/api/goals",
        json={"title": "Get comfortable with Python basics", "concept_ids": ["py.variables", "py.functions"]},
    )
    assert created.status_code == 200
    goals = client.get("/api/goals").json()["goals"]
    assert goals[0]["title"].startswith("Get comfortable")
    ranked = client.get("/api/recommendations").json()["all_ranked"]
    assert any("goal" in reason.lower() for item in ranked for reason in item["reasons"])


def test_goal_with_unknown_concept_is_rejected(client, learner):
    response = client.post("/api/goals", json={"title": "Bad goal", "concept_ids": ["not.a.concept"]})
    assert response.status_code == 422


def test_learning_is_per_learner(client):
    email_a = f"a-{uuid.uuid4().hex[:6]}@example.test"
    client.post("/api/auth/register", json={"email": email_a, "password": "correct horse battery"})
    client.post("/api/answers", json={"question_id": "q-py-variables-1", "choice_index": 1})
    assert next(
        row for row in client.get("/api/knowledge").json()["concepts"]
        if row["concept_id"] == "py.variables"
    )["mastery"] > 0

    client.post("/api/auth/logout")
    email_b = f"b-{uuid.uuid4().hex[:6]}@example.test"
    client.post("/api/auth/register", json={"email": email_b, "password": "correct horse battery"})
    assert next(
        row for row in client.get("/api/knowledge").json()["concepts"]
        if row["concept_id"] == "py.variables"
    )["mastery"] == 0.0
