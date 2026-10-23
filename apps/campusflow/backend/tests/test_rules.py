"""Enrollment, grade and attendance rule tests."""
from app.logic import RuleError, letter_for_score, validate_attendance_status, validate_score

import pytest


def test_score_validation():
    assert validate_score(88) == 88.0
    with pytest.raises(RuleError):
        validate_score(-1)
    with pytest.raises(RuleError):
        validate_score(101)
    with pytest.raises(RuleError):
        validate_score(True)


def test_letter_bands():
    assert letter_for_score(95) == "A"
    assert letter_for_score(85) == "B"
    assert letter_for_score(72) == "C"
    assert letter_for_score(61) == "D"
    assert letter_for_score(12) == "F"


def test_attendance_status_validation():
    assert validate_attendance_status("late") == "late"
    with pytest.raises(RuleError):
        validate_attendance_status("skipped")


def test_cannot_enroll_twice(admin, scenario):
    again = admin.post(
        "/api/enrollments", json={"student_id": scenario["student"]["id"], "section_id": scenario["section"]["id"]}
    )
    assert again.status_code == 400
    assert "already enrolled" in again.json()["detail"]


def test_section_capacity_enforced(admin, scenario):
    second = admin.post(
        "/api/students", json={"first_name": "Bo", "last_name": "Sim", "enrollment_no": "T-002"}
    ).json()
    third = admin.post(
        "/api/students", json={"first_name": "Cy", "last_name": "Sim", "enrollment_no": "T-003"}
    ).json()
    admin.post("/api/enrollments", json={"student_id": second["id"], "section_id": scenario["section"]["id"]})
    over = admin.post("/api/enrollments", json={"student_id": third["id"], "section_id": scenario["section"]["id"]})
    assert over.status_code == 400
    assert "capacity" in over.json()["detail"]


def test_drop_then_reenroll(admin, scenario):
    admin.post(f"/api/enrollments/{scenario['enrollment']['id']}/drop")
    again = admin.post(
        "/api/enrollments", json={"student_id": scenario["student"]["id"], "section_id": scenario["section"]["id"]}
    )
    assert again.status_code == 200
    assert again.json()["status"] == "enrolled"


def test_grade_validation(admin, scenario):
    eid = scenario["enrollment"]["id"]
    assert admin.post(f"/api/enrollments/{eid}/grades", json={"assessment": "Quiz 1", "score": 95, "status": "final"}).status_code == 200
    bad_score = admin.post(f"/api/enrollments/{eid}/grades", json={"assessment": "Quiz 2", "score": 120})
    assert bad_score.status_code == 400
    bad_status = admin.post(f"/api/enrollments/{eid}/grades", json={"assessment": "Quiz 3", "score": 50, "status": "maybe"})
    assert bad_status.status_code == 400
    # upsert keeps one row per assessment
    admin.post(f"/api/enrollments/{eid}/grades", json={"assessment": "Quiz 1", "score": 70, "status": "final"})
    grades = admin.get(f"/api/enrollments/{eid}/grades").json()
    quiz = [g for g in grades if g["assessment"] == "Quiz 1"]
    assert len(quiz) == 1 and quiz[0]["score"] == 70


def test_attendance_validation_and_upsert(admin, scenario):
    eid = scenario["enrollment"]["id"]
    ok = admin.post(f"/api/enrollments/{eid}/attendance", json={"date": "2026-10-05", "status": "present"})
    assert ok.status_code == 200
    bad_status = admin.post(f"/api/enrollments/{eid}/attendance", json={"date": "2026-10-05", "status": "napping"})
    assert bad_status.status_code == 400
    bad_date = admin.post(f"/api/enrollments/{eid}/attendance", json={"date": "05/10/2026", "status": "present"})
    assert bad_date.status_code == 400
    update = admin.post(f"/api/enrollments/{eid}/attendance", json={"date": "2026-10-05", "status": "absent", "note": "w"})
    assert update.status_code == 200
    rows = admin.get(f"/api/enrollments/{eid}/attendance").json()
    assert len(rows) == 1 and rows[0]["status"] == "absent"
