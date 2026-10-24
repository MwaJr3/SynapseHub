"""Seed ClassConnect with clearly-labelled SIMULATED demo data."""
from __future__ import annotations

import json

from . import database
from .models import (
    Assignment, Attendance, Class, ClassEnrollment, LiveSession, Message, Poll, Submission, User,
)
from .security import hash_password

DEMO_PASSWORD = "demo-password-123"


def seed() -> dict:
    database.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "demo.teacher@classconnect.example").first()
        if existing:
            return {"skipped": True, "email": existing.email}
        teacher = User(email="demo.teacher@classconnect.example", display_name="Demo Teacher (simulated)",
                       password_hash=hash_password(DEMO_PASSWORD), role="teacher")
        learner = User(email="demo.learner@classconnect.example", display_name="Demo Learner (simulated)",
                       password_hash=hash_password(DEMO_PASSWORD), role="learner")
        learner2 = User(email="demo.learner2@classconnect.example", display_name="Demo Learner Two (simulated)",
                        password_hash=hash_password(DEMO_PASSWORD), role="learner")
        admin = User(email="demo.admin@classconnect.example", display_name="Demo Admin (simulated)",
                     password_hash=hash_password(DEMO_PASSWORD), role="admin")
        db.add_all([teacher, learner, learner2, admin])
        db.flush()

        cls = Class(name="Simulated Algebra Class", subject="Mathematics", teacher_id=teacher.id,
                    description="Demonstration class with simulated sessions and participants.")
        db.add(cls)
        db.flush()
        for u in (learner, learner2):
            db.add(ClassEnrollment(class_id=cls.id, user_id=u.id))

        past = LiveSession(class_id=cls.id, title="Intro session (simulated)",
                           objectives="Meet the class; baseline quiz.",
                           start_at="2026-10-20T09:00:00+00:00", end_at="2026-10-20T10:00:00+00:00",
                           status="ended", summary="Covered introductions and course goals. (simulated)")
        upcoming = LiveSession(class_id=cls.id, title="Linear equations (simulated)",
                               objectives="Solve one-step equations.",
                               start_at="2026-10-27T09:00:00+00:00", end_at="2026-10-27T10:00:00+00:00",
                               status="scheduled")
        db.add_all([past, upcoming])
        db.flush()

        db.add(Attendance(session_id=past.id, user_id=learner.id, state="present"))
        db.add(Attendance(session_id=past.id, user_id=learner2.id, state="late"))
        db.add(Message(session_id=past.id, user_id=learner.id, kind="question",
                       body="Will the recording be available? (simulated)"))
        db.add(Message(session_id=past.id, user_id=teacher.id, kind="note",
                       body="Recording is off unless consent is given. (simulated)"))
        db.add(Poll(session_id=past.id, question="Ready to start? (simulated)",
                    options_json=json.dumps(["Yes", "A little unsure", "No"]), votes_json=json.dumps({"Yes": 2})))
        assignment = Assignment(session_id=past.id, title="Practice set 1 (simulated)",
                                body="Complete questions 1-5.")
        db.add(assignment)
        db.flush()
        db.add(Submission(assignment_id=assignment.id, user_id=learner.id, body="Done — questions 1-5. (simulated)"))
        db.commit()
        return {"skipped": False, "teacher": teacher.email, "password": DEMO_PASSWORD}
    finally:
        db.close()


if __name__ == "__main__":
    print(seed())
