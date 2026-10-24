"""ReachLearn API journeys: preview, consent/STOP, jobs, callbacks, permissions."""
import json


def make_lesson(educator):
    return educator.post("/api/lessons", json={
        "title": "Tens", "topic": "counting", "body": "10, 20, 30.",
        "question": "Next?", "options": ["40", "50"], "answer_index": 0,
    }).json()


def test_preview_channels_and_provider_honesty(app_env):
    from conftest import register

    educator = register(app_env, "e@example.com", "educator")
    lesson = make_lesson(educator)

    sms = educator.get(f"/api/lessons/{lesson['id']}/preview?channel=sms").json()
    assert sms["segments"] == 1 and "charset" in sms
    ussd = educator.get(f"/api/lessons/{lesson['id']}/preview?channel=ussd").json()
    assert "1. 40" in ussd["menu"]
    ivr = educator.get(f"/api/lessons/{lesson['id']}/preview?channel=ivr").json()
    assert "[PRESS 1]" in ivr["script"]

    provider = educator.get("/api/provider").json()
    assert provider["simulator"] is True and "SIMULATOR" in provider["message"]


def test_consent_stop_and_job_blocking(app_env):
    from conftest import register

    educator = register(app_env, "e@example.com", "educator")
    learner = register(app_env, "l@example.com", "learner")
    make_lesson(educator)

    # learner subscribes to the educator's cohort (id 1 seeded by creation flow)
    cohorts = educator.get("/api/jobs").json()  # touch role-gated endpoint
    assert cohorts == []
    from app.database import SessionLocal
    from app.models import Cohort

    db = SessionLocal()
    cohort = Cohort(name="C", educator_id=educator.get("/api/auth/me").json()["id"])
    db.add(cohort)
    db.commit()
    cohort_id = cohort.id
    db.close()

    sub = learner.post("/api/subscriptions", json={"cohort_id": cohort_id, "consent": "yes", "phone": "+260"}).json()
    assert sub["state"] == "active"

    job = educator.post("/api/jobs", json={"channel": "sms", "kind": "nudge", "body": "review time", "user_id": 2, "local_hour": 12})
    assert job.json()["state"] == "sent" and job.json()["simulator"] is True

    quiet = educator.post("/api/jobs", json={"channel": "sms", "kind": "lesson", "body": "late", "user_id": 2, "local_hour": 23}).json()
    assert quiet["state"] == "failed" and "quiet hours" in quiet["blocked_reason"]

    stopped = learner.post(f"/api/subscriptions/{sub['id']}/inbound", json={"text": "STOP"})
    assert stopped.json()["state"] == "opted_out"
    after = educator.post("/api/jobs", json={"channel": "sms", "kind": "lesson", "body": "more", "user_id": 2, "local_hour": 12}).json()
    assert after["state"] == "failed" and "opted out" in after["blocked_reason"]


def test_callbacks_idempotent_and_report(app_env):
    from conftest import register

    educator = register(app_env, "e@example.com", "educator")
    make_lesson(educator)
    job = educator.post("/api/jobs", json={"channel": "sms", "kind": "lesson", "body": "hi", "user_id": 99}).json()

    callback = {"provider_uid": f"sim-{job['id']}x", "status": "delivered"}
    # use the job's actual provider_uid
    jobs = educator.get("/api/jobs").json()
    callback["provider_uid"] = jobs[0]["provider_uid"]

    first = educator.post("/api/callbacks", json=callback)
    assert first.json() == {"applied": True, "status": "delivered"}
    second = educator.post("/api/callbacks", json=callback)
    assert second.json()["applied"] is False and "idempotent" in second.json()["reason"]

    assert educator.get("/api/jobs").json()[0]["state"] == "delivered"
    report = educator.get("/api/reports/completion").json()
    assert "missing evidence" in report["note"]


def test_role_permissions(app_env):
    from conftest import register

    educator = register(app_env, "e@example.com", "educator")
    learner = register(app_env, "l@example.com", "learner")
    assert learner.post("/api/lessons", json={"title": "x", "body": "y"}).status_code == 403
    assert learner.get("/api/jobs").status_code == 403
    assert learner.get("/api/reports/completion").status_code == 403
    assert educator.post("/api/lessons", json={"title": "x", "body": "y"}).status_code == 200
