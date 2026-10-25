"""Durable ChatKit store backed by SQLAlchemy.

Threads and items are kept as JSON blobs, which is what the ChatKit server guide
recommends: the wire models evolve with library versions, and storing them
verbatim means an upgrade does not require a migration of their internals.

Every row carries `owner` — the learner's id. That is not part of the ChatKit
contract, but it is the difference between "a chat app" and "a learning app with
private conversations": the store filters on it so one learner can never read
another learner's thread, including by guessing an id.
"""

from __future__ import annotations

import json
from typing import Any, Literal

from chatkit.store import NotFoundError, Page, Store, default_generate_id
from chatkit.types import Attachment, ThreadItem, ThreadMetadata
from sqlalchemy.orm import Session

from ..models import TutorAttachmentRow, TutorItemRow, TutorThreadRow

ItemType = Literal["thread", "message", "tool_call", "task", "workflow", "attachment", "sdk_hidden_context"]


class SqlChatKitStore(Store[dict[str, Any]]):
    """Store implementation bound to one database session per request.

    Every method that ChatKit awaits is `async`, because the base class awaits
    them: a plain `def` here returns None and fails at call time with
    "object NoneType can't be used in 'await' expression". The SQLAlchemy calls
    inside are synchronous and brief (local SQLite, or a pooled psycopg2
    connection), so they run on the event loop as-is; moving them to a worker
    thread would also need a per-thread session, which is a change for a later
    day rather than a silent one now.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    # ---------------------------------------------------------------- identifiers

    def generate_thread_id(self, context: dict[str, Any]) -> str:
        return default_generate_id("thread")

    def generate_item_id(
        self, item_type: ItemType, thread: ThreadMetadata, context: dict[str, Any]
    ) -> str:
        return default_generate_id(item_type)

    # --------------------------------------------------------------------- threads

    async def save_thread(self, thread: ThreadMetadata, context: dict[str, Any]) -> None:
        owner = context["owner"]
        row = self.db.get(TutorThreadRow, thread.id)
        payload = thread.model_dump_json()
        if row is None:
            self.db.add(
                TutorThreadRow(
                    id=thread.id,
                    owner=owner,
                    title=thread.title,
                    status=str(thread.status),
                    payload=payload,
                    created_at=thread.created_at,
                )
            )
        else:
            if row.owner != owner:
                raise NotFoundError(f"thread {thread.id} not found")
            row.title = thread.title
            row.status = str(thread.status)
            row.payload = payload
        self.db.commit()

    async def load_thread(self, thread_id: str, context: dict[str, Any]) -> ThreadMetadata:
        row = self.db.get(TutorThreadRow, thread_id)
        if row is None or row.owner != context["owner"]:
            raise NotFoundError(f"thread {thread_id} not found")
        return ThreadMetadata.model_validate_json(row.payload)

    async def load_threads(
        self, limit: int, after: str | None, order: str, context: dict[str, Any]
    ) -> Page[ThreadMetadata]:
        query = self.db.query(TutorThreadRow).filter(TutorThreadRow.owner == context["owner"])
        rows = query.order_by(TutorThreadRow.created_at.desc()).limit(limit + 1).all()

        # `after` is a thread id in the ChatKit protocol; start below it.
        if after:
            ids = [row.id for row in rows]
            if after in ids:
                rows = rows[ids.index(after) + 1 :]

        has_more = len(rows) > limit
        rows = rows[:limit]
        data = [ThreadMetadata.model_validate_json(row.payload) for row in rows]
        if order == "asc":
            data = list(reversed(data))
        return Page(data=data, has_more=has_more, after=data[-1].id if data else None)

    async def delete_thread(self, thread_id: str, context: dict[str, Any]) -> None:
        row = self.db.get(TutorThreadRow, thread_id)
        if row is None or row.owner != context["owner"]:
            raise NotFoundError(f"thread {thread_id} not found")
        self.db.query(TutorItemRow).filter(TutorItemRow.thread_id == thread_id).delete()
        self.db.delete(row)
        self.db.commit()

    # ----------------------------------------------------------------------- items

    async def save_item(self, thread_id: str, item: ThreadItem, context: dict[str, Any]) -> None:
        self._assert_owned(thread_id, context)
        row = self.db.get(TutorItemRow, item.id)
        payload = item.model_dump_json()
        if row is None:
            self.db.add(
                TutorItemRow(
                    id=item.id,
                    thread_id=thread_id,
                    owner=context["owner"],
                    type=str(item.type),
                    payload=payload,
                    created_at=item.created_at,
                )
            )
        else:
            row.payload = payload
        self.db.commit()

    async def add_thread_item(self, thread_id: str, item: ThreadItem, context: dict[str, Any]) -> None:
        await self.save_item(thread_id, item, context)

    async def load_item(self, thread_id: str, item_id: str, context: dict[str, Any]) -> ThreadItem:
        row = self.db.get(TutorItemRow, item_id)
        if row is None or row.owner != context["owner"] or row.thread_id != thread_id:
            raise NotFoundError(f"item {item_id} not found")
        return _parse_item(row.payload)

    async def load_thread_items(
        self,
        thread_id: str,
        after: str | None,
        limit: int,
        order: str,
        context: dict[str, Any],
    ) -> Page[ThreadItem]:
        self._assert_owned(thread_id, context)
        rows = (
            self.db.query(TutorItemRow)
            .filter(TutorItemRow.thread_id == thread_id, TutorItemRow.owner == context["owner"])
            .order_by(TutorItemRow.created_at.asc(), TutorItemRow.id.asc())
            .all()
        )
        if after:
            ids = [row.id for row in rows]
            if after in ids:
                rows = rows[ids.index(after) + 1 :]

        has_more = len(rows) > limit
        rows = rows[:limit]
        items = [_parse_item(row.payload) for row in rows]
        if order == "desc":
            items = list(reversed(items))
        return Page(data=items, has_more=has_more, after=items[-1].id if items else None)

    async def delete_thread_item(self, thread_id: str, item_id: str, context: dict[str, Any]) -> None:
        row = self.db.get(TutorItemRow, item_id)
        if row is None or row.owner != context["owner"] or row.thread_id != thread_id:
            raise NotFoundError(f"item {item_id} not found")
        self.db.delete(row)
        self.db.commit()

    # ----------------------------------------------------------------- attachments

    async def save_attachment(self, attachment: Attachment, context: dict[str, Any]) -> None:
        # Files are not accepted by this tutor; the row is kept so the protocol
        # stays coherent if an attachment ever reaches the server.
        self.db.add(
            TutorAttachmentRow(
                id=attachment.id,
                owner=context["owner"],
                payload=attachment.model_dump_json(),
            )
        )
        self.db.commit()

    async def load_attachment(self, attachment_id: str, context: dict[str, Any]) -> Attachment:
        row = self.db.get(TutorAttachmentRow, attachment_id)
        if row is None or row.owner != context["owner"]:
            raise NotFoundError(f"attachment {attachment_id} not found")
        return Attachment.model_validate_json(row.payload)

    async def delete_attachment(self, attachment_id: str, context: dict[str, Any]) -> None:
        row = self.db.get(TutorAttachmentRow, attachment_id)
        if row is None or row.owner != context["owner"]:
            raise NotFoundError(f"attachment {attachment_id} not found")
        self.db.delete(row)
        self.db.commit()

    # --------------------------------------------------------------------- helpers

    def _assert_owned(self, thread_id: str, context: dict[str, Any]) -> None:
        row = self.db.get(TutorThreadRow, thread_id)
        if row is None or row.owner != context["owner"]:
            raise NotFoundError(f"thread {thread_id} not found")


def _parse_item(payload: str) -> ThreadItem:
    """Rebuild a concrete item type from its stored JSON."""
    from pydantic import TypeAdapter

    from chatkit.types import ThreadItem as ThreadItemType

    return TypeAdapter(ThreadItemType).validate_python(json.loads(payload))
