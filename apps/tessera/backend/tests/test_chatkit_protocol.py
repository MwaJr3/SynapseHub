"""The ChatKit endpoint, driven over HTTP against a local provider.

This is the part that was previously only tested at its edges. Here the real
route, the real ChatKit server, the real store and the real agent all run: a
`threads.create` request goes in, a streamed event response comes out, the
assistant's cited answer is in it, and the thread is persisted for that learner
only.

The provider is the local stub — no OpenAI account, no network.
"""
from __future__ import annotations

import json
import uuid

import pytest

from stub_provider import FINAL_ANSWER, RunningProvider


def register(client) -> str:
    email = f"chatkit-{uuid.uuid4().hex[:8]}@example.test"
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "correct horse battery", "display_name": "Chatkit Learner"},
    )
    assert response.status_code == 200, response.text
    return email


def create_thread_body(text: str) -> dict:
    """The exact shape ChatKit sends for a new thread."""
    return {
        "type": "threads.create",
        "params": {
            "input": {
                "content": [{"type": "input_text", "text": text}],
                "attachments": [],
                "inference_options": {},
            }
        },
    }


@pytest.fixture()
def configured_provider(monkeypatch):
    with RunningProvider() as provider:
        monkeypatch.setenv("TESSERA_TUTOR_BASE_URL", provider.base_url)
        monkeypatch.setenv("TESSERA_TUTOR_MODEL", "stub-model")
        monkeypatch.setenv("TESSERA_TUTOR_API_KEY", "stub-key")
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)
        yield provider


def test_chatkit_answers_over_the_wire_and_cites_a_concept(client, configured_provider):
    register(client)

    response = client.post(
        "/api/tutor/chatkit",
        json=create_thread_body("why is a bare except risky"),
        headers={"accept": "text/event-stream"},
    )

    assert response.status_code == 200, response.text
    assert "text/event-stream" in response.headers["content-type"]

    body = response.text
    # The answer the (stubbed) model produced, plus its citation, reached the client.
    assert "Concept: Exceptions and error handling" in body
    assert "Exceptions and error handling" in body
    # At least one well-formed SSE frame was emitted.
    assert body.lstrip().startswith("data:")
    assert "thread" in body


def test_the_conversation_was_grounded_before_it_answered(client, configured_provider):
    """The provider must have received retrieved curriculum text before replying."""
    register(client)
    client.post("/api/tutor/chatkit", json=create_thread_body("why is a bare except risky"))

    assert len(configured_provider.requests) == 2
    second_request = json.dumps(configured_provider.requests[1])
    assert "Citation" in second_request
    assert "Exceptions and error handling" in second_request


def test_the_thread_is_stored_for_this_learner_only(client, configured_provider):
    from app.database import SessionLocal
    from app.models import TutorItemRow, TutorThreadRow, User

    email = register(client)
    body = client.post("/api/tutor/chatkit", json=create_thread_body("why is a bare except risky")).text
    thread_id = json.loads(body.split("data: ", 1)[1].splitlines()[0])["thread"]["id"]

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).one()
        thread = db.get(TutorThreadRow, thread_id)
        assert thread is not None, "the conversation must be persisted, not held in memory"
        assert thread.owner == user.id
        items = db.query(TutorItemRow).filter(TutorItemRow.thread_id == thread_id).all()
        assert items, "the messages must be persisted with the thread"
        # Nothing in this thread belongs to anybody else.
        assert {row.owner for row in items} == {user.id}
    finally:
        db.close()


def test_an_unreachable_provider_produces_an_error_event_not_an_answer(client, monkeypatch):
    """ChatKit has already started streaming by the time the provider is called,
    so the failure is reported inside the stream. What matters is that the
    learner is told, and that no assistant text is invented."""
    register(client)
    monkeypatch.setenv("TESSERA_TUTOR_BASE_URL", "http://127.0.0.1:9/v1")
    monkeypatch.setenv("TESSERA_TUTOR_MODEL", "stub-model")
    monkeypatch.setenv("TESSERA_TUTOR_API_KEY", "stub-key")

    response = client.post(
        "/api/tutor/chatkit",
        json=create_thread_body("why is a bare except risky"),
        headers={"accept": "text/event-stream"},
    )

    assert response.status_code == 200
    body = response.text
    events = [json.loads(line[len("data: "):]) for line in body.splitlines() if line.startswith("data: ")]

    error = next((event for event in events if event.get("type") == "error"), None)
    assert error is not None, "the learner must be told the provider failed"
    assert error["allow_retry"] is True
    assert "could not reach the model provider" in (error.get("message") or "")

    # No assistant message was produced from a failure.
    assert not [event for event in events if event.get("type") == "thread.item.done"
                and event.get("item", {}).get("type") == "assistant_message"]
