"""Seed EduAccess with clearly-labelled SIMULATED demo data."""
from __future__ import annotations

import uuid

from . import database
from .models import AccessPlan, Application, Course, FundingPool, Transaction, User
from .security import hash_password

DEMO_PASSWORD = "demo-password-123"


def seed() -> dict:
    database.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "demo.learner@eduaccess.example").first()
        if existing:
            return {"skipped": True, "email": existing.email}
        learner = User(email="demo.learner@eduaccess.example", display_name="Demo Learner (simulated)",
                       password_hash=hash_password(DEMO_PASSWORD), role="learner")
        reviewer = User(email="demo.reviewer@eduaccess.example", display_name="Demo Reviewer (simulated)",
                        password_hash=hash_password(DEMO_PASSWORD), role="reviewer")
        finance = User(email="demo.finance@eduaccess.example", display_name="Demo Finance (simulated)",
                       password_hash=hash_password(DEMO_PASSWORD), role="finance")
        sponsor = User(email="demo.sponsor@eduaccess.example", display_name="Demo Sponsor (simulated)",
                       password_hash=hash_password(DEMO_PASSWORD), role="sponsor")
        admin = User(email="demo.admin@eduaccess.example", display_name="Demo Admin (simulated)",
                     password_hash=hash_password(DEMO_PASSWORD), role="admin")
        db.add_all([learner, reviewer, finance, sponsor, admin])
        db.flush()

        course = Course(title="Intro to Digital Skills (simulated)", provider="Demo Provider (fictional)",
                        description="Simulated demonstration course.")
        db.add(course)
        db.flush()
        scholarship = AccessPlan(course_id=course.id, kind="scholarship", price=0.0,
                                 evidence_required="Short statement only (no sensitive documents).")
        paid = AccessPlan(course_id=course.id, kind="paid", price=49.0)
        db.add_all([scholarship, paid])
        db.flush()

        pool = FundingPool(name="Simulated sponsor seats", sponsor_id=sponsor.id,
                           seats_total=5, seats_committed=1, cash_total=250.0,
                           criteria="first_generation; region:Lusaka",
                           window_start="2026-10-01", window_end="2026-12-31")
        db.add(pool)
        db.flush()

        application = Application(uid=uuid.uuid4().hex, learner_id=learner.id, plan_id=scholarship.id,
                                  statement="I want to learn digital skills. (simulated)",
                                  status="submitted", pool_id=None)
        db.add(application)
        db.add(Transaction(pool_id=pool.id, kind="payment", amount=250.0, status="settled",
                           reference="SIM-TX-001", note="Simulated settled payment."))
        db.add(Transaction(pool_id=pool.id, kind="invoice", amount=50.0, status="pending",
                           reference="SIM-TX-002", note="Simulated pending invoice (NOT settled)."))
        db.commit()
        return {"skipped": False, "learner": learner.email, "password": DEMO_PASSWORD}
    finally:
        db.close()


if __name__ == "__main__":
    print(seed())
