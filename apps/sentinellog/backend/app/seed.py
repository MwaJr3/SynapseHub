"""Seed the demo workspace: one fictional analyst account, a labelled sample
dataset (simulated logs), default detection rules and an analysis run.

Everything created here is synthetic demonstration data.
"""
from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from . import config, detection, parsing
from .database import SessionLocal, init_db
from .models import Dataset, DetectionRule, Finding, LogEvent, Report, User
from .reporting import build_summary
from .routes import _default_rules
from .security import hash_password

DEMO_EMAIL = "demo.analyst@sentinellog.example"
DEMO_PASSWORD = "demo-password-123"
SAMPLE_LOG = Path(__file__).resolve().parent.parent / "examples" / "sample_auth.log"


def seed(db: Session) -> dict:
    existing = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if existing:
        return {"skipped": True, "email": DEMO_EMAIL}

    user = User(
        email=DEMO_EMAIL,
        display_name="Demo Analyst (fictional)",
        password_hash=hash_password(DEMO_PASSWORD),
    )
    db.add(user)
    db.flush()

    for rule_in in _default_rules():
        db.add(DetectionRule(user_id=user.id, **rule_in.model_dump()))

    text = SAMPLE_LOG.read_text(encoding="utf-8")
    result = parsing.parse_upload(SAMPLE_LOG.name, text)
    dataset = Dataset(
        user_id=user.id,
        name="Simulated auth.log (brute-force demo)",
        original_filename=SAMPLE_LOG.name,
        stored_filename=f"seed-{SAMPLE_LOG.name}",
        file_format=result.file_format,
        size_bytes=len(text),
        record_count=len(result.records),
        error_count=len(result.errors),
        parse_errors=result.errors[:50],
        notes=config.DEMO_MODE_LABEL,
    )
    db.add(dataset)
    db.flush()
    for record in result.records:
        db.add(
            LogEvent(
                dataset_id=dataset.id,
                user_id=user.id,
                line_no=record.line_no,
                timestamp=record.timestamp,
                event_type=record.event_type,
                username=record.username,
                source_ip=record.source_ip,
                source_system=record.source_system,
                message=record.message,
                raw=record.raw,
            )
        )
    db.flush()

    events = db.query(LogEvent).filter(LogEvent.dataset_id == dataset.id).all()
    views = [
        detection.EventView(
            id=e.id, timestamp=e.timestamp, event_type=e.event_type, username=e.username, source_ip=e.source_ip, message=e.message
        )
        for e in events
    ]
    findings = 0
    for rule in db.query(DetectionRule).filter(DetectionRule.user_id == user.id).all():
        cfg = detection.RuleConfig(
            id=rule.id,
            name=rule.name,
            rule_type=rule.rule_type,
            threshold=rule.threshold,
            window_minutes=rule.window_minutes,
            severity=rule.severity,
            description=rule.description,
            runbook=rule.runbook,
        )
        for item in detection.run_rule(views, cfg):
            db.add(
                Finding(
                    user_id=user.id,
                    dataset_id=dataset.id,
                    rule_id=rule.id,
                    rule_name=item["rule_name"],
                    severity=item["severity"],
                    classification=item["classification"],
                    title=item["title"],
                    explanation=item["explanation"],
                    evidence=item["evidence"],
                )
            )
            findings += 1

    summary = build_summary(dataset, events, db.query(Finding).filter(Finding.dataset_id == dataset.id).all())
    db.add(Report(user_id=user.id, dataset_id=dataset.id, summary=summary))
    db.commit()
    return {"skipped": False, "email": DEMO_EMAIL, "dataset_id": dataset.id, "findings": findings}


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        result = seed(db)
        print(result)
    finally:
        db.close()


if __name__ == "__main__":
    main()
