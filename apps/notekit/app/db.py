"""SQLite schema. Notes keep version history to prevent accidental loss."""
from __future__ import annotations

import sqlite3

SCHEMA = """
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL,
    topic TEXT DEFAULT '', updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS note_versions (
    id INTEGER PRIMARY KEY, note_id INTEGER NOT NULL REFERENCES notes(id),
    title TEXT NOT NULL, body TEXT NOT NULL, saved_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tags (
    note_id INTEGER NOT NULL REFERENCES notes(id), tag TEXT NOT NULL,
    PRIMARY KEY (note_id, tag)
);
CREATE TABLE IF NOT EXISTS links (
    from_id INTEGER NOT NULL REFERENCES notes(id),
    to_id INTEGER NOT NULL REFERENCES notes(id),
    relation TEXT DEFAULT 'related',
    PRIMARY KEY (from_id, to_id)
);
CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY, note_id INTEGER REFERENCES notes(id),
    title TEXT NOT NULL, kind TEXT DEFAULT 'book', ref TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY, note_id INTEGER REFERENCES notes(id),
    summary TEXT NOT NULL
);
"""


def connect(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn
