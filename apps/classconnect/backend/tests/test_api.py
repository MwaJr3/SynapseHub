"""ClassConnect API journey, membership and moderation tests."""


def make_class(teacher):
    cls = teacher.post("/api/classes", json={"name": "Physics", "subject": "Science"}).json()
    session = teacher.post(f"/api/classes/{cls['id']}/sessions", json={
        "title": "Motion", "start_at": "2026-11-01T09:00:00+00:00", "end_at": "2026-11-01T10:00:00+00:00",
    }).json()
    return cls, session


def test_class_session_journey_with_tokens_and_conflicts(app_env):
    from conftest import register

    teacher = register(app_env, "t@example.com", "teacher")
    learner = register(app_env, "l@example.com", "learner")

    cls, session = make_class(teacher)

    # schedule conflict for the same class
    clash = teacher.post(f"/api/classes/{cls['id']}/sessions", json={
        "title": "Clash", "start_at": "2026-11-01T09:30:00+00:00", "end_at": "2026-11-01T10:30:00+00:00",
    })
    assert clash.status_code == 409

    # learner must join before seeing sessions
    assert learner.get("/api/sessions").json() == []
    learner.post(f"/api/classes/{cls['id']}/join")
    assert learner.get("/api/sessions").json()[0]["title"] == "Motion"

    # room tokens only for starting/live sessions, and only for members
    assert learner.post(f"/api/sessions/{session['id']}/room-token").status_code == 400
    teacher.post(f"/api/sessions/{session['id']}/transition", json={"status": "starting"})
    token = learner.post(f"/api/sessions/{session['id']}/room-token").json()
    assert "token" in token and token["provider"]["available"] is False

    assert learner.post(f"/api/sessions/{session['id']}/transition", json={"status": "live"}).status_code == 403
    live = teacher.post(f"/api/sessions/{session['id']}/transition", json={"status": "live"})
    assert live.json()["status"] == "live"
    ended = teacher.post(f"/api/sessions/{session['id']}/transition", json={"status": "ended", "summary": "Great session"})
    assert ended.json()["summary"] == "Great session"

    # attendance + chat + poll + async follow-up
    teacher.post(f"/api/sessions/{session['id']}/attendance", json={"user_id": 2, "state": "present"})
    assert teacher.get(f"/api/sessions/{session['id']}/attendance").json()["counts"]["present"] == 1
    learner.post(f"/api/sessions/{session['id']}/messages", json={"kind": "question", "body": "Can I retake?"})
    assert teacher.get(f"/api/sessions/{session['id']}/messages").json()[0]["kind"] == "question"

    poll = teacher.post(f"/api/sessions/{session['id']}/polls", json={"question": "Clear?", "options": ["Yes", "No"]}).json()
    assert learner.post(f"/api/polls/{poll['id']}/vote", json={"option": "Yes"}).status_code == 200
    assert learner.post(f"/api/polls/{poll['id']}/vote", json={"option": "Maybe"}).status_code == 400

    assignment = teacher.post(f"/api/sessions/{session['id']}/assignments", json={"title": "HW", "body": "Q1"}).json()
    submission = learner.post(f"/api/assignments/{assignment['id']}/submissions", json={"body": "my answer"}).json()
    assert teacher.post(f"/api/submissions/{submission['id']}/respond", json={"response": "good work"}).status_code == 200


def test_moderation_permissions(app_env):
    from conftest import register

    teacher = register(app_env, "t@example.com", "teacher")
    learner = register(app_env, "l@example.com", "learner")
    cls, session = make_class(teacher)
    learner.post(f"/api/classes/{cls['id']}/join")
    message = learner.post(f"/api/sessions/{session['id']}/messages", json={"kind": "chat", "body": "hello"}).json()

    assert learner.post(f"/api/messages/{message['id']}/moderate", json={"action": "hide"}).status_code == 403
    assert teacher.post(f"/api/messages/{message['id']}/moderate", json={"action": "hide"}).json()["visible"] is False
    assert learner.get(f"/api/sessions/{session['id']}/messages").json() == []  # hidden from members


def test_recording_off_by_default(app_env):
    from conftest import register

    teacher = register(app_env, "t@example.com", "teacher")
    cls = teacher.post("/api/classes", json={"name": "C"}).json()
    session = teacher.post(f"/api/classes/{cls['id']}/sessions", json={
        "title": "S", "start_at": "2026-11-02T09:00:00+00:00",
    }).json()
    assert session["recording_consent"] == "no"
    bad = teacher.post(f"/api/classes/{cls['id']}/sessions", json={
        "title": "S2", "start_at": "2026-11-02T11:00:00+00:00", "recording_consent": "maybe",
    })
    assert bad.status_code == 400
