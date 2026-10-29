"""LearnPulse API permissions and flag-workflow tests."""

CSV = """uid,occurred_at,kind,learner_ref,course,class_name,topic,assessment,value
t1,2026-10-01,assignment_missing,l1,c1,cls,fractions,,0
t2,2026-10-02,assignment_missing,l1,c1,cls,fractions,,0
t3,2026-10-03,lesson_completed,l2,c1,cls,fractions,,80
t4,2026-10-04,lesson_completed,l3,c1,cls,fractions,,70
"""


def test_import_dashboard_flags_journey(app_env):
    from conftest import register

    teacher = register(app_env, "t@example.com", "teacher")

    imported = teacher.post("/api/imports", json={"filename": "events.csv", "csv_text": CSV}).json()
    assert imported["rows_ok"] == 4 and imported["rows_rejected"] == 0

    # idempotent re-import
    again = teacher.post("/api/imports", json={"filename": "events.csv", "csv_text": CSV}).json()
    assert again["rows_ok"] == 0 and again["rows_rejected"] == 4

    dash = teacher.get("/api/dashboard").json()
    assert dash["summary"]["events"] == 4
    assert "not causation" in dash["note"]

    evaluated = teacher.post("/api/flags/evaluate").json()
    assert evaluated["created"] >= 1 and "not judgements" in evaluated["note"]
    flags = teacher.get("/api/flags").json()
    flag = next(f for f in flags if f["rule_key"] == "missed_assignments")
    assert flag["evidence"]["count"] == 2 and flag["evidence"]["event_uids"]

    updated = teacher.patch(f"/api/flags/{flag['id']}", json={"status": "actioned", "note": "spoke with family"})
    assert updated.json()["status"] == "actioned"
    ann = teacher.post(f"/api/flags/{flag['id']}/annotations", json={"body": "check-in done", "follow_up": "retry next week"})
    assert ann.status_code == 200

    report = teacher.get("/api/reports/export.json").json()
    assert "metric_definitions" in report and report["values"]["events"] == 4


def test_roles_and_metric_versioning(app_env):
    from conftest import register

    admin = register(app_env, "a@example.com", "admin")
    teacher = register(app_env, "t@example.com", "teacher")

    assert teacher.post("/api/imports", json={"filename": "x", "csv_text": CSV}).status_code == 200
    assert teacher.post("/api/metrics", json={"key": "k", "name": "n", "definition": "d"}).status_code == 403

    metric = admin.post("/api/metrics", json={"key": "k", "name": "n", "definition": "d", "threshold": 1}).json()
    assert metric["version"] == 1
    bumped = admin.patch(f"/api/metrics/{metric['id']}", json={"key": "k", "name": "n2", "definition": "d2", "threshold": 2})
    assert bumped.json()["version"] == 2

    assert teacher.get("/api/events").status_code == 200
    assert teacher.get("/api/cohorts").status_code == 200


def test_requires_authentication(app_env):
    from fastapi.testclient import TestClient
    from app import main

    anon = TestClient(main.app)
    assert anon.get("/api/dashboard").status_code == 401
    assert anon.get("/api/events").status_code == 401
