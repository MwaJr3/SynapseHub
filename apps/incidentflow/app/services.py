"""Intake, custody, search, duplicate detection, reports."""
from __future__ import annotations

from datetime import datetime, timezone

from .db import connect
from .intake import EvidenceItem, IntakeError, build_timeline, collect


class EvidenceError(ValueError):
    pass


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class EvidenceStore:
    def __init__(self, db_path: str) -> None:
        self.conn = connect(db_path)

    def add_evidence(self, path: str, collected_by: str, notes: str = "") -> dict:
        item = collect(path, collected_by, notes)
        duplicate = self.conn.execute("SELECT id, path FROM evidence WHERE sha256=?",
                                      (item.sha256,)).fetchone()
        cur = self.conn.execute(
            "INSERT INTO evidence(path, sha256, size, mtime, collected_by, collected_at, notes) "
            "VALUES (?,?,?,?,?,?,?)",
            (item.path, item.sha256, item.size, item.mtime, item.collected_by, item.collected_at, item.notes))
        evidence_id = cur.lastrowid
        self.conn.execute(
            "INSERT INTO custody_log(evidence_id, action, actor, at, detail) VALUES (?,?,?,?,?)",
            (evidence_id, "collected", collected_by, _now(),
             f"sha256={item.sha256}; size={item.size}"))
        self.conn.commit()
        return {"id": evidence_id, "sha256": item.sha256,
                "duplicate_of": duplicate["id"] if duplicate else None,
                "duplicate_note": (f"content identical to evidence #{duplicate['id']} ({duplicate['path']})"
                                   if duplicate else "no content duplicate found")}

    def log_action(self, evidence_id: int, action: str, actor: str, result: str = "") -> None:
        if not self.conn.execute("SELECT 1 FROM evidence WHERE id=?", (evidence_id,)).fetchone():
            raise EvidenceError(f"No evidence {evidence_id}.")
        self.conn.execute("INSERT INTO analysis_actions(evidence_id, action, actor, at, result) VALUES (?,?,?,?,?)",
                          (evidence_id, action, actor, _now(), result))
        self.conn.execute("INSERT INTO custody_log(evidence_id, action, actor, at, detail) VALUES (?,?,?,?,?)",
                          (evidence_id, f"analysis:{action}", actor, _now(), result[:200]))
        self.conn.commit()

    def verify_hash(self, evidence_id: int, actor: str) -> dict:
        row = self.conn.execute("SELECT * FROM evidence WHERE id=?", (evidence_id,)).fetchone()
        if not row:
            raise EvidenceError(f"No evidence {evidence_id}.")
        from .intake import hash_file
        current = hash_file(row["path"])
        match = current == row["sha256"]
        self.log_action(evidence_id, "hash-verification", actor,
                        "match" if match else f"MISMATCH: current sha256={current}")
        return {"match": match, "recorded": row["sha256"], "current": current,
                "note": "A hash match confirms content integrity since collection; it does NOT prove "
                        "the authenticity of the collection process itself."}

    def search(self, query: str) -> list[dict]:
        like = f"%{query}%"
        rows = self.conn.execute("SELECT * FROM evidence WHERE path LIKE ? OR notes LIKE ? ORDER BY id",
                                 (like, like)).fetchall()
        return [dict(r) for r in rows]

    def timeline(self) -> list[dict]:
        entries = []
        for r in self.conn.execute("SELECT * FROM custody_log ORDER BY at").fetchall():
            entries.append((r["at"], f"custody:{r['action']}", f"{r['actor']} — {r['detail']}"))
        return build_timeline(entries)

    def report(self) -> dict:
        evidence = [dict(r) for r in self.conn.execute("SELECT * FROM evidence ORDER BY id").fetchall()]
        actions = [dict(r) for r in self.conn.execute("SELECT * FROM analysis_actions ORDER BY at").fetchall()]
        return {
            "evidence": evidence, "actions": actions, "timeline": self.timeline(),
            "limitations": [
                "Timelines are derived from file metadata and recorded actions; timestamps can be "
                "altered and are not proof of chronology.",
                "Hash verification proves content integrity since collection only — NOT the "
                "authenticity of the collection process.",
                "A general-purpose tool does not satisfy forensic or legal admissibility requirements.",
            ],
        }
