"""Rule matching + alert conversion tests (matches are labelled triage suggestions)."""
from app import rules as rule_engine
from app.models import Event, Rule


def make_rule(**kw):
    base = {"name": "R", "description": "", "category_match": "", "summary_contains": "", "severity": "medium", "enabled": "yes"}
    base.update(kw)
    rule = Rule(**base)
    return rule


def make_event(**kw):
    base = {"uid": "u", "occurred_at": "t", "source_ip": "", "category": "generic", "summary": "", "severity": "low", "raw_json": "{}"}
    base.update(kw)
    return Event(**base)


def test_matching_semantics():
    rule = make_rule(category_match="auth", summary_contains="failed")
    assert rule_engine.event_matches(rule, make_event(category="auth", summary="Failed sign-in"))
    assert not rule_engine.event_matches(rule, make_event(category="network", summary="Failed sign-in"))
    assert not rule_engine.event_matches(rule, make_event(category="auth", summary="success"))
    disabled = make_rule(category_match="auth", enabled="no")
    assert not rule_engine.event_matches(disabled, make_event(category="auth", summary="x"))
    empty = make_rule()
    assert not rule_engine.event_matches(empty, make_event(summary="x"))


def test_evaluate_creates_no_duplicates_and_labels_note(admin, scenario):
    first = admin.post("/api/rules/evaluate").json()
    assert first["created"] >= 1
    assert "not proof" in first["note"]
    second = admin.post("/api/rules/evaluate").json()
    assert second["created"] == 0  # no duplicate alerts

    alerts = admin.get("/api/alerts").json()
    assert alerts and alerts[0]["status"] == "open"
    assert "triage suggestion" in alerts[0]["note"]


def test_alert_convert_creates_incident_with_linked_event(admin, scenario):
    admin.post("/api/rules/evaluate")
    alerts = admin.get("/api/alerts").json()
    alert = alerts[0]
    result = admin.post(f"/api/alerts/{alert['id']}/convert").json()
    detail = admin.get(f"/api/incidents/{result['id']}").json()
    assert detail["status"] == "new"
    assert detail["events"] and detail["events"][0]["id"] == alert["event"]["id"]
    assert "not proof of an attack" in detail["description"]

    again = admin.post(f"/api/alerts/{alert['id']}/convert")
    assert again.status_code == 400  # only open alerts convert


def test_alert_dismiss(admin, scenario):
    admin.post("/api/rules/evaluate")
    alert = admin.get("/api/alerts").json()[0]
    admin.patch(f"/api/alerts/{alert['id']}", json={"note": "dismiss"})
    assert admin.get("/api/alerts", params={"status": "dismissed"}).json()[0]["id"] == alert["id"]
