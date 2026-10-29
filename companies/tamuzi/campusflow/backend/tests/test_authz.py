"""Role and ownership enforcement tests (server-side)."""


def test_students_cannot_read_other_students(admin, student_user, scenario):
    listing = student_user.get("/api/students").json()
    # student@example.com is linked to Ada Sim (email match) — only that record
    assert len(listing) == 1
    assert listing[0]["enrollment_no"] == "T-001"


def test_parent_sees_only_guardian_children(admin, parent_user, scenario):
    assert parent_user.get("/api/students").json() == []
    admin.post("/api/guardian-links" if False else "/api/students", json={"first_name": "x", "last_name": "y", "enrollment_no": "T-009"})
    # link parent to Ada directly through the model (admin API for links is documented as future work)
    from app.database import SessionLocal
    from app.models import GuardianLink, Student

    db = SessionLocal()
    student = db.query(Student).filter(Student.enrollment_no == "T-001").one()
    db.add(GuardianLink(student_id=student.id, user_id=parent_user.get("/api/auth/me").json()["id"]))
    db.commit()
    db.close()

    listing = parent_user.get("/api/students").json()
    assert [s["enrollment_no"] for s in listing] == ["T-001"]


def test_teacher_cannot_grade_other_teachers_section(teacher, teacher2, scenario):
    eid = scenario["enrollment"]["id"]
    response = teacher2.post(f"/api/enrollments/{eid}/grades", json={"assessment": "X", "score": 50})
    assert response.status_code == 403
    ok = teacher.post(f"/api/enrollments/{eid}/grades", json={"assessment": "X", "score": 50})
    assert ok.status_code == 200


def test_teacher_cannot_write_students_or_courses(teacher, scenario):
    assert teacher.post(
        "/api/students", json={"first_name": "a", "last_name": "b", "enrollment_no": "Z-1"}
    ).status_code == 403
    assert teacher.post("/api/courses", json={"code": "X", "title": "Y"}).status_code == 403
    assert teacher.post("/api/enrollments", json={"student_id": 1, "section_id": 1}).status_code == 403


def test_admin_only_audit_log(admin, teacher, scenario):
    assert teacher.get("/api/audit").status_code == 403
    events = admin.get("/api/audit").json()
    actions = {e["action"] for e in events}
    assert "student.create" in actions
    assert "enrollment.create" in actions
    assert "grade.record" in actions or "section.create" in actions


def test_requires_authentication(student_user, scenario):
    from fastapi.testclient import TestClient
    from app.database import SessionLocal  # noqa: F401
    from app import main

    anon = TestClient(main.app)
    assert anon.get("/api/students").status_code == 401
    assert anon.get("/api/overview").status_code == 401


def test_transcript_visibility(admin, student_user, parent_user, scenario):
    sid = scenario["student"]["id"]
    assert admin.get(f"/api/students/{sid}/transcript").status_code == 200
    assert student_user.get(f"/api/students/{sid}/transcript").status_code == 200  # self
    assert parent_user.get(f"/api/students/{sid}/transcript").status_code == 404  # not linked yet
