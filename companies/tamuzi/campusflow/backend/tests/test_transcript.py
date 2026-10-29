"""Transcript generation tests (computed from FINAL grades only)."""
from app import logic


def test_transcript_uses_final_grades_only(app_env, admin, scenario):
    from app.database import SessionLocal
    from app.models import Student

    eid = scenario["enrollment"]["id"]
    admin.post(f"/api/enrollments/{eid}/grades", json={"assessment": "Mid", "score": 80, "status": "final"})
    admin.post(f"/api/enrollments/{eid}/grades", json={"assessment": "Final", "score": 90, "status": "draft"})

    db = SessionLocal()
    student = db.query(Student).filter(Student.enrollment_no == "T-001").one()
    transcript = logic.build_transcript(db, student)
    db.close()

    assert len(transcript.lines) == 1
    # draft 90 must NOT affect the average: (80)/1 = 80 → B
    assert transcript.lines[0].average == 80.0
    assert transcript.lines[0].letter == "B"
    assert transcript.gpa == 3.0
    assert transcript.total_credits == 3


def test_transcript_multi_course_gpa(app_env, admin, scenario):
    sid = scenario["student"]["id"]
    e1 = scenario["enrollment"]["id"]
    e2 = admin.post("/api/enrollments", json={"student_id": sid, "section_id": scenario["other_section"]["id"]}).json()["id"]
    admin.post(f"/api/enrollments/{e1}/grades", json={"assessment": "A", "score": 95, "status": "final"})  # A → 4.0
    admin.post(f"/api/enrollments/{e2}/grades", json={"assessment": "B", "score": 72, "status": "final"})  # C → 2.0

    body = admin.get(f"/api/students/{sid}/transcript").json()
    assert body["total_credits"] == 6
    # (4.0*3 + 2.0*3) / 6 = 3.0
    assert body["gpa"] == 3.0
    codes = sorted(line["course_code"] for line in body["lines"])
    assert codes == ["MATH101", "MATH101"]


def test_empty_transcript_has_null_gpa(admin, scenario):
    body = admin.get(f"/api/students/{scenario['student']['id']}/transcript").json()
    assert body["gpa"] is None
    assert body["lines"] == []


def test_transcript_endpoint_shape(admin, scenario):
    eid = scenario["enrollment"]["id"]
    admin.post(f"/api/enrollments/{eid}/grades", json={"assessment": "A", "score": 88, "status": "final"})
    body = admin.get(f"/api/students/{scenario['student']['id']}/transcript").json()
    assert body["student_name"] == "Ada Sim"
    assert body["enrollment_no"] == "T-001"
    assert "computed_at" in body
