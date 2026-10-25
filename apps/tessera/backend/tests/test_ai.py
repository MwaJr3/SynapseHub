"""The tutor must be grounded, private, and honest about being unconfigured.

No test here calls OpenAI: there is no key in the test environment, and asserting
about a live model would be untestable and non-deterministic. What is tested is
everything that decides whether a learner is told the truth — configuration
gating, retrieval grounding, citation, and per-learner isolation of threads.
"""
from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.ai.agent import tutor_config
from app.ai.retrieval import context_block, search, tokenise
from app.database import Base
from app.models import Concept, Lesson, SourceRow, TutorItemRow, TutorThreadRow


@pytest.fixture()
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    session.add(SourceRow(
        id="s1", title="Tessera curriculum", author="Tamuzi", url="https://example.org",
        license_class="OPEN", license_name="CC BY 4.0", commercial_use_ok=True,
        attribution="Original.", retrieved_at="2026-01-01",
    ))
    session.add(Concept(
        id="py.exceptions", title="Exceptions and error handling", subject="Python",
        summary="Catching what you can handle, and letting the rest propagate.",
        explanation="A bare except catches everything, including KeyboardInterrupt, and hides bugs.",
        difficulty=3.0,
    ))
    session.add(Lesson(
        id="ls1", concept_id="py.exceptions", title="Catch narrowly, fail loudly",
        explanation="Catch the specific exception you can handle.",
        example="try: value = int(raw)\nexcept ValueError: value = 0",
        application="Put cleanup in finally.",
        recap="A broad catch converts a crash into silent corruption.",
        est_minutes=5, source_id="s1",
    ))
    session.add(Concept(
        id="chess.pieces", title="Piece movement and legal play", subject="Chess",
        summary="How each piece moves.", explanation="Legality is more than movement.",
        difficulty=1.5,
    ))
    session.commit()
    try:
        yield session
    finally:
        session.close()


# ------------------------------------------------------------------ configuration


def _clear_tutor_env(monkeypatch):
    for name in (
        "TESSERA_TUTOR_API_KEY",
        "OPENAI_API_KEY",
        "TESSERA_TUTOR_BASE_URL",
        "TESSERA_TUTOR_MODEL",
    ):
        monkeypatch.delenv(name, raising=False)


def test_absent_key_is_reported_as_unconfigured(monkeypatch):
    _clear_tutor_env(monkeypatch)
    state = tutor_config()
    assert state.configured is False
    assert "TESSERA_TUTOR_API_KEY" in state.missing
    assert "no model is called" in state.reason.lower()
    # The reason must point at free options rather than leaving the reader stuck.
    assert "Groq" in state.reason


def test_blank_key_does_not_count_as_configured(monkeypatch):
    _clear_tutor_env(monkeypatch)
    monkeypatch.setenv("OPENAI_API_KEY", "   ")
    assert tutor_config().configured is False


def test_key_presence_is_reported_without_ever_echoing_it(monkeypatch):
    _clear_tutor_env(monkeypatch)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-secret-value")
    state = tutor_config()
    assert state.configured is True
    assert "sk-test-secret-value" not in str(state)
    assert state.key_source == "OPENAI_API_KEY"
    assert state.missing == ()


# --------------------------------------------------- any OpenAI-compatible host


def test_openai_is_the_default_provider(monkeypatch):
    _clear_tutor_env(monkeypatch)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    state = tutor_config()
    assert state.provider == "openai"
    assert state.base_url == ""
    assert state.model == "gpt-4o-mini"


def test_a_free_provider_is_configured_by_base_url(monkeypatch):
    """Groq: free tier, OpenAI-compatible, no card. This is the configuration."""
    _clear_tutor_env(monkeypatch)
    monkeypatch.setenv("TESSERA_TUTOR_BASE_URL", "https://api.groq.com/openai/v1")
    monkeypatch.setenv("TESSERA_TUTOR_API_KEY", "gsk_test_value")
    monkeypatch.setenv("TESSERA_TUTOR_MODEL", "openai/gpt-oss-20b")
    state = tutor_config()
    assert state.configured is True
    assert state.provider == "api.groq.com"
    assert state.model == "openai/gpt-oss-20b"
    assert state.key_source == "TESSERA_TUTOR_API_KEY"
    assert "gsk_test_value" not in str(state)


def test_a_custom_endpoint_without_a_model_name_is_not_configured(monkeypatch):
    """Guessing a model id would fail at request time with a provider error."""
    _clear_tutor_env(monkeypatch)
    monkeypatch.setenv("TESSERA_TUTOR_BASE_URL", "https://api.groq.com/openai/v1")
    monkeypatch.setenv("TESSERA_TUTOR_API_KEY", "gsk_test")
    state = tutor_config()
    assert state.configured is False
    assert state.missing == ("TESSERA_TUTOR_MODEL",)
    assert "TESSERA_TUTOR_MODEL" in state.reason


def test_a_local_endpoint_needs_no_credential(monkeypatch):
    """Ollama or llama.cpp on the same machine: free and offline."""
    _clear_tutor_env(monkeypatch)
    monkeypatch.setenv("TESSERA_TUTOR_BASE_URL", "http://127.0.0.1:11434/v1")
    monkeypatch.setenv("TESSERA_TUTOR_MODEL", "qwen2.5:3b")
    state = tutor_config()
    assert state.configured is True
    assert state.provider == "local"
    assert state.key_source is None
    assert state.missing == ()


def test_a_remote_endpoint_still_needs_a_credential(monkeypatch):
    _clear_tutor_env(monkeypatch)
    monkeypatch.setenv("TESSERA_TUTOR_BASE_URL", "https://openrouter.ai/api/v1")
    monkeypatch.setenv("TESSERA_TUTOR_MODEL", "deepseek/deepseek-chat-v3:free")
    state = tutor_config()
    assert state.configured is False
    assert state.missing == ("TESSERA_TUTOR_API_KEY",)


