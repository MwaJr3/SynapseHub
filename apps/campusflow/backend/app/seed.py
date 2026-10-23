"""Seed CampusFlow with clearly-labelled SIMULATED demo data (fictional people)."""
from __future__ import annotations

import uuid

from . import database
from .logic import record_attendance, record_grade
from .models import Course, DemoFlag, Enrollment, GuardianLink, Section, Student, User
from .security import hash_password

DEMO_PASSWORD = "demo-password-123"


def seed() -> dict:
    database.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "demo.admin@campusflow.example").first()
        if existing:
            return {"skipped": True, "email": existing.email}

        admin = User(email="demo.admin@campusflow.example", display_name="Demo Registrar (simulated)",
                     password_hash=hash_password(DEMO_PASSWORD), role="admin")
        teacher = User(email="demo.teacher@campusflow.example", display_name="Demo Teacher (simulated)",
                       password_hash=hash_password(DEMO_PASSWORD), role="teacher")
        teacher2 = User(email="demo.teacher2@campusflow.example", display_name="Demo Teacher Two (simulated)",
                        password_hash=hash_password(DEMO_PASSWORD), role="teacher")
        parent = User(email="demo.parent@campusflow.example", display_name="Demo Parent (simulated)",
                      password_hash=hash_password(DEMO_PASSWORD), role="parent")
        student_user = User(email="demo.student@campusflow.example", display_name="Demo Student (simulated)",
                            password_hash=hash_password(DEMO_PASSWORD), role="student")
        db.add_all([admin, teacher, teacher2, parent, student_user])
        db.flush()

        alice = Student(uid=uuid.uuid4().hex, first_name="Demo", last_name="Zulu", enrollment_no="SIM-2026-001",
                        email="demo.student@campusflow.example", date_of_birth="2006-04-12")
        brian = Student(uid=uuid.uuid4().hex, first_name="Demo", last_name="Banda", enrollment_no="SIM-2026-002")
        chipo = Student(uid=uuid.uuid4().hex, first_name="Demo", last_name="Phiri", enrollment_no="SIM-2026-003")
        db.add_all([alice, brian, chipo])
        db.flush()

        db.add(GuardianLink(student_id=alice.id, user_id=parent.id))

        math101 = Course(code="SIM-MATH101", title="Foundations of Mathematics (simulated)", credit_hours=3,
                         description="Simulated first-year mathematics course.")
        cs101 = Course(code="SIM-CS101", title="Introduction to Computing (simulated)", credit_hours=4,
                       description="Simulated introductory computing course.")
        db.add_all([math101, cs101])
        db.flush()

        sec_math = Section(course_id=math101.id, teacher_id=teacher.id, term="2026-Fall", capacity=30)
        sec_cs = Section(course_id=cs101.id, teacher_id=teacher2.id, term="2026-Fall", capacity=30)
        db.add_all([sec_math, sec_cs])
        db.flush()

        e1 = Enrollment(student_id=alice.id, section_id=sec_math.id)
        e2 = Enrollment(student_id=alice.id, section_id=sec_cs.id)
        e3 = Enrollment(student_id=brian.id, section_id=sec_math.id)
        db.add_all([e1, e2, e3])
        db.commit()

        record_grade(db, e1, "Assignment 1", 78, "final")
        record_grade(db, e1, "Mid-term", 84, "final")
        record_grade(db, e1, "Final exam", 88, "draft")
        record_grade(db, e2, "Project", 91, "final")
        record_grade(db, e3, "Assignment 1", 55, "final")
        record_attendance(db, e1, "2026-10-05", "present")
        record_attendance(db, e1, "2026-10-06", "late", "Arrived 10 minutes late (simulated)")
        record_attendance(db, e2, "2026-10-05", "absent")

        db.add(DemoFlag(key="demo_data", value="SIMULATED — fictional students and results"))
        db.commit()
        return {
            "skipped": False,
            "admin": admin.email,
            "password": DEMO_PASSWORD,
            "students": 3,
            "sections": 2,
            "enrollments": 3,
        }
    finally:
        db.close()


if __name__ == "__main__":
    print(seed())
