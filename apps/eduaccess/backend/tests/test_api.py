"""EduAccess API journeys: apply → review → allocate, ledger, isolation, appeals."""


def build_setup(provider):
    course = provider.post("/api/courses", json={"title": "Course A"}).json()
    plan = provider.post(f"/api/courses/{course['id']}/plans",
                         json={"kind": "scholarship", "evidence_required": "statement only"}).json()
    return course, plan


def test_apply_review_allocate_journey(app_env):
    from conftest import register

    provider = register(app_env, "p@example.com", "provider")
    reviewer = register(app_env, "r@example.com", "reviewer")
    learner = register(app_env, "l@example.com", "learner")
    sponsor = register(app_env, "s@example.com", "sponsor")
    course, plan = build_setup(provider)

    pool = sponsor.post("/api/pools", json={"name": "Pool", "seats_total": 2, "cash_total": 100}).json()

    application = learner.post("/api/applications", json={"plan_id": plan["id"], "statement": "please"}).json()
    assert application["status"] == "submitted"

    # decisions need reason; learner cannot decide their own case
    assert learner.post(f"/api/applications/{application['id']}/decision",
                        json={"status": "approved", "decision_reason": "ok", "pool_id": pool["id"]}).status_code == 403
    missing_reason = reviewer.post(f"/api/applications/{application['id']}/decision", json={"status": "approved"})
    assert missing_reason.status_code == 400

    assert reviewer.post(f"/api/applications/{application['id']}/decision",
                         json={"status": "under_review", "decision_reason": "reviewing"}).status_code == 200
    decided = reviewer.post(f"/api/applications/{application['id']}/decision",
                            json={"status": "approved", "decision_reason": "Meets documented criteria.", "pool_id": pool["id"]})
    assert decided.json()["status"] == "approved"

    # seat committed; pool caps prevent over-allocation
    pools = sponsor.get("/api/pools").json()
    assert pools[0]["seats_committed"] == 1 and pools[0]["seats_available"] == 1

    # fill the pool, then a second approval must fail or waitlist
    app2 = learner.post("/api/applications", json={"plan_id": plan["id"], "statement": "me too"}).json()
    reviewer.post(f"/api/applications/{app2['id']}/decision", json={"status": "under_review", "decision_reason": "checking"})
    reviewer.post(f"/api/applications/{app2['id']}/decision",
                  json={"status": "approved", "decision_reason": "ok", "pool_id": pool["id"]})
    app3 = learner.post("/api/applications", json={"plan_id": plan["id"], "statement": "third"}).json()
    reviewer.post(f"/api/applications/{app3['id']}/decision", json={"status": "under_review", "decision_reason": "c"})
    overflow = reviewer.post(f"/api/applications/{app3['id']}/decision",
                             json={"status": "approved", "decision_reason": "ok", "pool_id": pool["id"]})
    assert overflow.status_code == 409 and "waitlist" in overflow.json()["detail"]

    # appeals only for declined/waitlisted
    assert learner.post(f"/api/applications/{application['id']}/appeals", json={"reason": "reconsider"}).status_code == 400


def test_ledger_and_pending_honesty(app_env):
    from conftest import register

    finance = register(app_env, "f@example.com", "finance")
    teacher = register(app_env, "t@example.com", "provider")
    assert teacher.get("/api/ledger").status_code == 403

    finance.post("/api/ledger", json={"kind": "payment", "amount": 100, "status": "settled", "reference": "X"})
    finance.post("/api/ledger", json={"kind": "invoice", "amount": 40, "status": "pending", "reference": "Y"})
    finance.post("/api/ledger", json={"kind": "reversal", "amount": 10, "status": "settled", "reference": "Z"})

    ledger = finance.get("/api/ledger").json()
    assert ledger["balance"]["balance"] == 90.0
    assert ledger["balance"]["pending_not_settled"] == 40.0
    assert "NOT settled" in ledger["balance"]["note"]

    bad = finance.post("/api/ledger", json={"kind": "payment", "amount": 5, "status": "maybe"})
    assert bad.status_code == 400


def test_sponsor_isolation(app_env):
    from conftest import register

    sponsor_a = register(app_env, "a@example.com", "sponsor")
    sponsor_b = register(app_env, "b@example.com", "sponsor")
    pool_a = sponsor_a.post("/api/pools", json={"name": "A pool", "seats_total": 3}).json()

    # sponsor B cannot see pool A's listing or report
    assert [p["name"] for p in sponsor_b.get("/api/pools").json()] == []
    assert sponsor_b.get(f"/api/reports/sponsor/{pool_a['id']}").status_code == 404
    # sponsor A sees aggregates
    report = sponsor_a.get(f"/api/reports/sponsor/{pool_a['id']}").json()
    assert report["seats_total"] == 3 and "never exposed" in report["note"]


def test_appeal_flow_for_declined(app_env):
    from conftest import register

    provider = register(app_env, "p@example.com", "provider")
    reviewer = register(app_env, "r@example.com", "reviewer")
    learner = register(app_env, "l@example.com", "learner")
    course, plan = build_setup(provider)
    application = learner.post("/api/applications", json={"plan_id": plan["id"]}).json()
    reviewer.post(f"/api/applications/{application['id']}/decision", json={"status": "under_review", "decision_reason": "reviewing"})
    reviewer.post(f"/api/applications/{application['id']}/decision", json={"status": "declined", "decision_reason": "insufficient capacity"})
    appeal = learner.post(f"/api/applications/{application['id']}/appeals", json={"reason": "please reconsider"})
    assert appeal.json()["status"] == "open"