def test_the_generic_key_wins_over_the_openai_one(monkeypatch):
    _clear_tutor_env(monkeypatch)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-openai")
    monkeypatch.setenv("TESSERA_TUTOR_API_KEY", "generic")
    assert tutor_config().key_source == "TESSERA_TUTOR_API_KEY"


# --------------------------------------------------------------------- retrieval


def test_stopwords_are_dropped_and_short_words_ignored():
    assert "the" not in tokenise("the exception")
    assert "exception" in tokenise("the exception")
    assert "a" not in tokenise("a b c")


def test_search_finds_the_relevant_concept(db):
    passages = search(db, "why is a bare except risky")
    assert passages
    assert passages[0].concept_id == "py.exceptions"
    assert passages[0].score > 0


def test_search_carries_the_source_and_licence(db):
    passage = search(db, "exception handling")[0]
    assert passage.source_title == "Tessera curriculum"
    assert passage.license_name == "CC BY 4.0"
    assert "CC BY 4.0" in passage.as_citation()


def test_unrelated_question_returns_nothing_rather_than_the_nearest_thing(db):
    # The tutor must not answer from outside the curriculum.
    assert search(db, "quantum chromodynamics Lagrangian") == []


def test_empty_or_stopword_only_question_returns_nothing(db):
    assert search(db, "") == []
    assert search(db, "the of and") == []


def test_search_respects_the_limit(db):
    assert len(search(db, "exception legal piece movement", limit=1)) == 1


def test_context_block_labels_each_passage_with_its_citation(db):
    block = context_block(search(db, "exception handling"))
    assert "[1]" in block
    assert "Citation:" in block


def test_empty_context_is_stated_not_faked():
    assert "No material" in context_block([])


# ------------------------------------------------------- per-learner isolation


def test_thread_rows_are_owned_and_filterable(db):
    db.add(TutorThreadRow(id="t1", owner="alice", title="a", status="active", payload="{}"))
    db.add(TutorThreadRow(id="t2", owner="bob", title="b", status="active", payload="{}"))
    db.commit()
    alice = db.query(TutorThreadRow).filter(TutorThreadRow.owner == "alice").all()
    assert [row.id for row in alice] == ["t1"]


def test_store_refuses_another_learners_thread(db):
    import asyncio

    from chatkit.store import NotFoundError

    from app.ai.store import SqlChatKitStore

    db.add(TutorThreadRow(id="t1", owner="alice", title="a", status="active", payload=_thread_payload("t1")))
    db.commit()

    store = SqlChatKitStore(db)
    with pytest.raises(NotFoundError):
        asyncio.run(store.load_thread("t1", {"owner": "bob"}))
    # The owner can read it.
    assert asyncio.run(store.load_thread("t1", {"owner": "alice"})).id == "t1"


def test_store_refuses_another_learners_items(db):
    import asyncio

    from chatkit.store import NotFoundError

    from app.ai.store import SqlChatKitStore

    db.add(TutorThreadRow(id="t1", owner="alice", title="a", status="active", payload=_thread_payload("t1")))
    db.commit()
    store = SqlChatKitStore(db)
    with pytest.raises(NotFoundError):
        asyncio.run(
            store.load_thread_items("t1", after=None, limit=10, order="asc", context={"owner": "bob"})
        )


def test_delete_thread_removes_its_items(db):
    from app.ai.store import SqlChatKitStore

    db.add(TutorThreadRow(id="t1", owner="alice", title="a", status="active", payload=_thread_payload("t1")))
    db.add(TutorItemRow(id="i1", thread_id="t1", owner="alice", type="message", payload="{}"))
    db.commit()
    import asyncio

    asyncio.run(SqlChatKitStore(db).delete_thread("t1", {"owner": "alice"}))
    assert db.query(TutorItemRow).count() == 0
    assert db.get(TutorThreadRow, "t1") is None


def _thread_payload(thread_id: str) -> str:
    from datetime import datetime, timezone

    from chatkit.types import ThreadMetadata

    return ThreadMetadata(
        id=thread_id, title="a", created_at=datetime.now(timezone.utc), status={"type": "active"}
    ).model_dump_json()


def test_build_agent_wires_a_free_provider_into_the_agents_sdk(monkeypatch):
    """The agent object is provider-agnostic — proved without any network call.

    Construction performs no request: it builds the chat-completions model the
    Agents SDK uses for non-OpenAI endpoints, pointed at the configured host.
    """
    from agents import OpenAIChatCompletionsModel

    from app.ai.agent import build_agent

    _clear_tutor_env(monkeypatch)
    monkeypatch.setenv("TESSERA_TUTOR_BASE_URL", "https://api.groq.com/openai/v1")
    monkeypatch.setenv("TESSERA_TUTOR_API_KEY", "gsk_test_value")
    monkeypatch.setenv("TESSERA_TUTOR_MODEL", "openai/gpt-oss-20b")

    agent = build_agent()
    assert isinstance(agent.model, OpenAIChatCompletionsModel)
    assert agent.model.model == "openai/gpt-oss-20b"
    # The SDK keeps the client private; that is the object carrying the base URL.
    assert str(agent.model._client.base_url).startswith("https://api.groq.com/openai/v1")
    # The credential is held by the client, never placed on the agent.
    assert "gsk_test_value" not in repr(agent.instructions)
    assert "gsk_test_value" not in str(agent.name)


def test_build_agent_refuses_to_build_without_configuration(monkeypatch):
    from app.ai.agent import build_agent

    _clear_tutor_env(monkeypatch)
    with pytest.raises(RuntimeError, match="not configured"):
        build_agent()
