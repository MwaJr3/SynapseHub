"""The streaming chat endpoint, over real HTTP, against a local provider.

No vendor SDK sits between the route and the model: the route creates a thread,
streams the reply as Server-Sent Events, stores both turns with the citations the
answer used, and reports provider failure as a retryable error event.

The provider is the local stub — same wire format as Hugging Face's router, Groq
or Ollama — so none of this needs an account.
"""
from __future__ import annotations

import json
import uuid

import pytest

from stub_provider import RunningProvider


def register(client) -> str:
    email = f"chat-{uuid.uuid4().hex[:8]}@example.test"
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "correct horse battery", "display_name": "Chat Learner"},
    )
    assert response.status_code == 200, response.text
    return email


def events(text: str) -> list[tuple[str, dict]]:
    """Parse an SSE body into (event, payload) pairs."""
    parsed: list[tuple[str, dict]] = []
    for block in text.split("\n\n"):
        if not block.strip():
            continue
        name = ""
        data = ""
        for line in block.splitlines():
            if line.startswith("event: "):
                name = line[len("event: "):]
            elif line.startswith("data: "):
                data += line[len("data: "):]
        parsed.append((name, json.loads(data) if data else {}))
    return parsed


def done_thread_id(text: str) -> str:
    return next(payload for name, payload in events(text) if name == "done")["thread_id"]


@pytest.fixture()
def provider(monkeypatch):
    with RunningProvider() as running:
        monkeypatch.setenv("TESSERA_TUTOR_BASE_URL", running.base_url)
        monkeypatch.setenv("TESSERA_TUTOR_MODEL", "stub-model")
        monkeypatch.setenv("TESSERA_TUTOR_API_KEY", "stub-key")
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)
        yield running


def test_the_reply_streams_with_citations_and_a_done_event(client, provider):
    register(client)

    response = client.post("/api/tutor/chat", json={"message": "why is a bare except risky"})

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")

    stream = events(response.text)
    names = [name for name, _ in stream]
    assert "delta" in names
    assert "citations" in names
    assert names[-1] == "done"

    answer = "".join(payload["text"] for name, payload in stream if name == "delta")
    assert "Concept: Exceptions and error handling" in answer

    citations = next(payload["citations"] for name, payload in stream if name == "citations")
    assert citations[0]["title"] == "Exceptions and error handling"
    assert citations[0]["license_name"]


def test_the_answer_was_grounded_before_it_was_written(client, provider):
    register(client)
    client.post("/api/tutor/chat", json={"message": "why is a bare except risky"})

    assert len(provider.requests) == 2, "the model must retrieve, then answer"
    second = json.dumps(provider.requests[1])
    assert "Citation" in second
    assert "Exceptions and error handling" in second


def test_both_turns_are_stored_for_that_learner_only(client, provider):
    from app.database import SessionLocal
    from app.models import TutorItemRow, TutorThreadRow, User

    email = register(client)
    response = client.post("/api/tutor/chat", json={"message": "why is a bare except risky"})
    thread_id = done_thread_id(response.text)

    db = SessionLocal()
    try:
        owner = db.query(User).filter(User.email == email).one().id
        thread = db.get(TutorThreadRow, thread_id)
        assert thread is not None and thread.owner == owner
        rows = db.query(TutorItemRow).filter(TutorItemRow.thread_id == thread_id).all()
        assert [row.owner for row in rows] == [owner, owner]
        roles = [json.loads(row.payload)["role"] for row in rows]
        assert roles == ["user", "assistant"]
        assert json.loads(rows[1].payload)["citations"]
    finally:
        db.close()


def test_a_follow_up_reuses_the_thread_and_replays_history(client, provider):
    register(client)
    first = client.post("/api/tutor/chat", json={"message": "why is a bare except risky"})
    thread_id = done_thread_id(first.text)

    second = client.post("/api/tutor/chat", json={"message": "and what about finally", "thread_id": thread_id})
    assert second.status_code == 200
    assert done_thread_id(second.text) == thread_id

    played_back = json.dumps(provider.requests[-1].get("messages", []))
    assert "why is a bare except risky" in played_back, "history must reach the model"


def test_another_learners_thread_is_a_404(client, provider):
    register(client)
    response = client.post("/api/tutor/chat", json={"message": "why is a bare except risky"})
    thread_id = done_thread_id(response.text)

    client.post("/api/auth/logout")
    register(client)
    assert client.post("/api/tutor/chat", json={"message": "hi", "thread_id": thread_id}).status_code == 404
    assert client.get(f"/api/tutor/threads/{thread_id}").status_code == 404


def test_an_unreachable_provider_is_a_retryable_error_event(client, monkeypatch):
    register(client)
    monkeypatch.setenv("TESSERA_TUTOR_BASE_URL", "http://127.0.0.1:9/v1")
    monkeypatch.setenv("TESSERA_TUTOR_MODEL", "stub-model")
    monkeypatch.setenv("TESSERA_TUTOR_API_KEY", "stub-key")

    response = client.post("/api/tutor/chat", json={"message": "why is a bare except risky"})

    stream = events(response.text)
    error = next(payload for name, payload in stream if name == "error")
    assert error["retryable"] is True
    assert "could not reach the model provider" in error["message"]
    # Nothing was invented, and no assistant turn was written.
    assert not [name for name, _ in stream if name == "done"]
