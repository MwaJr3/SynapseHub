"""Seed TeachCraft with clearly-labelled SIMULATED demo content."""
from __future__ import annotations

import json

from . import database
from .models import Comment, Course, Lesson, LessonVersion, QuestionItem, Unit, User
from .security import hash_password

DEMO_PASSWORD = "demo-password-123"


def seed() -> dict:
    database.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "demo.teacher@teachcraft.example").first()
        if existing:
            return {"skipped": True, "email": existing.email}
        teacher = User(email="demo.teacher@teachcraft.example", display_name="Demo Teacher (simulated)",
                       password_hash=hash_password(DEMO_PASSWORD), role="teacher")
        reviewer = User(email="demo.reviewer@teachcraft.example", display_name="Demo Reviewer (simulated)",
                        password_hash=hash_password(DEMO_PASSWORD), role="reviewer")
        admin = User(email="demo.admin@teachcraft.example", display_name="Demo Admin (simulated)",
                     password_hash=hash_password(DEMO_PASSWORD), role="admin")
        db.add_all([teacher, reviewer, admin])
        db.flush()

        course = Course(title="Simulated Science Pack", subject="Science", grade="Grade 7",
                        license="CC BY 4.0 (demo content)")
        db.add(course)
        db.flush()
        unit = Unit(course_id=course.id, title="Matter", position=0)
        db.add(unit)
        db.flush()

        lesson = Lesson(
            unit_id=unit.id, title="States of matter (simulated demo)",
            objective="Describe solids, liquids and gases.",
            blocks_json=json.dumps([
                {"kind": "heading", "text": "Learning objectives"},
                {"kind": "list", "items": ["Describe the three states of matter", "Give everyday examples"]},
                {"kind": "heading", "text": "Explanation"},
                {"kind": "text", "text": "Matter comes in three common states: solid, liquid and gas. (simulated demo lesson)"},
                {"kind": "example", "text": "Ice melts into water, then boils into steam."},
                {"kind": "image", "alt": "Diagram: particles in solid, liquid and gas (alt text demo)"},
            ]),
            template="lesson_plan", status="draft", version=1, owner_id=teacher.id,
        )
        db.add(lesson)
        db.flush()
        db.add(LessonVersion(lesson_id=lesson.id, version=1, title=lesson.title,
                             blocks_json=lesson.blocks_json, change_summary="Initial draft", created_by=teacher.id))
        db.add(Comment(lesson_id=lesson.id, author_id=reviewer.id, body="Add a check-for-understanding question. (simulated)"))

        db.add(QuestionItem(owner_id=teacher.id, kind="single", prompt="Which state has a fixed shape?",
                            choices_json=json.dumps(["Solid", "Liquid", "Gas"]), answer_json=json.dumps(0),
                            tags="matter"))
        db.add(QuestionItem(owner_id=teacher.id, kind="multi", prompt="Select all liquids.",
                            choices_json=json.dumps(["Water", "Milk", "Rock", "Juice"]), answer_json=json.dumps([0, 1, 3]),
                            tags="matter"))
        db.commit()
        return {"skipped": False, "teacher": teacher.email, "password": DEMO_PASSWORD}
    finally:
        db.close()


if __name__ == "__main__":
    print(seed())
