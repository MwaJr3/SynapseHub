def create(responder, **kw):
    body = {"title": "Suspicious login burst", "severity": "high", "description": "noted in logs"}
    body.update(kw)
    return responder.post("/api/incidents", json=body).json()["id"]


def test_lifecycle_flow_with_timeline_and_audit(responder, lead):
    inc = create(responder)
    responder.post(f"/api/incidents/{inc}/transition", json={"target": "triaged", "note": "confirmed"})
    responder.post(f"/api/incidents/{inc}/events", json={"entry": "containment started"})
    t = responder.post(f"/api/incidents/{inc}/tasks", json={"title": "block source IP"}).json()["id"]
    assert responder.patch(f"/api/tasks/{t}?status=in_progress").json()["status"] == "in_progress"
    responder.post(f"/api/incidents/{inc}/transition", json={"target": "contained"})
    responder.post(f"/api/incidents/{inc}/transition", json={"target": "resolved"})
    # responder may not close; lead may
    denied = responder.post(f"/api/incidents/{inc}/transition", json={"target": "closed"})
    assert denied.status_code == 403
    ok = lead.post(f"/api/incidents/{inc}/transition", json={"target": "closed", "note": "signed off"})
    assert ok.json()["status"] == "closed"
    detail = responder.get(f"/api/incidents/{inc}").json()
    assert detail["status"] == "closed"
    assert any("Status -> closed" in e["entry"] for e in detail["timeline"])
    report = responder.get(f"/api/incidents/{inc}/report").json()
    assert "not proof" in report["disclaimer"]
    audit = responder.get("/api/audit").json()
    assert any(e["action"] == "incident.transition" for e in audit["events"])
    assert "append-only" in audit["note"]


def test_illegal_transition_refused_with_409(responder):
    inc = create(responder)
    r = responder.post(f"/api/incidents/{inc}/transition", json={"target": "closed"})
    assert r.status_code == 409 and "illegal transition" in r.json()["error"]


def test_observer_is_read_only(observer):
    assert observer.post("/api/incidents", json={"title": "x"}).status_code == 403
    r = observer.get("/api/incidents")
    assert r.status_code == 200 and r.json()["incidents"] == []


def test_evidence_hashing_dedup_and_caveat(responder):
    inc = create(responder)
    r = responder.post(f"/api/incidents/{inc}/evidence",
                       json={"filename": "log-excerpt.txt", "content": "line one\nline two"})
    assert r.status_code == 200
    assert "integrity since collection only" in r.json()["note"]
    assert len(r.json()["sha256"]) == 64
    dup = responder.post(f"/api/incidents/{inc}/evidence",
                         json={"filename": "copy.txt", "content": "line one\nline two"})
    assert dup.status_code == 409 and "duplicate" in dup.json()["error"]


def test_assignment_requires_lead_or_responder_rights(responder, lead, observer):
    inc = create(responder)
    assert observer.post(f"/api/incidents/{inc}/assign", json={"assignee": "me"}).status_code == 403
    assert responder.post(f"/api/incidents/{inc}/assign", json={"assignee": "responder@example.org"}).status_code == 200
