"""SQLite persistence: runs, records, changes with provenance."""
from __future__ import annotations

import hashlib
import json
import sqlite3
from datetime import datetime, timezone


SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY, source TEXT NOT NULL, started_at TEXT NOT NULL,
    status TEXT NOT NULL, pages_fetched INTEGER DEFAULT 0, note TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY, source TEXT NOT NULL, url TEXT NOT NULL,
    title TEXT NOT NULL, snippet TEXT DEFAULT '', content_hash TEXT NOT NULL,
    first_seen TEXT NOT NULL, last_seen TEXT NOT NULL, change_count INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_records_hash ON records(content_hash);
CREATE INDEX IF NOT EXISTS idx_records_source ON records(source);
"""


def connect(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Store:
    def __init__(self, db_path: str) -> None:
        self.conn = connect(db_path)

    def start_run(self, source: str) -> int:
        cur = self.conn.execute("INSERT INTO runs(source, started_at, status) VALUES (?,?,?)",
                                (source, _now(), "running"))
        self.conn.commit()
        return cur.lastrowid

    def finish_run(self, run_id: int, status: str, pages: int, note: str = "") -> None:
        self.conn.execute("UPDATE runs SET status=?, pages_fetched=?, note=? WHERE id=?",
                          (status, pages, note, run_id))
        self.conn.commit()

    def upsert_records(self, source: str, url: str, records: list[dict]) -> dict:
        """Stable identifiers: content hash of title+snippet. Duplicates dedupe;
        changed content increments change_count and reports a diff summary."""
        new = changed = unchanged = 0
        changes = []
        for rec in records:
            digest = hashlib.sha256((rec["title"] + "|" + rec.get("snippet", "")).encode()).hexdigest()
            row = self.conn.execute(
                "SELECT * FROM records WHERE source=? AND title=? AND url=?",
                (source, rec["title"], url)).fetchone()
            if row is None:
                self.conn.execute(
                    "INSERT INTO records(source, url, title, snippet, content_hash, first_seen, last_seen) "
                    "VALUES (?,?,?,?,?,?,?)", (source, url, rec["title"], rec.get("snippet", ""), digest, _now(), _now()))
                new += 1
            elif row["content_hash"] != digest:
                self.conn.execute(
                    "UPDATE records SET snippet=?, content_hash=?, last_seen=?, change_count=change_count+1 WHERE id=?",
                    (rec.get("snippet", ""), digest, _now(), row["id"]))
                changed += 1
                changes.append({"title": rec["title"], "before": row["snippet"], "after": rec.get("snippet", "")})
            else:
                self.conn.execute("UPDATE records SET last_seen=? WHERE id=?", (_now(), row["id"]))
                unchanged += 1
        self.conn.commit()
        return {"new": new, "changed": changed, "unchanged": unchanged,
                "diffs": changes[:10],
                "note": "Collection timestamps and source attribution are recorded with every run."}

    def history(self, source: str) -> list[dict]:
        return [dict(r) for r in self.conn.execute(
            "SELECT * FROM runs WHERE source=? ORDER BY id DESC LIMIT 20", (source,)).fetchall()]

    def records(self, source: str) -> list[dict]:
        return [dict(r) for r in self.conn.execute(
            "SELECT * FROM records WHERE source=? ORDER BY title", (source,)).fetchall()]
