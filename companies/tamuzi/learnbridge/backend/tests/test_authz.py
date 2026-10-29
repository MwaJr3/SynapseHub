"""Role/ownership tests plus the study-loop API journey."""


def test_learner_cannot_create_courses(authed_client):
    response = authed_client.post("/api/courses", json={"slug": "x", "title": "X"})
    assert response.status_code == 403


def test_instructor_can_build_course_and_lessons(app_env):
    from conftest import register

    teacher = register(app_env, "t@example.com", "instructor")
    course = teacher.post("/api/courses", json={"slug": "bio101", "title": "Biology"}).json()
    module = teacher.post(f"/api/courses/{course['id']}/modules", json={"title": "Unit 1"}).json()
    lesson = teacher.post(
        f"/api/modules/{module['id']}/lessons",
        json={"title": "Cells", "content": [{"kind": "text", "body": "Cells are the unit of life."}], "requirements": {}},
    ).json()
    assert lesson["version"] == "1.0"
    detail = teacher.get(f"/api/lessons/{lesson['id']}").json()
    assert detail["content"][0]["kind"] == "text"


def test_enroll_lesson_quiz_progress_journey(app_env):
    from conftest import register

    teacher = register(app_env, "t@example.com", "instructor")
    learner = register(app_env, "l@example.com", "learner")

    course = teacher.post("/api/courses", json={"slug": "c1", "title": "Course One"}).json()
    module = teacher.post(f"/api/courses/{course['id']}/modules", json={"title": "M"}).json()
    lesson = teacher.post(
        f"/api/modules/{module['id']}/lessons",
        json={"title": "L", "content": [{"kind": "text", "body": "b"}], "requirements": {"min_quiz_score": 50}},
    ).json()

    # learner cannot open the lesson before enrolling
    assert learner.get(f"/api/lessons/{lesson['id']}").status_code == 403
    assert learner.post(f"/api/courses/{course['id']}/enroll").status_code == 200
    detail = learner.get(f"/api/lessons/{lesson['id']}").json()
    assert detail["state"] == "not_started"

    # opening a lesson alone never completes it
    put = learner.put("/api/my/progress", json={"lesson_id": lesson["id"], "event": "open"})
    assert put.json()["state"] == "in_progress"

    # quiz completion drives completion
    from app.database import SessionLocal
    from app.models import Question, Quiz

    db = SessionLocal()
    quiz = Quiz(lesson_id=lesson["id"], title="Q")
    db.add(quiz)
    db.flush()
    q = Question(quiz_id=quiz.id, kind="mcq", prompt="p", choices_json='["a","b"]', answer_json="0", explanation="e")
    db.add(q)
    db.commit()
    quiz_id, question_id = quiz.id, q.id
    db.close()

    attempt = learner.post(f"/api/quizzes/{quiz_id}/attempts", json={"responses": {str(question_id): 0}})
    assert attempt.json()["passed"] is True
    progress = learner.get(f"/api/my/progress").json()
    assert progress[0]["completed"] == 1


def test_notes_and_bookmarks_are_private(app_env):
    from conftest import register

    teacher = register(app_env, "t@example.com", "instructor")
    a = register(app_env, "a@example.com")
    b = register(app_env, "b@example.com")
    course = teacher.post("/api/courses", json={"slug": "c", "title": "C"}).json()
    module = teacher.post(f"/api/courses/{course['id']}/modules", json={"title": "M"}).json()
    lesson = teacher.post(f"/api/modules/{module['id']}/lessons", json={"title": "L"}).json()
    a.post(f"/api/courses/{course['id']}/enroll")
    note = a.post("/api/my/notes", json={"lesson_id": lesson["id"], "body": "private note"}).json()
    # b cannot delete a's note
    assert b.delete(f"/api/my/notes/{note['id']}").status_code == 404
    # even when enrolled, b sees only their own notes
    b.post(f"/api/courses/{course['id']}/enroll")
    detail = b.get(f"/api/lessons/{lesson['id']}").json()
    assert detail["notes"] == []
    a_detail = a.get(f"/api/lessons/{lesson['id']}").json()
    assert a_detail["notes"][0]["body"] == "private note"


def test_course_pack_contains_versioned_lessons(authed_client):
    from conftest import register

    teacher = register(authed_client.app, "t2@example.com", "instructor")
    course = teacher.post("/api/courses", json={"slug": "pack", "title": "Pack", "version": "2.0"}).json()
    module = teacher.post(f"/api/courses/{course['id']}/modules", json={"title": "M"}).json()
    teacher.post(f"/api/modules/{module['id']}/lessons", json={"title": "L", "version": "2.1"})
    pack = teacher.get(f"/api/courses/{course['id']}/pack").json()
    assert pack["pack_version"] == "2.0"
    assert pack["lessons"][0]["version"] == "2.1"
    assert "Media links open when online" in pack["note"]
