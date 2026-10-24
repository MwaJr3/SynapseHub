"""Migrations must apply cleanly to a fresh database (dev SQLite or PostgreSQL)."""
import os
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]


def test_alembic_upgrade_head_builds_schema(tmp_path):
    env = {**os.environ, "DATABASE_URL": f"sqlite:///{tmp_path}/migrate.db"}
    r = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"],
                       cwd=BACKEND, env=env, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    import sqlite3
    con = sqlite3.connect(tmp_path / "migrate.db")
    tables = {row[0] for row in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {"users", "sessions", "reset_tokens", "incidents", "events", "evidence", "tasks", "audit"} <= tables
