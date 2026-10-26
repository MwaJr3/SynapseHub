"""SQLite schema: evidence items, chain of custody, analysis actions, timeline."""
from __future__ import annotations

import sqlite3

SCHEMA = """
CREATE TABLE IF NOT EXISTS evidence (
    id INTEGER PRIMARY KEY, path TEXT NOT NULL, sha256 TEXT NOT NULL, size INTEGER NOT NULL,
    mtime REAL, collected_by TEXT NOT NULL, collected_at TEXT NOT NULL, notes TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS custody_log (
    id INTEGER PRIMARY KEY, evidence_id INTEGER NOT NULL REFERENCES evidence(id),
    action TEXT NOT NULL, actor TEXT NOT NULL, at TEXT NOT NULL, detail TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS analysis_actions (
    id INTEGER PRIMARY KEY, evidence_id INTEGER REFERENCES evidence(id),
    action TEXT NOT NULL, actor TEXT NOT NULL, at TEXT NOT NULL, result TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_evidence_sha ON evidence(sha256);
CREATE INDEX IF NOT EXISTS idx_custody_evidence ON custody_log(evidence_id);
"""


def connect(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn
