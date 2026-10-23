"""Seed ChessScope with a labelled SIMULATED demo account + one example game."""
from __future__ import annotations

import json
import uuid

from .database import Base, SessionLocal, engine
from .models import Game, User
from .security import hash_password

DEMO_PASSWORD = "demo-password-123"

# A short simulated game (Scholar's mate pattern) — clearly labelled demo data.
DEMO_PGN = """[Event "Simulated demo game"]
[Site "ChessScope demo"]
[Date "2026.10.23"]
[White "Demo Player A (simulated)"]
[Black "Demo Player B (simulated)"]
[Result "1-0"]
[Opening "Scholar's mate pattern (demo)"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0
"""


def seed() -> dict:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "demo.player@chessscope.example").first()
        if existing:
            return {"skipped": True, "email": existing.email}
        user = User(
            email="demo.player@chessscope.example",
            display_name="Demo Player (simulated)",
            password_hash=hash_password(DEMO_PASSWORD),
        )
        db.add(user)
        db.flush()
        db.add(
            Game(
                uid=uuid.uuid4().hex,
                user_id=user.id,
                white="Demo Player A (simulated)",
                black="Demo Player B (simulated)",
                result="1-0",
                headers_json=json.dumps(
                    {"White": "Demo Player A (simulated)", "Black": "Demo Player B (simulated)", "Result": "1-0",
                     "Date": "2026.10.23", "Event": "Simulated demo game", "Opening": "Scholar's mate pattern (demo)"}
                ),
                pgn_text=DEMO_PGN,
            )
        )
        db.commit()
        return {"skipped": False, "email": user.email, "password": DEMO_PASSWORD}
    finally:
        db.close()


if __name__ == "__main__":
    print(seed())
