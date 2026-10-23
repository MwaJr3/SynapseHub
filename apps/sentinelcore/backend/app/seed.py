"""Seed SentinelCore with clearly-labelled SIMULATED demo data (fictional events)."""
from __future__ import annotations

import json
import uuid

from . import database
from .models import Alert, DemoFlag, Event, Incident, IncidentEvent, Rule, User
from .security import hash_password

DEMO_PASSWORD = "demo-password-123"

DEMO_EVENTS = [
    ("2026-10-21T08:14:00Z", "203.0.113.7", "auth", "Repeated failed sign-in attempts for account mbanda", "medium",
     {"attempts": 8}),
    ("2026-10-21T08:16:00Z", "203.0.113.7", "auth", "Successful sign-in after repeated failures for account mbanda", "high",
     {"attempts_before_success": 8}),
    ("2026-10-21T09:02:00Z", "198.51.100.23", "auth", "Failed sign-in attempts across multiple accounts from one source", "medium",
     {"accounts": 4}),
    ("2026-10-22T13:40:00Z", "192.0.2.55", "malware", "Endpoint agent quarantined a suspicious file (simulated)", "high",
     {"file": "invoice_copy.scr"}),
    ("2026-10-22T15:11:00Z", "192.0.2.80", "network", "Unusual outbound traffic volume to an external address (simulated)", "medium",
     {"gb": 12}),
    ("2026-10-23T07:30:00Z", "203.0.113.90", "web", "Web application error-rate spike (simulated)", "low",
     {"errors_per_min": 120}),
    ("2026-10-23T08:00:00Z", "10.0.0.15", "auth", "Benign administrative sign-in (simulated baseline example)", "low", {}),
]

DEMO_RULES = [
    ("Failed sign-in burst", "Alert on repeated failed sign-ins.", "auth", "failed sign-in", "medium"),
    ("Success after failures", "Alert when a sign-in succeeds after repeated failures.", "auth",
     "after repeated failures", "high"),
    ("Quarantine events", "Alert when an endpoint agent quarantines a file.", "malware", "quarantined", "high"),
]


def seed() -> dict:
    database.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "demo.admin@sentinelcore.example").first()
        if existing:
            return {"skipped": True, "email": existing.email}

        admin = User(email="demo.admin@sentinelcore.example", display_name="Demo Admin (simulated)",
                     password_hash=hash_password(DEMO_PASSWORD), role="admin")
        analyst = User(email="demo.analyst@sentinelcore.example", display_name="Demo Analyst (simulated)",
                       password_hash=hash_password(DEMO_PASSWORD), role="analyst")
        viewer = User(email="demo.viewer@sentinelcore.example", display_name="Demo Viewer (simulated)",
                      password_hash=hash_password(DEMO_PASSWORD), role="viewer")
        db.add_all([admin, analyst, viewer])
        db.flush()

        events = []
        for occurred_at, source_ip, category, summary, severity, raw in DEMO_EVENTS:
            event = Event(uid=uuid.uuid4().hex, occurred_at=occurred_at, source_ip=source_ip, category=category,
                          summary=summary, severity=severity, raw_json=json.dumps(raw))
            db.add(event)
            events.append(event)
        db.flush()

        rules = []
        for name, description, category, contains, severity in DEMO_RULES:
            rule = Rule(name=name, description=description, category_match=category, summary_contains=contains,
                        severity=severity)
            db.add(rule)
            rules.append(rule)
        db.flush()

        # Deterministic demo alerts: rule × matching events
        from . import rules as rule_engine

        for match in rule_engine.evaluate(rules, events):
            db.add(Alert(uid=uuid.uuid4().hex, rule_id=match.rule_id, event_id=match.event_id, status="open",
                         note=rule_engine.MATCH_NOTE))
        db.flush()

        incident = Incident(
            uid=uuid.uuid4().hex,
            title="Suspicious sign-in pattern for account mbanda (simulated)",
            description=(
                "Demo incident built from simulated events. The pattern is under review; "
                "a suspicious pattern is not proof of an attack."
            ),
            severity="high",
            status="triaged",
            assignee_id=analyst.id,
            created_by=admin.id,
        )
        db.add(incident)
        db.flush()
        db.add(IncidentEvent(incident_id=incident.id, event_id=events[0].id))
        db.add(IncidentEvent(incident_id=incident.id, event_id=events[1].id))

        db.add(DemoFlag(key="demo_data", value="SIMULATED — fictional events and people"))
        db.commit()
        return {
            "skipped": False,
            "admin": admin.email,
            "analyst": analyst.email,
            "viewer": viewer.email,
            "password": DEMO_PASSWORD,
            "events": len(events),
            "rules": len(rules),
        }
    finally:
        db.close()


if __name__ == "__main__":
    print(seed())
