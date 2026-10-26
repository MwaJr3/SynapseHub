"""Seed ReachLearn with clearly-labelled SIMULATED demo data (simulator sends)."""
from __future__ import annotations

import json

from . import database
from .models import Cohort, CohortMember, Lesson, LearnerState, MessageJob, Subscription, User
from .security import hash_password

DEMO_PASSWORD = "demo-password-123"


def seed() -> dict:
    database.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "demo.educator@reachlearn.example").first()
        if existing:
            return {"skipped": True, "email": existing.email}
        educator = User(email="demo.educator@reachlearn.example", display_name="Demo Educator (simulated)",
                        password_hash=hash_password(DEMO_PASSWORD), role="educator")
        learner = User(email="demo.learner@reachlearn.example", display_name="Demo Learner (simulated)",
                       password_hash=hash_password(DEMO_PASSWORD), role="learner")
        admin = User(email="demo.admin@reachlearn.example", display_name="Demo Admin (simulated)",
                     password_hash=hash_password(DEMO_PASSWORD), role="admin")
        db.add_all([educator, learner, admin])
        db.flush()

        cohort = Cohort(name="Simulated numeracy cohort", educator_id=educator.id)
        db.add(cohort)
        db.flush()
        db.add(CohortMember(cohort_id=cohort.id, user_id=learner.id))

        l1 = Lesson(cohort_id=cohort.id, title="Counting 1-10 (simulated)", topic="counting", sequence=1,
                    body="Count along: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10.",
                    question="What comes after 7?",
                    options_json=json.dumps(["6", "8", "10"]), answer_index=1)
        l2 = Lesson(cohort_id=cohort.id, title="Adding 1 (simulated)", topic="addition", sequence=2,
                    body="Adding 1 moves to the next number: 4 + 1 = 5.",
                    question="What is 6 + 1?", options_json=json.dumps(["6", "7", "8"]), answer_index=1)
        db.add_all([l1, l2])

        db.add(Subscription(user_id=learner.id, cohort_id=cohort.id, consent="yes",
                            phone="+260-000-0000 (simulated)", timezone="Africa/Lusaka"))
        db.add(LearnerState(user_id=learner.id, current_lesson_id=l1.id, completed_count=1))
        db.add(MessageJob(user_id=learner.id, channel="sms", kind="lesson",
                          body="SIMULATED lesson message (not real carrier delivery).",
                          state="delivered", simulator="yes", provider_uid="sim-demo-1"))
        db.commit()
        return {"skipped": False, "educator": educator.email, "password": DEMO_PASSWORD}
    finally:
        db.close()


if __name__ == "__main__":
    print(seed())
