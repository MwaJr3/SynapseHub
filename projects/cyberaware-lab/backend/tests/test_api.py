def seed(instructor, learner):
    g = instructor.post("/api/groups", json={"name": "Cohort A"}).json()
    instructor.post("/api/groups/members", json={"group_id": g["id"], "email": "learn@example.org"})
    t = instructor.post("/api/templates", json={
        "title": "Fake delivery notice",
        "kind": "phishing_email",
        "content": "From: courier@training.example\nTrack: https://track.training.example/1\nfictional scenario",
        "quiz_json": '[{"prompt": "Real?", "choices": ["Yes", "No"], "correct": 1}]',
    }).json()
    a = instructor.post("/api/assignments", json={"group_id": g["id"], "template_id": t["id"]}).json()
    return t, a


def test_rbac_learner_cannot_manage(learner):
    assert learner.post("/api/groups", json={"name": "x"}).status_code == 403
    assert learner.post("/api/templates", json={"title": "t", "kind": "quiz", "content": "c"}).status_code == 403
    assert learner.get("/api/reports/progress").status_code == 403


def test_template_validation_enforced_via_api(instructor):
    r = instructor.post("/api/templates", json={
        "title": "bad", "kind": "phishing_email",
        "content": '<input type="password">'})
    assert r.status_code == 422 and "password" in r.json()["error"]
    r2 = instructor.post("/api/templates", json={
        "title": "bad", "kind": "phishing_email", "content": "visit https://paypal.com now"})
    assert r2.status_code == 422


def test_learner_flow_and_reports(instructor, learner):
    t, a = seed(instructor, learner)
    assigned = learner.get("/api/assignments").json()["assignments"]
    assert assigned and not assigned[0]["completed"]
    tpl = learner.get(f"/api/templates/{t['id']}").json()
    assert "TRAINING SIMULATION" in tpl["banner"]
    assert "correct" not in str(tpl["questions"])
    resp = learner.post("/api/quiz-attempts", json={"assignment_id": a["id"], "answers": [1]})
    assert resp.json() == {"score": 1, "total": 1}
    learner.post("/api/completions", json={"assignment_id": a["id"], "reflection": "I checked the sender domain."})
    assert learner.get("/api/assignments").json()["assignments"][0]["completed"] is True
    report = instructor.get("/api/reports/progress").json()["report"]
    assert report[0]["participation"] == "1/1" and report[0]["average_score"] == 1.0
    assert "not proof" in report[0]["note"]
    note = instructor.post("/api/notes", json={"assignment_id": a["id"], "body": "Good domain checking."})
    assert note.status_code == 200
    assert learner.get(f"/api/assignments/{a['id']}/notes").status_code == 403


def test_auth_required(client):
    assert client.get("/api/assignments").status_code == 401
    assert client.post("/api/auth/login", json={"email": "nobody@example.org",
                                                "password": "demo-password-123"}).status_code == 401
