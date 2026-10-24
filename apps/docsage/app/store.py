"""SQLite storage: pages, sources/citations, versions, review status, roles."""
from __future__ import annotations

import json
import re
import sqlite3
from datetime import datetime, timezone

from .index import TfidfIndex

SCHEMA = """
CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL,
    owner TEXT NOT NULL, status TEXT DEFAULT 'draft',       -- draft|in_review|published
    visibility TEXT DEFAULT 'team',                          -- team|restricted
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY, page_id INTEGER NOT NULL, label TEXT NOT NULL,
    locator TEXT NOT NULL, kind TEXT DEFAULT 'internal'      -- internal|configured-url
);
CREATE TABLE IF NOT EXISTS versions (
    id INTEGER PRIMARY KEY, page_id INTEGER NOT NULL, saved_at TEXT NOT NULL,
    title TEXT NOT NULL, body TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
    id INTEGER PRIMARY KEY, page_id INTEGER NOT NULL, at TEXT NOT NULL,
    actor TEXT NOT NULL, action TEXT NOT NULL, detail TEXT DEFAULT ''
);
"""

ALLOWED_URL_PREFIXES = ("https://github.com/", "https://docs.python.org/")   # configured allowlist


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
        self.index = TfidfIndex()
        for row in self.conn.execute("SELECT id, title, body FROM pages"):
            self.index.add(row["id"], row["title"] + " " + row["body"])

    def create_page(self, title: str, body: str, owner: str, visibility: str = "team") -> int:
        cur = self.conn.execute(
            "INSERT INTO pages(title, body, owner, visibility, updated_at) VALUES (?,?,?,?,?)",
            (title, body, owner, visibility, _now()))
        page_id = cur.lastrowid
        self.conn.execute("INSERT INTO versions(page_id, saved_at, title, body) VALUES (?,?,?,?)",
                          (page_id, _now(), title, body))
        self.audit(page_id, owner, "create", "")
        self.index.add(page_id, title + " " + body)
        self.conn.commit()
        return page_id

    def update_page(self, page_id: int, title: str, body: str, actor: str) -> None:
        self.conn.execute("UPDATE pages SET title=?, body=?, updated_at=? WHERE id=?",
                          (title, body, _now(), page_id))
        self.conn.execute("INSERT INTO versions(page_id, saved_at, title, body) VALUES (?,?,?,?)",
                          (page_id, _now(), title, body))
        self.audit(page_id, actor, "update", "")
        self.index.add(page_id, title + " " + body)
        self.conn.commit()

    def set_status(self, page_id: int, status: str, actor: str) -> None:
        if status not in ("draft", "in_review", "published"):
            raise ValueError(f"unknown status {status!r}")
        self.conn.execute("UPDATE pages SET status=? WHERE id=?", (status, page_id))
        self.audit(page_id, actor, "status", status)
        self.conn.commit()

    def add_source(self, page_id: int, label: str, locator: str, kind: str = "internal") -> str:
        if kind == "configured-url":
            if not locator.startswith(ALLOWED_URL_PREFIXES):
                return (f"URL not on the configured allowlist and was NOT added: {locator} "
                        f"(permitted prefixes: {', '.join(ALLOWED_URL_PREFIXES)})")
        self.conn.execute("INSERT INTO sources(page_id, label, locator, kind) VALUES (?,?,?,?)",
                          (page_id, label, locator, kind))
        self.audit(page_id, "system", "source", label)
        self.conn.commit()
        return ""

    def citations(self, page_id: int) -> list[dict]:
        return [dict(r) for r in self.conn.execute(
            "SELECT * FROM sources WHERE page_id=? ORDER BY id", (page_id,))]

    def audit(self, page_id: int, actor: str, action: str, detail: str) -> None:
        self.conn.execute("INSERT INTO audit(page_id, at, actor, action, detail) VALUES (?,?,?,?,?)",
                          (page_id, _now(), actor, action, detail))

    def version_diff(self, page_id: int) -> list[dict]:
        rows = self.conn.execute("SELECT * FROM versions WHERE page_id=? ORDER BY id", (page_id,)).fetchall()
        out = []
        for prev, cur in zip(rows, rows[1:]):
            out.append({"saved_at": cur["saved_at"],
                        "title_changed": prev["title"] != cur["title"],
                        "body_delta_chars": len(cur["body"]) - len(prev["body"])})
        return out

    def search(self, query: str, actor_role: str = "member") -> list[dict]:
        """Search honors visibility: restricted pages require the 'admin' role
        and are simply absent from member results (not blurred/hidden)."""
        results = []
        for doc_id, score in self.index.search(query):
            row = self.conn.execute("SELECT * FROM pages WHERE id=?", (doc_id,)).fetchone()
            if row is None:
                continue
            if row["visibility"] == "restricted" and actor_role != "admin":
                continue
            results.append({"id": row["id"], "title": row["title"], "status": row["status"],
                            "visibility": row["visibility"], "score": score,
                            "snippet": row["body"][:160]})
        return results

    def export_json(self) -> str:
        pages = [dict(r) for r in self.conn.execute("SELECT * FROM pages ORDER BY id")]
        sources = [dict(r) for r in self.conn.execute("SELECT * FROM sources ORDER BY id")]
        return json.dumps({"exported_at": _now(), "pages": pages, "sources": sources,
                           "note": "Internal export; re-import validates structure."}, indent=2)

    def import_json(self, payload: dict) -> dict:
        if "pages" not in payload:
            raise ValueError("import must contain 'pages'")
        imported, rejected = 0, []
        for p in payload["pages"]:
            if not isinstance(p, dict) or not p.get("title") or "body" not in p:
                rejected.append({"row": p, "reason": "missing title or body"})
                continue
            self.create_page(str(p["title"]), str(p["body"]), str(p.get("owner", "import")),
                             str(p.get("visibility", "team")))
            imported += 1
        return {"imported": imported, "rejected": rejected,
                "note": "Rejected rows are listed with reasons — nothing dropped silently."}
