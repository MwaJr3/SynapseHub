"""Seed LearnPulse with clearly-labelled SYNTHETIC demo events."""
from __future__ import annotations

from . import database
from .models import Event, ImportBatch, MetricDefinition, User
from .security import hash_password

DEMO_PASSWORD = "demo-password-123"

CSV = """uid,occurred_at,kind,learner_ref,course,class_name,topic,assessment,value
sim-001,2026-10-01,lesson_completed,learner-a,sim-math,class-a,fractions,,80
sim-002,2026-10-02,quiz_attempt,learner-a,sim-math,class-a,fractions,quiz-1,72
sim-003,2026-10-03,quiz_attempt,learner-a,sim-math,class-a,fractions,quiz-2,45
sim-004,2026-10-04,quiz_attempt,learner-a,sim-math,class-a,fractions,quiz-3,38
sim-005,2026-10-05,quiz_attempt,learner-a,sim-math,class-a,fractions,quiz-4,41
sim-006,2026-10-02,assignment_missing,learner-a,sim-math,class-a,fractions,,0
sim-007,2026-10-06,assignment_missing,learner-a,sim-math,class-a,fractions,,0
sim-008,2026-10-02,lesson_completed,learner-b,sim-math,class-a,fractions,,90
sim-009,2026-10-03,quiz_attempt,learner-b,sim-math,class-a,fractions,quiz-1,88
sim-010,2026-10-04,assignment_submitted,learner-b,sim-math,class-a,fractions,,95
sim-011,2026-10-02,help_requested,learner-c,sim-math,class-a,decimals,,0
sim-012,2026-10-05,quiz_attempt,learner-c,sim-math,class-a,decimals,quiz-1,60
sim-013,2026-10-05,lesson_completed,learner-d,sim-math,class-b,decimals,,70
"""


def seed() -> dict:
    database.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "demo.teacher@learnpulse.example").first()
        if existing:
            return {"skipped": True, "email": existing.email}
        teacher = User(email="demo.teacher@learnpulse.example", display_name="Demo Teacher (simulated)",
                       password_hash=hash_password(DEMO_PASSWORD), role="teacher")
        admin = User(email="demo.admin@learnpulse.example", display_name="Demo Admin (simulated)",
                     password_hash=hash_password(DEMO_PASSWORD), role="admin")
        db.add_all([teacher, admin])
        db.flush()

        batch = ImportBatch(filename="demo-events.csv (synthetic)", rows_ok=0, rows_rejected=0,
                            rejected_json="[]", created_by=teacher.id)
        db.add(batch)
        db.flush()

        from . import core

        result = core.parse_events_csv(CSV, set())
        batch.rows_ok = len(result.rows_ok)
        batch.rows_rejected = len(result.rejected)
        batch.rejected_json = __import__("json").dumps(result.rejected)
        for row in result.rows_ok:
            db.add(Event(source_import_id=batch.id, **row))

        db.add(MetricDefinition(key="quiz_avg", name="Average quiz score",
                                definition="Mean of quiz_attempt values in range (0-100).", threshold=50.0))
        db.add(MetricDefinition(key="missed_assignments", name="Missing assignments",
                                definition="Count of assignment_missing events in range.", threshold=2.0))
        db.commit()
        return {"skipped": False, "teacher": teacher.email, "password": DEMO_PASSWORD,
                "synthetic_events": batch.rows_ok}
    finally:
        db.close()


if __name__ == "__main__":
    print(seed())
