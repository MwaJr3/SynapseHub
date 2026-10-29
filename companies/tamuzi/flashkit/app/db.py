"""SQLite schema: card content is kept separate from review history."""
from __future__ import annotations

import sqlite3

SCHEMA = """
CREATE TABLE IF NOT EXISTS decks (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, subject TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY, deck_id INTEGER NOT NULL REFERENCES decks(id),
    front TEXT NOT NULL, back TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY, card_id INTEGER NOT NULL REFERENCES cards(id),
    reviewed_on TEXT NOT NULL,
    confidence INTEGER NOT NULL,   -- self-reported 1..5 (how sure the learner felt)
    correct INTEGER NOT NULL,      -- actual recall: 1 = got it right
    interval_days INTEGER NOT NULL,
    due_on TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_card ON reviews(card_id);
"""


def connect(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn
