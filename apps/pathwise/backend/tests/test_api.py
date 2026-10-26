"""PathWise API journey + authorization tests."""


def build_courseware(teacher):
    skill = teacher.post("/api/skills", json={"name": "Fractions", "mastery_threshold": 70}).json()
    q = teacher.post("/api/questions", json={
        "skill_id": skill["id"], "kind": "numeric", "prompt": "What is 1/2 + 1/2?", "answer": 1,
    }).json()
    assessment = teacher.post("/api/assessments", json={
        "title": "Fractions check", "kind": "formative", "question_ids": [q["id"]],
    }).json()
    return skill, q, assessment


def test_teacher_authoring_learner_journey(app_env):
    from conftest import register

    teacher = register(app_env, "t@example.com", "teacher")
    learner = register(app_env, "l@example.com", "learner")

    skill, q, assessment = build_courseware(teacher)

    # learner cannot author
    assert learner.post("/api/skills", json={"name": "X"}).status_code == 403
    assert learner.post("/api/questions", json={"skill_id": skill["id"], "kind": "mcq", "prompt": "p", "answer": 0}).status_code == 403

    detail = learner.get(f"/api/assessments/{assessment['id']}").json()
    assert detail["questions"][0]["prompt"] == "What is 1/2 + 1/2?"

    attempt = learner.post(f"/api/assessments/{assessment['id']}/attempts", json={"responses": {str(q["id"]): 1}})
    assert attempt.status_code == 200
    body = attempt.json()
    assert body["score"] == 100.0
    assert body["mastery"][str(skill["id"])]["confidence"] in ("low", "moderate", "high")

    skill_map = learner.get("/api/my/map").json()
    row = next(r for r in skill_map if r["skill_id"] == skill["id"])
    assert row["status"] in ("developing", "mastered")  # 1 evidence point → never mastered
    assert row["explanation"]

    recs = learner.get("/api/my/recommendations").json()
    assert all(r["rationale"] for r in recs)


def test_learner_cannot_override_or_assign(app_env):
    from conftest import register

    teacher = register(app_env, "t@example.com", "teacher")
    learner = register(app_env, "l@example.com", "learner")
    skill, q, assessment = build_courseware(teacher)
    learner.post(f"/api/assessments/{assessment['id']}/attempts", json={"responses": {str(q["id"]): 0}})
    recs = learner.get("/api/my/recommendations").json()
    assert recs
    assert learner.patch(f"/api/recommendations/{recs[0]['id']}", json={"status": "overridden", "reason": "x"}).status_code == 403
    assert learner.post("/api/assignments", json={"user_id": learner.get("/api/auth/me").json()["id"], "skill_id": skill["id"]}).status_code == 403


def test_override_requires_reason(app_env):
    from conftest import register

    teacher = register(app_env, "t@example.com", "teacher")
    learner = register(app_env, "l@example.com", "learner")
    skill, q, assessment = build_courseware(teacher)
    learner.post(f"/api/assessments/{assessment['id']}/attempts", json={"responses": {str(q["id"]): 0}})
    rec_id = learner.get("/api/my/recommendations").json()[0]["id"]
    missing = teacher.patch(f"/api/recommendations/{rec_id}", json={"status": "overridden", "reason": "  "})
    assert missing.status_code == 400
    ok = teacher.patch(f"/api/recommendations/{rec_id}", json={"status": "overridden", "reason": "Learner chose a different goal."})
    assert ok.status_code == 200 and ok.json()["status"] == "overridden"


def test_pre_post_report_from_attempts(app_env):
    from conftest import register

    teacher = register(app_env, "t@example.com", "teacher")
    learner = register(app_env, "l@example.com", "learner")
    skill = teacher.post("/api/skills", json={"name": "Decimals", "mastery_threshold": 70}).json()
    q = teacher.post("/api/questions", json={"skill_id": skill["id"], "kind": "numeric", "prompt": "0.5+0.5", "answer": 1}).json()
    pre = teacher.post("/api/assessments", json={"title": "Pre", "kind": "diagnostic", "question_ids": [q["id"]]}).json()
    post = teacher.post("/api/assessments", json={"title": "Post", "kind": "posttest", "question_ids": [q["id"]]}).json()
    learner.post(f"/api/assessments/{pre['id']}/attempts", json={"responses": {str(q["id"]): 0}})
    learner.post(f"/api/assessments/{post['id']}/attempts", json={"responses": {str(q["id"]): 1}})
    report = learner.get("/api/reports/pre-post").json()
    row = report["rows"][0]
    assert row["pre"] == 0.0 and row["post"] == 100.0 and row["delta"] == 100.0
    assert "participation" in report["note"]
