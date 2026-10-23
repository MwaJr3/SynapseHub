"""Seed CircuitLab Calc with a labelled SIMULATED demo account + one example calculation."""
from __future__ import annotations

import json
import uuid

from .database import Base, SessionLocal, engine
from .models import SavedCalculation, User
from .security import hash_password

DEMO_PASSWORD = "demo-password-123"


def seed() -> dict:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "demo.eng@circuits.example").first()
        if existing:
            return {"skipped": True, "email": existing.email}
        user = User(
            email="demo.eng@circuits.example",
            display_name="Demo Engineer (simulated)",
            password_hash=hash_password(DEMO_PASSWORD),
        )
        db.add(user)
        db.flush()
        db.add(
            SavedCalculation(
                uid=uuid.uuid4().hex,
                user_id=user.id,
                name="Example: unloaded 5V divider (simulated)",
                kind="divider",
                inputs_json=json.dumps({"supply_v": 5.0, "r1": 1000.0, "r2": 2000.0}),
                result_json=json.dumps({"value": 3.3333333333333335, "unit": "V"}),
            )
        )
        db.commit()
        return {"skipped": False, "email": user.email, "password": DEMO_PASSWORD}
    finally:
        db.close()


if __name__ == "__main__":
    print(seed())
