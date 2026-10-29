"""TutorSpring API journey, permissions and privacy tests."""


def seed_source(teacher):
    return teacher.post("/api/sources", json={
        "title": "Gravity (simulated)", "topic": "gravity",
        "body": "Gravity pulls objects toward each other. On Earth it gives weight.",
    }).json()


def test_chat_journey_with_citations_and_demo_labels(app_env):
    from conftest import register

    teacher = register(app_env, "t@example.com", "teacher")
    learner = register(app_env, "l@example.com", "learner")
    seed_source(teacher)

    config = learner.get("/api/config").json()
    assert config["demo_mode"] is True and "prepared" in config["note"]

    reply = learner.post("/api/chat", json={"mode": "Explain", "question": "what is gravity", "topic": "gravity"})
    assert reply.status_code == 200
    body = reply.json()
    assert body["supported"] is True
    assert body["demo_response"] is True
    assert body["sources"] and body["sources"][0]["title"] == "Gravity (simulated)"
    assert "can be wrong" in body["disclaimer"]

    # unsupported question is honest
    unsupported = learner.post("/api/chat", json={"mode": "Explain", "question": "quantum tunneling in semiconductors"}).json()
    assert unsupported["supported"] is False and "ask a teacher" in unsupported["text"]

    # conversation history + deletion (learner-controlled)
    conv_id = body["conversation_id"]
    history = learner.get(f"/api/conversations/{conv_id}").json()
    assert [m["role"] for m in history["messages"]] == ["user", "assistant"]
    assert learner.delete(f"/api/conversations/{conv_id}").status_code == 200
    assert learner.get(f"/api/conversations/{conv_id}").status_code == 404


def test_flag_routes_to_review_queue_privately(app_env):
    from conftest import register

    teacher = register(app_env, "t@example.com", "teacher")
    a = register(app_env, "a@example.com", "learner")
    b = register(app_env, "b@example.com", "learner")
    seed_source(teacher)

    reply = a.post("/api/chat", json={"mode": "Explain", "question": "what is gravity", "topic": "gravity"}).json()
    flagged = a.post(f"/api/messages/{reply['message_id']}/flag", json={"reason": "confusing wording"})
    assert flagged.json()["status"] == "pending"

    # learners cannot see the review queue; teacher can
    assert a.get("/api/review-queue").status_code == 403
    queue = teacher.get("/api/review-queue").json()
    assert queue and queue[0]["flag_reason"] == "confusing wording"

    # b cannot see a's conversation
    assert b.get(f"/api/conversations/{reply['conversation_id']}").status_code == 404

    decision = teacher.post(f"/api/messages/{reply['message_id']}/review", json={"decision": "approved", "note": "fine"})
    assert decision.json()["status"] == "approved"
    assert teacher.post(f"/api/messages/{reply['message_id']}/review", json={"decision": "deleted"}).status_code == 400


def test_teacher_only_sources_and_summary(app_env):
    from conftest import register

    teacher = register(app_env, "t@example.com", "teacher")
    learner = register(app_env, "l@example.com", "learner")
    assert learner.post("/api/sources", json={"title": "x", "topic": "y", "body": "z"}).status_code == 403
    assert learner.get("/api/teacher/summary").status_code == 403
    seed_source(teacher)
    learner.post("/api/practice", json={"topic": "gravity", "question": "why do things fall", "self_correct": "yes"})
    summary = teacher.get("/api/teacher/summary").json()
    assert summary["topics"]["gravity"]["attempts"] == 1
