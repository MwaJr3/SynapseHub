"""Conversation storage for the tutor, owned by Tessera rather than a vendor SDK.

Two tables hold everything: a thread row (whose owner is the learner) and message
rows with a small JSON payload. The payload shape is deliberately ours —
`{"role", "text", "citations"}` — so nothing here depends on another library's
wire model.

Ownership is not decoration. Every read and write filters on `owner`, so a learner
cannot reach another learner's conversation even with a valid thread id.
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from ..models import TutorItemRow, TutorThreadRow


class ThreadNotFound(LookupError):
    """Raised when a thread does not exist, or belongs to somebody else."""


@dataclass
class Citation:
    """A piece of curriculum the answer leaned on. Shown under the answer."""

    title: str
    citation: str
    source_url: str | None = None
    license_name: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "title": self.title,
            "citation": self.citation,
            "source_url": self.source_url,
            "license_name": self.license_name,
        }


@dataclass
class Message:
    id: str
    role: str
    text: str
    created_at: datetime
    citations: list[Citation] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "role": self.role,
            "text": self.text,
            "created_at": self.created_at.isoformat(),
            "citations": [citation.as_dict() for citation in self.citations],
        }


@dataclass
class Thread:
    id: str
    title: str
    created_at: datetime
    message_count: int = 0

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "created_at": self.created_at.isoformat(),
            "message_count": self.message_count,
        }


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ChatStore:
    """Threads and messages for one database session."""

    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------ threads

    def create_thread(self, owner: str, title: str = "") -> Thread:
        thread_id = f"thr_{uuid.uuid4().hex[:16]}"
        row = TutorThreadRow(
            id=thread_id,
            owner=owner,
            title=title[:300],
            status="active",
            payload="{}",
            created_at=_now(),
        )
        self.db.add(row)
        self.db.commit()
        return Thread(id=row.id, title=row.title, created_at=row.created_at)

    def list_threads(self, owner: str, limit: int = 20) -> list[Thread]:
        rows = (
            self.db.query(TutorThreadRow)
            .filter(TutorThreadRow.owner == owner)
            .order_by(TutorThreadRow.created_at.desc())
            .limit(limit)
            .all()
        )
        threads: list[Thread] = []
        for row in rows:
            count = (
                self.db.query(TutorItemRow)
                .filter(TutorItemRow.thread_id == row.id, TutorItemRow.owner == owner)
                .count()
            )
            threads.append(Thread(id=row.id, title=row.title, created_at=row.created_at, message_count=count))
        return threads

    def get_thread(self, owner: str, thread_id: str) -> Thread:
        row = self.db.get(TutorThreadRow, thread_id)
        if row is None or row.owner != owner:
            # Same error either way: never confirm that somebody else's thread exists.
            raise ThreadNotFound(thread_id)
        return Thread(id=row.id, title=row.title, created_at=row.created_at)

    def delete_thread(self, owner: str, thread_id: str) -> None:
        row = self.db.get(TutorThreadRow, thread_id)
        if row is None or row.owner != owner:
            raise ThreadNotFound(thread_id)
        self.db.query(TutorItemRow).filter(TutorItemRow.thread_id == thread_id).delete()
        self.db.delete(row)
        self.db.commit()

    # ----------------------------------------------------------------- messages

    def add_message(
        self,
        owner: str,
        thread_id: str,
        role: str,
        text: str,
        citations: list[Citation] | None = None,
    ) -> Message:
        self.get_thread(owner, thread_id)  # authority check before writing
        created = _now()
        payload = json.dumps(
            {
                "role": role,
                "text": text,
                "citations": [citation.as_dict() for citation in (citations or [])],
            },
            ensure_ascii=False,
        )
        row = TutorItemRow(
            id=f"msg_{uuid.uuid4().hex[:16]}",
            thread_id=thread_id,
            owner=owner,
            type="message",
            payload=payload,
            created_at=created,
        )
        self.db.add(row)
        self.db.commit()
        return Message(
            id=row.id, role=role, text=text, created_at=created, citations=citations or []
        )

    def load_messages(self, owner: str, thread_id: str, limit: int = 40) -> list[Message]:
        self.get_thread(owner, thread_id)
        rows = (
            self.db.query(TutorItemRow)
            .filter(TutorItemRow.thread_id == thread_id, TutorItemRow.owner == owner)
            .order_by(TutorItemRow.created_at.asc())
            .limit(limit)
            .all()
        )
        messages: list[Message] = []
        for row in rows:
            try:
                payload = json.loads(row.payload)
            except (TypeError, ValueError):
                continue
            citations = [
                Citation(
                    title=str(item.get("title", "")),
                    citation=str(item.get("citation", "")),
                    source_url=item.get("source_url"),
                    license_name=item.get("license_name"),
                )
                for item in payload.get("citations", [])
                if isinstance(item, dict)
            ]
            messages.append(
                Message(
                    id=row.id,
                    role=str(payload.get("role", "assistant")),
                    text=str(payload.get("text", "")),
                    created_at=row.created_at,
                    citations=citations,
                )
            )
        return messages
