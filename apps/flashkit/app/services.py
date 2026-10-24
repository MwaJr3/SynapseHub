"""Deck/card/review services with progress tracking."""
from __future__ import annotations

from datetime import date

from .db import connect
from .scheduler import ScheduleError, due_date, next_interval


class FlashcardError(ValueError):
    pass


class Flashcards:
    def __init__(self, db_path: str) -> None:
        self.conn = connect(db_path)

    def add_deck(self, name: str, subject: str = "") -> int:
        if not name.strip():
            raise FlashcardError("Deck name is required.")
        try:
            cur = self.conn.execute("INSERT INTO decks(name, subject) VALUES (?,?)", (name.strip(), subject.strip()))
        except Exception as exc:
            raise FlashcardError(f"Deck {name!r} already exists.") from exc
        self.conn.commit()
        return cur.lastrowid

    def add_card(self, deck_id: int, front: str, back: str) -> int:
        if not front.strip() or not back.strip():
            raise FlashcardError("Card front and back are required.")
        if not self.conn.execute("SELECT 1 FROM decks WHERE id=?", (deck_id,)).fetchone():
            raise FlashcardError(f"No deck {deck_id}.")
        cur = self.conn.execute("INSERT INTO cards(deck_id, front, back) VALUES (?,?,?)",
                                (deck_id, front.strip(), back.strip()))
        self.conn.commit()
        return cur.lastrowid

    def due_cards(self, deck_id: int, today: date | None = None) -> list[dict]:
        today = today or date.today()
        rows = self.conn.execute(
            "SELECT c.*, COALESCE((SELECT due_on FROM reviews r WHERE r.card_id=c.id "
            "ORDER BY r.id DESC LIMIT 1), ?) AS due_on FROM cards c "
            "WHERE c.deck_id=? ORDER BY due_on, c.id", (today.isoformat(), deck_id)).fetchall()
        return [dict(r) for r in rows if r["due_on"] <= today.isoformat()]

    def review(self, card_id: int, correct: bool, confidence: int, today: date | None = None) -> dict:
        """Record one review attempt. Confidence and correctness are stored
        separately — a confident wrong answer is visible in the history."""
        today = today or date.today()
        if not self.conn.execute("SELECT 1 FROM cards WHERE id=?", (card_id,)).fetchone():
            raise FlashcardError(f"No card {card_id}.")
        last = self.conn.execute(
            "SELECT interval_days FROM reviews WHERE card_id=? ORDER BY id DESC LIMIT 1",
            (card_id,)).fetchone()
        previous = last["interval_days"] if last else 1
        try:
            interval = next_interval(previous, correct, confidence)
        except ScheduleError as exc:
            raise FlashcardError(str(exc)) from exc
        due = due_date(today, interval)
        self.conn.execute(
            "INSERT INTO reviews(card_id, reviewed_on, confidence, correct, interval_days, due_on) "
            "VALUES (?,?,?,?,?,?)",
            (card_id, today.isoformat(), confidence, 1 if correct else 0, interval, due.isoformat()))
        self.conn.commit()
        return {"card_id": card_id, "interval_days": interval, "due_on": due.isoformat()}

    def progress(self, deck_id: int) -> dict:
        cards = self.conn.execute("SELECT COUNT(*) AS n FROM cards WHERE deck_id=?", (deck_id,)).fetchone()["n"]
        rows = self.conn.execute(
            "SELECT r.correct, r.confidence FROM reviews r JOIN cards c ON c.id=r.card_id "
            "WHERE c.deck_id=?", (deck_id,)).fetchall()
        attempts = len(rows)
        correct = sum(1 for r in rows if r["correct"])
        confident_wrong = sum(1 for r in rows if r["confidence"] >= 4 and not r["correct"])
        unsure_right = sum(1 for r in rows if r["confidence"] <= 2 and r["correct"])
        return {"cards": cards, "attempts": attempts, "correct": correct,
                "accuracy": round(correct / attempts, 3) if attempts else None,
                "confident_but_wrong": confident_wrong, "unsure_but_right": unsure_right,
                "note": "Accuracy reflects actual recall; confidence is tracked separately and never substituted for it."}
