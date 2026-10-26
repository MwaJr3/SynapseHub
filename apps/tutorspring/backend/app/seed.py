"""Seed TutorSpring with clearly-labelled SIMULATED demo data."""
from __future__ import annotations

from . import database
from .models import Source, User
from .security import hash_password

DEMO_PASSWORD = "demo-password-123"

DEMO_SOURCES = [
    ("Fractions — basics (simulated)", "fractions", "Grade 6",
     "A fraction describes parts of a whole. The top number (numerator) counts parts; the bottom "
     "number (denominator) counts how many equal parts the whole is divided into. Example: 3/4 "
     "means 3 of 4 equal pieces."),
    ("Fractions — adding (simulated)", "fractions", "Grade 6",
     "To add fractions with the same denominator, add the numerators and keep the denominator: "
     "1/4 + 2/4 = 3/4. With different denominators, first convert to a common denominator."),
    ("Photosynthesis — overview (simulated)", "photosynthesis", "Grade 7",
     "Photosynthesis is how green plants make food using sunlight, water and carbon dioxide. "
     "The plant produces glucose and releases oxygen. The simplified equation: "
     "6CO2 + 6H2O + light -> C6H12O6 + 6O2."),
]


def seed() -> dict:
    database.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "demo.learner@tutorspring.example").first()
        if existing:
            return {"skipped": True, "email": existing.email}
        learner = User(email="demo.learner@tutorspring.example", display_name="Demo Learner (simulated)",
                       password_hash=hash_password(DEMO_PASSWORD), role="learner")
        teacher = User(email="demo.teacher@tutorspring.example", display_name="Demo Teacher (simulated)",
                       password_hash=hash_password(DEMO_PASSWORD), role="teacher")
        admin = User(email="demo.admin@tutorspring.example", display_name="Demo Admin (simulated)",
                     password_hash=hash_password(DEMO_PASSWORD), role="admin")
        db.add_all([learner, teacher, admin])
        db.flush()
        for title, topic, grade, body in DEMO_SOURCES:
            db.add(Source(title=title, topic=topic, grade=grade, body=body, created_by=teacher.id))
        db.commit()
        return {"skipped": False, "learner": learner.email, "password": DEMO_PASSWORD, "sources": len(DEMO_SOURCES)}
    finally:
        db.close()


if __name__ == "__main__":
    print(seed())
