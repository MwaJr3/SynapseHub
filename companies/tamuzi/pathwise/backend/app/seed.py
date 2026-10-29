"""Seed PathWise with clearly-labelled SIMULATED demo data."""
from __future__ import annotations

import json

from . import database
from .models import Assessment, AssessmentQuestion, Mastery, Question, Skill, SkillEdge, User
from .security import hash_password

DEMO_PASSWORD = "demo-password-123"


def seed() -> dict:
    database.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "demo.learner@pathwise.example").first()
        if existing:
            return {"skipped": True, "email": existing.email}

        learner = User(email="demo.learner@pathwise.example", display_name="Demo Learner (simulated)",
                       password_hash=hash_password(DEMO_PASSWORD), role="learner")
        teacher = User(email="demo.teacher@pathwise.example", display_name="Demo Teacher (simulated)",
                       password_hash=hash_password(DEMO_PASSWORD), role="teacher")
        admin = User(email="demo.admin@pathwise.example", display_name="Demo Admin (simulated)",
                     password_hash=hash_password(DEMO_PASSWORD), role="admin")
        db.add_all([learner, teacher, admin])
        db.flush()

        addition = Skill(name="Addition (simulated)", description="Adding whole numbers.")
        subtraction = Skill(name="Subtraction (simulated)", description="Subtracting whole numbers.")
        multiplication = Skill(name="Multiplication (simulated)", description="Times tables.")
        db.add_all([addition, subtraction, multiplication])
        db.flush()
        db.add(SkillEdge(skill_id=subtraction.id, prereq_skill_id=addition.id))
        db.add(SkillEdge(skill_id=multiplication.id, prereq_skill_id=addition.id))

        q1 = Question(skill_id=addition.id, kind="numeric", prompt="What is 7 + 5?",
                      choices_json=json.dumps([]), answer_json=json.dumps(12))
        q2 = Question(skill_id=addition.id, kind="mcq", prompt="Which equals 9 + 6?",
                      choices_json=json.dumps(["13", "15", "17"]), answer_json=json.dumps(1))
        q3 = Question(skill_id=subtraction.id, kind="numeric", prompt="What is 12 - 5?",
                      choices_json=json.dumps([]), answer_json=json.dumps(7))
        q4 = Question(skill_id=multiplication.id, kind="numeric", prompt="What is 6 x 4?",
                      choices_json=json.dumps([]), answer_json=json.dumps(24))
        q5 = Question(skill_id=multiplication.id, kind="short", prompt="Write 7 x 3 as a number.",
                      choices_json=json.dumps([]), answer_json=json.dumps(["21"]),
                      rubric="Award credit only for the numeric answer (manual review note).")
        db.add_all([q1, q2, q3, q4, q5])
        db.flush()

        diagnostic = Assessment(title="Simulated diagnostic (pre-test)", kind="diagnostic")
        posttest = Assessment(title="Simulated post-test", kind="posttest")
        db.add_all([diagnostic, posttest])
        db.flush()
        for pos, q in enumerate([q1, q3, q4]):
            db.add(AssessmentQuestion(assessment_id=diagnostic.id, question_id=q.id, position=pos))
        for pos, q in enumerate([q1, q3, q4, q5]):
            db.add(AssessmentQuestion(assessment_id=posttest.id, question_id=q.id, position=pos))

        # Demo learner: some evidence on addition only (thin evidence → uncertainty shown)
        db.add(Mastery(user_id=learner.id, skill_id=addition.id, score=80.0, evidence_count=2,
                       confidence="moderate", next_review=""))
        db.commit()
        return {"skipped": False, "learner": learner.email, "password": DEMO_PASSWORD}
    finally:
        db.close()


if __name__ == "__main__":
    print(seed())
