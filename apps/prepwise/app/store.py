"""SQLite storage: questions bank, mock sessions, spaced review schedule."""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timedelta, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY, company TEXT NOT NULL, role TEXT NOT NULL,
    difficulty TEXT NOT NULL, topic TEXT NOT NULL, prompt TEXT NOT NULL,
    answer_template TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY, started_at TEXT NOT NULL, mode TEXT NOT NULL,
    question_ids TEXT NOT NULL, self_scores TEXT DEFAULT '[]', notes TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY, question_id INTEGER UNIQUE NOT NULL,
    box INTEGER DEFAULT 1, due_at TEXT NOT NULL, review_count INTEGER DEFAULT 0
);
"""


def connect(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Store:
    def __init__(self, db_path: str) -> None:
        self.conn = connect(db_path)

    def add_question(self, **q) -> int:
        cur = self.conn.execute(
            "INSERT INTO questions(company, role, difficulty, topic, prompt, answer_template) VALUES (?,?,?,?,?,?)",
            (q["company"], q["role"], q["difficulty"], q["topic"], q["prompt"], q.get("answer_template", "")))
        self.conn.commit()
        return cur.lastrowid

    def filter_questions(self, company: str = "", role: str = "", difficulty: str = "") -> list[dict]:
        sql = "SELECT * FROM questions WHERE 1=1"
        args: list = []
        if company:
            sql += " AND company=?"; args.append(company)
        if role:
            sql += " AND role=?"; args.append(role)
        if difficulty:
            sql += " AND difficulty=?"; args.append(difficulty)
        return [dict(r) for r in self.conn.execute(sql + " ORDER BY id", args)]

    def start_session(self, mode: str, question_ids: list[int]) -> int:
        cur = self.conn.execute("INSERT INTO sessions(started_at, mode, question_ids) VALUES (?,?,?)",
                                (_now().isoformat(), mode, json.dumps(question_ids)))
        self.conn.commit()
        return cur.lastrowid

    def finish_session(self, session_id: int, self_scores: list[int], notes: str = "") -> None:
        self.conn.execute("UPDATE sessions SET self_scores=?, notes=? WHERE id=?",
                          (json.dumps(self_scores), notes, session_id))
        self.conn.commit()

    def session_stats(self) -> dict:
        rows = self.conn.execute("SELECT self_scores FROM sessions WHERE self_scores != '[]'").fetchall()
        all_scores = []
        for r in rows:
            all_scores.extend(json.loads(r["self_scores"]))
        avg = round(sum(all_scores) / len(all_scores), 2) if all_scores else 0
        return {"sessions_completed": len(rows), "total_self_assessments": len(all_scores),
                "average_self_score": avg,
                "note": "Self-scores are the learner's own estimates — not verified performance."}

    # Spaced review: box 1..5 with growing intervals (Leitner-style). Widely
    # used spaced-repetition practice; NOT presented as a validated algorithm.
    INTERVALS = {1: 1, 2: 2, 3: 4, 4: 7, 5: 14}

    def schedule(self, question_id: int, remembered: bool) -> dict:
        row = self.conn.execute("SELECT * FROM reviews WHERE question_id=?", (question_id,)).fetchone()
        if row is None:
            # First review places the card at box 1 (needs work) or 2 (remembered).
            box = 2 if remembered else 1
            self.conn.execute("INSERT INTO reviews(question_id, box, due_at) VALUES (?,?,?)",
                              (question_id, box, (_now() + timedelta(days=self.INTERVALS[box])).isoformat()))
        else:
            box = min(5, row["box"] + 1) if remembered else 1
            self.conn.execute("UPDATE reviews SET box=?, due_at=?, review_count=review_count+1 WHERE id=?",
                              (box, (_now() + timedelta(days=self.INTERVALS[box])).isoformat(), row["id"]))
        self.conn.commit()
        return {"question_id": question_id, "box": box,
                "interval_days": self.INTERVALS[box],
                "schedule_note": "Leitner-style boxes (interval per box). Educational heuristic, not a clinical claim."}

    def due(self) -> list[dict]:
        return [dict(r) for r in self.conn.execute(
            "SELECT * FROM reviews WHERE due_at <= ? ORDER BY due_at", (_now().isoformat(),))]
