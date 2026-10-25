"""Self-hosted ChatKit server for the Tessera tutor.

Implements the protocol from OpenAI's advanced ChatKit guide:
`ChatKitServer.respond` streams agent output through `stream_agent_response`,
and a single `POST` endpoint forwards request bodies to `server.process`.

The server is constructed per request with a database session, because the store
is SQL-backed and a session is not safe to share across threads.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from chatkit.agents import AgentContext, simple_to_agent_input, stream_agent_response
from chatkit.server import ChatKitServer
from chatkit.types import ThreadMetadata, UserMessageItem
from sqlalchemy.orm import Session

from .agent import build_agent
from .store import SqlChatKitStore


class TesseraChatKitServer(ChatKitServer[dict[str, Any]]):
    """ChatKit server that answers from the learner's own curriculum."""

    def __init__(self, db: Session, agent: Any | None = None) -> None:
        super().__init__(SqlChatKitStore(db))
        self.db = db
        self.agent = agent

    async def respond(
        self,
        thread: ThreadMetadata,
        input_user_message: UserMessageItem | None,
        context: dict[str, Any],
    ) -> AsyncIterator[Any]:
        from agents import Runner

        if self.agent is None:
            # Constructed lazily so importing this module never requires the SDK.
            self.agent = build_agent()

        items_page = await self.store.load_thread_items(
            thread.id, after=None, limit=20, order="asc", context=context
        )
        input_items = await simple_to_agent_input(items_page.data)

        agent_context = AgentContext(
            thread=thread,
            store=self.store,
            request_context=context,
        )
        result = Runner.run_streamed(self.agent, input_items, context=agent_context)
        async for event in stream_agent_response(agent_context, result):
            yield event
