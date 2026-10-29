"""Seed LearnBridge with clearly-labelled SIMULATED demo data."""
from __future__ import annotations

import json

from . import database
from .models import Course, Enrollment, Lesson, Module, Note, Progress, Question, Quiz
from .security import hash_password

DEMO_PASSWORD = "demo-password-123"


def seed() -> dict:
    database.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        from .models import User

        existing = db.query(User).filter(User.email == "demo.learner@learnbridge.example").first()
        if existing:
            return {"skipped": True, "email": existing.email}

        learner = User(email="demo.learner@learnbridge.example", display_name="Demo Learner (simulated)",
                       password_hash=hash_password(DEMO_PASSWORD), role="learner")
        teacher = User(email="demo.teacher@learnbridge.example", display_name="Demo Teacher (simulated)",
                       password_hash=hash_password(DEMO_PASSWORD), role="instructor")
        admin = User(email="demo.admin@learnbridge.example", display_name="Demo Admin (simulated)",
                     password_hash=hash_password(DEMO_PASSWORD), role="admin")
        db.add_all([learner, teacher, admin])
        db.flush()

        course = Course(
            slug="algebra-foundations", title="Algebra Foundations (simulated demo)",
            subject="Mathematics", level="Grade 8-9", language="en", est_minutes=180,
            accessibility="Text-based lessons; all images have alt text in demo content.",
            license="CC BY 4.0 (demo content)", attribution="LearnBridge demo team (fictional)",
            description="Simulated demo course showing the LearnBridge study loop.",
        )
        db.add(course)
        db.flush()

        m1 = Module(course_id=course.id, title="Getting started", position=0)
        m2 = Module(course_id=course.id, title="Linear equations", position=1)
        db.add_all([m1, m2])
        db.flush()

        l1 = Lesson(module_id=m1.id, title="What is algebra?", position=0, est_minutes=15,
                    content_json=json.dumps([
                        {"kind": "text", "body": "Algebra uses letters to represent numbers. (simulated demo lesson)"},
                        {"kind": "example", "body": "If x + 3 = 7, then x = 4."},
                        {"kind": "practice", "body": "Try: y + 5 = 12"},
                    ]),
                    requirements_json=json.dumps({}), version="1.0")
        l2 = Lesson(module_id=m1.id, title="Variables and expressions", position=1, est_minutes=20,
                    content_json=json.dumps([{"kind": "text", "body": "An expression combines numbers and variables."}]),
                    requirements_json=json.dumps({"min_quiz_score": 60}), version="1.1")
        l3 = Lesson(module_id=m2.id, title="Solving one-step equations", position=0, est_minutes=25,
                    content_json=json.dumps([
                        {"kind": "text", "body": "Undo the operation on both sides."},
                        {"kind": "audio", "url": "https://example.invalid/demo-audio.mp3",
                         "note": "Audio opens only when online (demo placeholder link)."},
                    ]),
                    requirements_json=json.dumps({"min_quiz_score": 70}), version="1.0")
        db.add_all([l1, l2, l3])
        db.flush()

        quiz = Quiz(lesson_id=l2.id, title="Variables check",
                    settings_json=json.dumps({"show_explanations": "after_submit"}))
        db.add(quiz)
        db.flush()
        db.add_all([
            Question(quiz_id=quiz.id, kind="mcq", prompt="Which is a variable?", choices_json=json.dumps(["7", "x", "+"]),
                     answer_json=json.dumps(1), explanation="x is a letter standing for a number.", position=0),
            Question(quiz_id=quiz.id, kind="tf", prompt="2a means a + a.",
                     answer_json=json.dumps(True), explanation="Multiplication is repeated addition.", position=1),
            Question(quiz_id=quiz.id, kind="multi", prompt="Select all expressions with variables.",
                     choices_json=json.dumps(["3x", "5", "y+2", "8"]), answer_json=json.dumps([0, 2]),
                     explanation="3x and y+2 contain variables.", position=2),
            Question(quiz_id=quiz.id, kind="short", prompt="Solve: x + 4 = 9. x =",
                     choices_json=json.dumps([]), answer_json=json.dumps(["5", "five"]),
                     explanation="Subtract 4 from both sides.", position=3),
        ])

        enrollment = Enrollment(user_id=learner.id, course_id=course.id)
        db.add(enrollment)
        db.flush()
        db.add(Progress(enrollment_id=enrollment.id, lesson_id=l1.id, state="completed"))
        db.add(Progress(enrollment_id=enrollment.id, lesson_id=l2.id, state="in_progress", quiz_score=75.0))
        db.add(Note(user_id=learner.id, lesson_id=l2.id, body="Remember: expressions have no equals sign. (simulated)"))
        db.commit()
        return {"skipped": False, "learner": learner.email, "password": DEMO_PASSWORD}
    finally:
        db.close()


if __name__ == "__main__":
    print(seed())
