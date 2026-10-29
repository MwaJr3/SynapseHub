"""SQLite persistence with explicit schema and parameterised queries."""
from __future__ import annotations

import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY, title TEXT NOT NULL, author TEXT NOT NULL, isbn TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS copies (
    id INTEGER PRIMARY KEY, book_id INTEGER NOT NULL REFERENCES books(id),
    label TEXT NOT NULL UNIQUE, condition TEXT DEFAULT 'good'
);
CREATE TABLE IF NOT EXISTS borrowers (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, contact TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY, copy_id INTEGER NOT NULL REFERENCES copies(id),
    borrower_id INTEGER NOT NULL REFERENCES borrowers(id),
    borrowed_on TEXT NOT NULL, due_on TEXT NOT NULL, returned_on TEXT
);
CREATE INDEX IF NOT EXISTS idx_loans_copy ON loans(copy_id, returned_on);
"""


def connect(path: str | Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn
