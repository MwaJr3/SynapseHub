"""Streaming chat for the tutor: our own small protocol, not a vendor's.

What was kept from ChatKit, because it was the good part:

* a thread per conversation, stored server-side rather than in the browser;
* token-by-token streaming, so the learner sees the answer form;
* citations travelling with the answer, not as an afterthought;
* a structured, retryable error event instead of a dead stream.

What was dropped, because it cost more than it gave:

* the vendor protocol and its Python server class;
* the iframe UI, which shipped from a third-party CDN and could not be styled
  or audited;
* the vendor store interface, whose async contract we had to bend our database
  layer into matching.

The wire format is Server-Sent Events with four event names, documented here and
consumed by `frontend/src/utils.ts` in `takeSseEvents`:

    event: delta      data: {"text": "..."}
    event: citations  data: {"citations": [{title, citation, source_url, license_name}]}
    event: error      data: {"message": "...", "retryable": true}
    event: done       data: {"thread_id": "...", "message_id": "..."}
"""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from typing import Any

from .agent import TutorConfig, build_agent
from .store import ChatStore, Citation

logger = logging.getLogger("tessera.tutor")

#: How much history is replayed to the model. Enough for follow-ups, not so much
#: that a long conversation becomes an expensive prompt.
HISTORY_LIMIT = 20


def sse(event: str, payload: dict[str, Any]) -> str:
    """One Server-Sent Event frame."""
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


def history_for_model(messages: list[Any]) -> list[dict[str, str]]:
    """Convert stored messages into the chat-completions shape.

    Only text is replayed. Citations are shown to the learner but not fed back to
    the model, which would otherwise start treating its own old citations as
    fresh evidence.
    """
    turns: list[dict[str, str]] = []
    for message in messages:
        role = "assistant" if message.role == "assistant" else "user"
        text = (message.text or "").strip()
        if text:
            turns.append({"role": role, "content": text})
    return turns


async def stream_reply(
    store: ChatStore,
    state: TutorConfig,
    owner: str,
    thread_id: str,
    user_text: str,
) -> AsyncIterator[str]:
    """Run one turn and yield SSE frames.

    The learner's message is stored before the model is called, so a provider
    failure loses the answer but not the question.
    """
    from agents import Runner

    history = history_for_model(store.load_messages(owner, thread_id, limit=HISTORY_LIMIT))
    store.add_message(owner, thread_id, "user", user_text)

    citations: list[Citation] = []
    agent = build_agent(config=state, citations=citations)
    emitted_citations = False

    try:
        result = Runner.run_streamed(
            agent,
            input=[*history, {"role": "user", "content": user_text}],
        )
        collected: list[str] = []
        async for event in result.stream_events():
            if getattr(event, "type", "") != "raw_response_event":
                continue
            data = getattr(event, "data", None)
            if getattr(data, "type", "") != "response.output_text.delta":
                continue

            # Retrieval happens inside the tool call, so the first delta is the
            # earliest point at which we know what grounded the answer.
            if citations and not emitted_citations:
                emitted_citations = True
                yield sse("citations", {"citations": [c.as_dict() for c in citations]})

            delta = getattr(data, "delta", "") or ""
            if delta:
                collected.append(delta)
                yield sse("delta", {"text": delta})

        answer = "".join(collected).strip()
        if not answer:
            yield sse(
                "error",
                {
                    "message": "The model returned nothing. Nothing has been added to this conversation.",
                    "retryable": True,
                },
            )
            return

        if citations and not emitted_citations:
            yield sse("citations", {"citations": [c.as_dict() for c in citations]})

        stored = store.add_message(owner, thread_id, "assistant", answer, citations)
        yield sse("done", {"thread_id": thread_id, "message_id": stored.id})

    except Exception:
        logger.exception("tutor generation failed")
        yield sse(
            "error",
            {
                "message": (
                    "The tutor could not reach the model provider, so nothing was generated. "
                    "Grounded search still works."
                ),
                "retryable": True,
            },
        )
