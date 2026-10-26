"""Notes, tags, links, sources, lessons, versioned edits, search."""
from __future__ import annotations

from datetime import datetime, timezone


class NoteError(ValueError):
    pass


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Notes:
    def __init__(self, db_path: str) -> None:
        from .db import connect
        self.conn = connect(db_path)

    def add_note(self, title: str, body: str, topic: str = "") -> int:
        if not title.strip() or not body.strip():
            raise NoteError("Note title and body are required.")
        cur = self.conn.execute(
            "INSERT INTO notes(title, body, topic, updated_at) VALUES (?,?,?,?)",
            (title.strip(), body.strip(), topic.strip(), _now()))
        self.conn.commit()
        return cur.lastrowid

    def edit_note(self, note_id: int, title: str | None = None, body: str | None = None) -> dict:
        """Every edit snapshots the previous version first — content is never
        lost to an accidental overwrite (tested)."""
        row = self.conn.execute("SELECT * FROM notes WHERE id=?", (note_id,)).fetchone()
        if row is None:
            raise NoteError(f"No note {note_id}.")
        new_title = title.strip() if title is not None else row["title"]
        new_body = body.strip() if body is not None else row["body"]
        if not new_title or not new_body:
            raise NoteError("Note title and body must not be empty.")
        self.conn.execute(
            "INSERT INTO note_versions(note_id, title, body, saved_at) VALUES (?,?,?,?)",
            (note_id, row["title"], row["body"], _now()))
        self.conn.execute("UPDATE notes SET title=?, body=?, updated_at=? WHERE id=?",
                          (new_title, new_body, _now(), note_id))
        self.conn.commit()
        return {"note_id": note_id, "previous_saved": True}

    def versions(self, note_id: int) -> list[dict]:
        return [dict(r) for r in self.conn.execute(
            "SELECT id, title, saved_at FROM note_versions WHERE note_id=? ORDER BY id DESC",
            (note_id,)).fetchall()]

    def add_tag(self, note_id: int, tag: str) -> None:
        if not tag.strip():
            raise NoteError("Tag must not be empty.")
        if not self.conn.execute("SELECT 1 FROM notes WHERE id=?", (note_id,)).fetchone():
            raise NoteError(f"No note {note_id}.")
        self.conn.execute("INSERT OR IGNORE INTO tags(note_id, tag) VALUES (?,?)", (note_id, tag.strip().lower()))
        self.conn.commit()

    def link(self, from_id: int, to_id: int, relation: str = "related") -> None:
        for nid in (from_id, to_id):
            if not self.conn.execute("SELECT 1 FROM notes WHERE id=?", (nid,)).fetchone():
                raise NoteError(f"No note {nid}.")
        if from_id == to_id:
            raise NoteError("A note cannot link to itself.")
        self.conn.execute("INSERT OR IGNORE INTO links(from_id, to_id, relation) VALUES (?,?,?)",
                          (from_id, to_id, relation.strip() or "related"))
        self.conn.commit()

    def add_source(self, note_id: int | None, title: str, kind: str = "book", ref: str = "") -> int:
        """Sources are stored separately from notes — a note is never confused
        with the external material it references."""
        if not title.strip():
            raise NoteError("Source title is required.")
        if note_id is not None and not self.conn.execute("SELECT 1 FROM notes WHERE id=?", (note_id,)).fetchone():
            raise NoteError(f"No note {note_id}.")
        cur = self.conn.execute("INSERT INTO sources(note_id, title, kind, ref) VALUES (?,?,?,?)",
                                (note_id, title.strip(), kind.strip(), ref.strip()))
        self.conn.commit()
        return cur.lastrowid

    def add_lesson(self, note_id: int, summary: str) -> int:
        if not summary.strip():
            raise NoteError("Lesson summary is required.")
        if not self.conn.execute("SELECT 1 FROM notes WHERE id=?", (note_id,)).fetchone():
            raise NoteError(f"No note {note_id}.")
        cur = self.conn.execute("INSERT INTO lessons(note_id, summary) VALUES (?,?)", (note_id, summary.strip()))
        self.conn.commit()
        return cur.lastrowid

    def search(self, query: str) -> list[dict]:
        """Title matches rank above body matches (documented ranking)."""
        like = f"%{query.strip()}%"
        rows = self.conn.execute("SELECT * FROM notes WHERE title LIKE ? COLLATE NOCASE OR body LIKE ? COLLATE NOCASE", (like, like)).fetchall()
        def rank(r):
            in_title = query.lower() in r["title"].lower()
            return (0 if in_title else 1, r["title"])
        return [{"id": r["id"], "title": r["title"], "topic": r["topic"], "updated_at": r["updated_at"]}
                for r in sorted(rows, key=rank)]

    def list_notes(self) -> list[dict]:
        return self.search("")

    def related(self, note_id: int) -> list[dict]:
        rows = self.conn.execute(
            "SELECT n.id, n.title, l.relation FROM links l JOIN notes n ON n.id = l.to_id "
            "WHERE l.from_id=? UNION "
            "SELECT n.id, n.title, l.relation FROM links l JOIN notes n ON n.id = l.from_id "
            "WHERE l.to_id=?", (note_id, note_id)).fetchall()
        return [dict(r) for r in rows]
