"""SQLite storage: posts, version history, schedule calendar."""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone

from .states import request_transition
from .validate import check_content

SCHEMA = """
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL,
    state TEXT DEFAULT 'draft', author TEXT NOT NULL,
    scheduled_at TEXT DEFAULT '', updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS versions (
    id INTEGER PRIMARY KEY, post_id INTEGER NOT NULL, saved_at TEXT NOT NULL,
    title TEXT NOT NULL, body TEXT NOT NULL, note TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS transitions (
    id INTEGER PRIMARY KEY, post_id INTEGER NOT NULL, at TEXT NOT NULL,
    actor TEXT NOT NULL, from_state TEXT NOT NULL, to_state TEXT NOT NULL
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

    def create(self, title: str, body: str, author: str) -> int:
        cur = self.conn.execute("INSERT INTO posts(title, body, author, updated_at) VALUES (?,?,?,?)",
                                (title, body, author, _now()))
        self.snapshot(cur.lastrowid, title, body, "created")
        self.conn.commit()
        return cur.lastrowid

    def snapshot(self, post_id: int, title: str, body: str, note: str) -> None:
        self.conn.execute("INSERT INTO versions(post_id, saved_at, title, body, note) VALUES (?,?,?,?,?)",
                          (post_id, _now(), title, body, note))

    def update(self, post_id: int, title: str, body: str, note: str = "edit") -> list[str]:
        problems = check_content(title, body)
        if problems:
            return problems
        self.conn.execute("UPDATE posts SET title=?, body=?, updated_at=? WHERE id=?",
                          (title, body, _now(), post_id))
        self.snapshot(post_id, title, body, note)
        self.conn.commit()
        return []

    def move(self, post_id: int, target: str, role: str, actor: str) -> dict:
        row = self.conn.execute("SELECT * FROM posts WHERE id=?", (post_id,)).fetchone()
        if row is None:
            raise ValueError("unknown post")
        request_transition(row["state"], target, role)
        if target == "published":
            problems = check_content(row["title"], row["body"], row["scheduled_at"])
            if problems:
                raise ValueError("cannot publish: " + "; ".join(problems))
        self.conn.execute("UPDATE posts SET state=?, updated_at=? WHERE id=?", (target, _now(), post_id))
        self.conn.execute("INSERT INTO transitions(post_id, at, actor, from_state, to_state) VALUES (?,?,?,?,?)",
                          (post_id, _now(), actor, row["state"], target))
        self.conn.commit()
        return {"post_id": post_id, "from": row["state"], "to": target, "actor": actor}

    def schedule(self, post_id: int, when: str) -> list[str]:
        row = self.conn.execute("SELECT * FROM posts WHERE id=?", (post_id,)).fetchone()
        if row is None:
            return ["unknown post"]
        problems = check_content(row["title"], row["body"], when)
        if problems:
            return problems
        self.conn.execute("UPDATE posts SET scheduled_at=? WHERE id=?", (when, post_id))
        self.conn.commit()
        return []

    def calendar(self) -> list[dict]:
        return [dict(r) for r in self.conn.execute(
            "SELECT id, title, state, scheduled_at FROM posts WHERE scheduled_at != '' ORDER BY scheduled_at")]

    def diff(self, post_id: int) -> list[dict]:
        rows = self.conn.execute("SELECT * FROM versions WHERE post_id=? ORDER BY id", (post_id,)).fetchall()
        out = []
        for prev, cur in zip(rows, rows[1:]):
            out.append({"note": cur["note"], "saved_at": cur["saved_at"],
                        "title_changed": prev["title"] != cur["title"],
                        "body_chars_before": len(prev["body"]), "body_chars_after": len(cur["body"]),
                        "added": len(cur["body"]) - len(prev["body"])})
        return out
