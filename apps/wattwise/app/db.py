"""SQLite schema: readings (kWh meter totals or interval use), tariffs, alerts."""
from __future__ import annotations

import sqlite3

SCHEMA = """
CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY, meter TEXT NOT NULL, ts TEXT NOT NULL,
    kwh REAL NOT NULL, kind TEXT NOT NULL DEFAULT 'interval',   -- interval | meter_total
    UNIQUE(meter, ts, kind)
);
CREATE TABLE IF NOT EXISTS tariffs (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, rate_per_kwh REAL NOT NULL,
    standing_charge REAL DEFAULT 0, valid_from TEXT NOT NULL, valid_to TEXT,
    window_start INTEGER DEFAULT 0, window_end INTEGER DEFAULT 24   -- time-of-use hours [start,end)
);
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY, meter TEXT NOT NULL, ts TEXT NOT NULL,
    message TEXT NOT NULL, rule TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_readings_meter_ts ON readings(meter, ts);
"""


def connect(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn
