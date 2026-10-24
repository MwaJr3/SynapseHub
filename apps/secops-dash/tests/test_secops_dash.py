"""Tests: ingest validation, scoring, playbooks, status machine, provenance."""
from __future__ import annotations

import json

import pytest

from app.ingest import IngestError, load_events
from app.triage import build_incident, score_events, PLAYBOOKS


def test_ingest_loads_and_rejects_with_reasons():
    events, rejected = load_events("data/events.json")
    assert len(events) == 5
    assert len(rejected) == 2
    assert any("missing field: severity" in r["reasons"] for r in rejected)
    assert any("severity must be an integer 1..5" in r["reasons"] for r in rejected)
    assert all(e.collected_at for e in events)       # provenance timestamp always set


def test_ingest_missing_file():
    with pytest.raises(IngestError):
        load_events("data/nope.json")


def test_scoring_uses_criticality():
    assets = {"db-01": "critical", "web-01": "high"}
    evs = [{"asset": "db-01", "severity": 2}, {"asset": "web-01", "severity": 2}]
    assert score_events(evs, assets) == 2 * 4 + 2 * 3    # severity × (1 + weight)


def test_incident_playbook_and_timeline():
    assets = {"web-01": "high"}
    evs = [{"event_id": "E1", "asset": "web-01", "category": "network", "severity": 4,
            "summary": "beacon", "collected_at": "2026-01-01T00:00:00"},
           {"event_id": "E2", "asset": "web-01", "category": "network", "severity": 2,
            "summary": "scan", "collected_at": "2026-01-01T00:01:00"}]
    inc = build_incident("INC-001", evs, assets)
    assert inc.playbook == PLAYBOOKS["network"]
    assert len(inc.timeline) == 2 and inc.event_ids == ["E1", "E2"]
    assert "manual" in " ".join(inc.playbook).lower()
    with pytest.raises(ValueError):
        build_incident("INC-002", [], assets)


def test_status_machine_and_export_labels():
    from fastapi.testclient import TestClient
    import app.main as main
    main.STATE.update({"events": [], "rejected": [], "incidents": [], "assets": {}})
    c = TestClient(main.app)
    r = c.post("/incident/new", data={"event_ids": "EV-003", "analyst": "sam"}, follow_redirects=False)
    assert r.status_code == 303
    inc_id = main.STATE["incidents"][0].incident_id
    r = c.post(f"/incident/{inc_id}/status", data={"status": "closed"})
    assert r.status_code == 409                    # new -> closed illegal
    assert c.post(f"/incident/{inc_id}/status", data={"status": "triaged"},
                  follow_redirects=False).status_code == 303
    assert c.post(f"/incident/{inc_id}/status", data={"status": "contained"},
                  follow_redirects=False).status_code == 303
    assert c.post(f"/incident/{inc_id}/status", data={"status": "closed"},
                  follow_redirects=False).status_code == 303
    export = c.get(f"/incident/{inc_id}/export").json()
    assert "NOT proof of chronology" in export["integrity_note"]
    assert "no containment" in c.get(f"/incident/{inc_id}").text or "manual" in c.get(f"/incident/{inc_id}").text


def test_home_page_labels_simulation():
    from fastapi.testclient import TestClient
    import app.main as main
    main.STATE.update({"events": [], "rejected": [], "incidents": [], "assets": {}})
    c = TestClient(main.app)
    r = c.get("/")
    assert "Simulated security events" in r.text
    assert "not proof" in r.text.lower() or "discussion starting points" in r.text
