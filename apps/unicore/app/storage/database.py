"""SQLite storage layer: schema, connection, parameterised access only."""
from __future__ import annotations

import sqlite3

SCHEMA = """
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY, student_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL, email TEXT DEFAULT '', programme TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS lecturers (
    id INTEGER PRIMARY KEY, staff_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL, department TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
    credit_hours INTEGER NOT NULL DEFAULT 3, lecturer_id INTEGER REFERENCES lecturers(id)
);
CREATE TABLE IF NOT EXISTS enrolments (
    id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id),
    course_id INTEGER NOT NULL REFERENCES courses(id),
    grade REAL,
    UNIQUE(student_id, course_id)
);
"""


def connect(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn
