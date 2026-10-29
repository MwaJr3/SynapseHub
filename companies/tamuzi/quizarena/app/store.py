"""SQLite storage for quizzes, questions, attempts and moderation flags."""
from __future__ import annotations

import json
import random
import secrets
import sqlite3
from datetime import datetime, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '',
    author TEXT NOT NULL, status TEXT DEFAULT 'published', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY, quiz_id INTEGER NOT NULL, prompt TEXT NOT NULL,
    options TEXT NOT NULL, answer_index INTEGER NOT NULL, explanation TEXT DEFAULT '',
    difficulty TEXT DEFAULT 'medium', tags TEXT DEFAULT '', reported INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY, quiz_id INTEGER NOT NULL, player TEXT NOT NULL,
    seed TEXT NOT NULL, answers TEXT NOT NULL, score REAL NOT NULL,
    total INTEGER NOT NULL, completed_at TEXT NOT NULL, duration_seconds REAL DEFAULT 0
);
"""


def connect(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Store:
    def __init__(self, db_path: str) -> None:
        self.conn = connect(db_path)

    def create_quiz(self, title: str, description: str, author: str) -> int:
        cur = self.conn.execute(
            "INSERT INTO quizzes(title, description, author, created_at) VALUES (?,?,?,?)",
            (title, description, author, _now()))
        self.conn.commit()
        return cur.lastrowid

    def add_question(self, quiz_id: int, prompt: str, options: list[str], answer_index: int,
                     explanation: str = "", difficulty: str = "medium", tags: str = "") -> int:
        cur = self.conn.execute(
            "INSERT INTO questions(quiz_id, prompt, options, answer_index, explanation, difficulty, tags) "
            "VALUES (?,?,?,?,?,?,?)",
            (quiz_id, prompt, json.dumps(options), answer_index, explanation, difficulty, tags))
        self.conn.commit()
        return cur.lastrowid

    def questions(self, quiz_id: int) -> list[dict]:
        rows = self.conn.execute("SELECT * FROM questions WHERE quiz_id=? AND reported=0 ORDER BY id",
                                 (quiz_id,)).fetchall()
        return [dict(r) for r in rows]

    def record_attempt(self, quiz_id: int, player: str, seed: str, answers: list[int],
                       score: float, total: int, duration_seconds: float = 0) -> int:
        cur = self.conn.execute(
            "INSERT INTO attempts(quiz_id, player, seed, answers, score, total, completed_at, duration_seconds) "
            "VALUES (?,?,?,?,?,?,?,?)",
            (quiz_id, player, seed, json.dumps(answers), score, total, _now(), duration_seconds))
        self.conn.commit()
        return cur.lastrowid

    def leaderboard(self, quiz_id: int) -> list[dict]:
        rows = self.conn.execute(
            "SELECT player, MAX(score * 1.0 / total) AS pct, MIN(duration_seconds) AS best_time "
            "FROM attempts WHERE quiz_id=? GROUP BY player ORDER BY pct DESC, best_time ASC",
            (quiz_id,)).fetchall()
        return [{"rank": i + 1, "player": r["player"], "score_percent": round(r["pct"] * 100, 1),
                 "best_time_seconds": r["best_time"]} for i, r in enumerate(rows)]

    def report_question(self, question_id: int) -> bool:
        cur = self.conn.execute("UPDATE questions SET reported=1 WHERE id=?", (question_id,))
        self.conn.commit()
        return cur.rowcount == 1

    def reported_questions(self) -> list[dict]:
        return [dict(r) for r in self.conn.execute("SELECT * FROM questions WHERE reported=1 ORDER BY id")]

    def moderate(self, question_id: int, action: str) -> bool:
        if action == "restore":
            cur = self.conn.execute("UPDATE questions SET reported=0 WHERE id=?", (question_id,))
        else:  # remove
            cur = self.conn.execute("DELETE FROM questions WHERE id=? AND reported=1", (question_id,))
        self.conn.commit()
        return cur.rowcount == 1


def shuffled_order(n: int, seed: str) -> list[int]:
    """Deterministic question order per attempt: reproducible from the seed."""
    rng = random.Random(seed)
    order = list(range(n))
    rng.shuffle(order)
    return order
