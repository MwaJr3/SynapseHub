"""TeachCraft API workflow, permissions and export tests."""


def make_lesson(teacher):
    course = teacher.post("/api/courses", json={"title": "C"}).json()
    unit = teacher.post(f"/api/courses/{course['id']}/units", json={"title": "U"}).json()
    lesson = teacher.post(f"/api/units/{unit['id']}/lessons", json={"title": "L", "template": "worked_example"}).json()
    return lesson


def test_lesson_lifecycle_with_review_gate(app_env):
    from conftest import register

    teacher = register(app_env, "t@example.com", "teacher")
    reviewer = register(app_env, "r@example.com", "reviewer")
    lesson = make_lesson(teacher)
    lid = lesson["id"]

    # author cannot self-publish: draft -> published is illegal; review -> published needs reviewer
    assert teacher.post(f"/api/lessons/{lid}/transition", json={"status": "published"}).status_code == 400
    assert teacher.post(f"/api/lessons/{lid}/transition", json={"status": "review"}).status_code == 200
    assert teacher.post(f"/api/lessons/{lid}/transition", json={"status": "published"}).status_code == 403

    published = reviewer.post(f"/api/lessons/{lid}/transition", json={"status": "published"})
    assert published.json()["status"] == "published"

    # published lessons are locked for in-place edits
    edit = teacher.patch(f"/api/lessons/{lid}", json={"title": "L2", "blocks": []})
    assert edit.status_code == 400 and "cannot be edited" in edit.json()["detail"]

    detail = teacher.get(f"/api/lessons/{lid}").json()
    assert detail["status"] == "published"


def test_version_restore_and_comments(app_env):
    from conftest import register

    teacher = register(app_env, "t@example.com", "teacher")
    lesson = make_lesson(teacher)
    lid = lesson["id"]
    teacher.patch(f"/api/lessons/{lid}", json={"title": "Edited", "blocks": [{"kind": "text", "text": "v2"}], "change_summary": "content edit"})
    detail = teacher.get(f"/api/lessons/{lid}").json()
    assert detail["version"] == 2
    assert len(detail["versions"]) == 2

    restored = teacher.post(f"/api/lessons/{lid}/restore/1").json()
    assert restored["version"] == 3 and restored["status"] == "draft"
    after = teacher.get(f"/api/lessons/{lid}").json()
    assert after["title"] == "L" and len(after["versions"]) == 3  # full history kept

    comment = teacher.post(f"/api/lessons/{lid}/comments", json={"body": "nice"}).json()
    assert teacher.post(f"/api/comments/{comment['id']}/resolve").json()["resolved"] is True


def test_question_bank_validation_and_export(app_env):
    from conftest import register

    teacher = register(app_env, "t@example.com", "teacher")
    bad = teacher.post("/api/questions", json={"kind": "single", "prompt": "p", "choices": ["only"], "answer": 0})
    assert bad.status_code == 400 and "at least two choices" in bad.json()["detail"]
    good = teacher.post("/api/questions", json={"kind": "single", "prompt": "p", "choices": ["a", "b"], "answer": 1})
    assert good.status_code == 200

    lesson = make_lesson(teacher)
    exported = teacher.get(f"/api/lessons/{lesson['id']}/export.html")
    assert exported.status_code == 200
    assert "Static HTML export" in exported.text and "interactive" in exported.text
