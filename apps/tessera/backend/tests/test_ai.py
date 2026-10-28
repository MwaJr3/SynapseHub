"""The tutor must be grounded, private, and honest about being unconfigured.

No test here calls OpenAI: there is no key in the test environment, and asserting
about a live model would be untestable and non-deterministic. What is tested is
everything that decides whether a learner is told the truth — configuration
gating, retrieval grounding, citation, and per-learner isolation of threads.
"""
from __future__ import annotations

import json

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.ai.agent import PROVIDER_PRESETS, tutor_config
from app.ai.retrieval import context_block, search, tokenise
from app.ai.store import ChatStore, ThreadNotFound
from app.database import Base
from app.models import Concept, Lesson, SourceRow, TutorItemRow, TutorThreadRow, User


@pytest.fixture()
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    # Threads carry an owner foreign key, so the learners have to exist first.
    for name in ("alice", "bob"):
        session.add(User(id=name, email=f"{name}@example.test", password_hash="x"))
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
    # The lesson points at the concept above, and foreign keys are enforced
    # (as they are in PostgreSQL), so the concept has to land in the database
    # before the row that references it.
    session.flush()
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
        "TESSERA_TUTOR_PROVIDER",
    ):
        monkeypatch.delenv(name, raising=False)


def test_absent_key_is_reported_as_unconfigured(monkeypatch):
    _clear_tutor_env(monkeypatch)
    state = tutor_config()
    assert state.configured is False
    assert "TESSERA_TUTOR_API_KEY" in state.missing
    assert "no model is called" in state.reason.lower()
    # The reason must point at a way forward rather than leaving the reader stuck:
    # Hugging Face is the intended default, and it is not a paid-only route.
    assert "router.huggingface.co" in state.reason


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


# ------------------------------------------------------- conversation storage


def _store(db) -> ChatStore:
    return ChatStore(db)


def test_a_thread_is_created_for_its_owner(db):
    thread = _store(db).create_thread("alice", title="exceptions")
    assert thread.id.startswith("thr_")
    assert db.get(TutorThreadRow, thread.id).owner == "alice"


def test_another_learners_thread_is_not_found_not_forbidden(db):
    """A 403 would confirm the thread exists; the store refuses to say that."""
    store = _store(db)
    thread = store.create_thread("alice")
    with pytest.raises(ThreadNotFound):
        store.get_thread("bob", thread.id)
    assert store.get_thread("alice", thread.id).id == thread.id


def test_listing_threads_only_returns_this_learners(db):
    store = _store(db)
    store.create_thread("alice", title="a")
    store.create_thread("bob", title="b")
    titles = [thread.title for thread in store.list_threads("alice")]
    assert titles == ["a"]


def test_messages_are_stored_in_order_with_their_citations(db):
    store = _store(db)
    thread = store.create_thread("alice")
    store.add_message("alice", thread.id, "user", "why is a bare except risky")
    store.add_message(
        "alice",
        thread.id,
        "assistant",
        "Catch the specific exception (Concept: Exceptions and error handling).",
        citations=[
            __import__("app.ai.store", fromlist=["Citation"]).Citation(
                title="Exceptions and error handling",
                citation="Exceptions and error handling — Tessera curriculum · CC BY 4.0",
                source_url="https://example.org",
                license_name="CC BY 4.0",
            )
        ],
    )

    messages = store.load_messages("alice", thread.id)
    assert [message.role for message in messages] == ["user", "assistant"]
    assert messages[1].citations[0].title == "Exceptions and error handling"
    assert messages[1].citations[0].license_name == "CC BY 4.0"


def test_writing_to_another_learners_thread_is_refused(db):
    store = _store(db)
    thread = store.create_thread("alice")
    with pytest.raises(ThreadNotFound):
        store.add_message("bob", thread.id, "user", "sneaking in")
    with pytest.raises(ThreadNotFound):
        store.load_messages("bob", thread.id)
    assert db.query(TutorItemRow).count() == 0


def test_deleting_a_thread_removes_its_messages(db):
    store = _store(db)
    thread = store.create_thread("alice")
    store.add_message("alice", thread.id, "user", "hello")
    store.delete_thread("alice", thread.id)
    assert db.get(TutorThreadRow, thread.id) is None
    assert db.query(TutorItemRow).count() == 0


def test_history_replayed_to_the_model_is_text_only(db):
    """Citations shown to the learner must not return as fresh evidence."""
    from app.ai.chat import history_for_model
    from app.ai.store import Citation, Message

    from datetime import datetime, timezone

    messages = [
        Message(id="1", role="user", text="hi", created_at=datetime.now(timezone.utc)),
        Message(
            id="2",
            role="assistant",
            text="an answer",
            created_at=datetime.now(timezone.utc),
            citations=[Citation(title="t", citation="c")],
        ),
    ]
    assert history_for_model(messages) == [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "an answer"},
    ]


def test_sse_frames_are_well_formed():
    from app.ai.chat import sse

    frame = sse("delta", {"text": "a \"quoted\" word"})
    assert frame.startswith("event: delta\ndata: ")
    assert frame.endswith("\n\n")
    payload = json.loads(frame.split("data: ", 1)[1])
    assert payload["text"] == 'a "quoted" word'


# ------------------------------------------------------------------- presets
#
# The presets exist so an operator sets a provider name and a key, not a URL and
# a model id from memory. These tests pin the two things that could go wrong:
# a preset must never be mistaken for a verified connection, and a misspelt
# provider must fail loudly instead of silently using a different backend.


def test_a_preset_supplies_the_endpoint_and_a_model(monkeypatch):
    _clear_tutor_env(monkeypatch)
    monkeypatch.setenv("TESSERA_TUTOR_PROVIDER", "huggingface")
    monkeypatch.setenv("TESSERA_TUTOR_API_KEY", "hf_test_value")
    state = tutor_config()
    assert state.configured is True
    assert state.base_url == "https://router.huggingface.co/v1"
    assert state.model == "meta-llama/Llama-3.3-70B-Instruct"
    assert "hf_test_value" not in state.reason


def test_ollama_cloud_preset_names_the_model_the_operator_asked_for(monkeypatch):
    _clear_tutor_env(monkeypatch)
    monkeypatch.setenv("TESSERA_TUTOR_PROVIDER", "ollama-cloud")
    monkeypatch.setenv("TESSERA_TUTOR_API_KEY", "not-a-real-key")
    state = tutor_config()
    assert state.configured is True
    assert state.base_url == "https://ollama.com/v1"
    assert state.model == "nemotron-3-nano:30b"
    # Ollama Cloud is not local, so it does need a key even though the local
    # preset does not.
    assert PROVIDER_PRESETS["ollama-local"].needs_key is False


def test_explicit_settings_beat_a_preset(monkeypatch):
    _clear_tutor_env(monkeypatch)
    monkeypatch.setenv("TESSERA_TUTOR_PROVIDER", "ollama-cloud")
    monkeypatch.setenv("TESSERA_TUTOR_BASE_URL", "http://127.0.0.1:11434/v1")
    monkeypatch.setenv("TESSERA_TUTOR_MODEL", "qwen2.5:3b")
    state = tutor_config()
    assert state.configured is True
    assert state.base_url == "http://127.0.0.1:11434/v1"
    assert state.model == "qwen2.5:3b"
    # A local preset needs no credential; an explicit local URL must behave the
    # same way, or the local path breaks the moment a provider is named.
    assert state.missing == ()


def test_a_local_preset_needs_no_key(monkeypatch):
    _clear_tutor_env(monkeypatch)
    monkeypatch.setenv("TESSERA_TUTOR_PROVIDER", "ollama-local")
    state = tutor_config()
    assert state.configured is True
    assert state.missing == ()
    assert state.base_url.startswith("http://127.0.0.1")


def test_a_misspelt_provider_fails_loudly_rather_than_falling_back(monkeypatch):
    _clear_tutor_env(monkeypatch)
    monkeypatch.setenv("TESSERA_TUTOR_PROVIDER", "huggingfacee")
    monkeypatch.setenv("TESSERA_TUTOR_API_KEY", "hf_test_value")
    state = tutor_config()
    assert state.configured is False
    assert "TESSERA_TUTOR_PROVIDER" in state.missing
    assert "huggingfacee" in state.reason
    # The message lists what is valid, so the fix is in front of the reader.
    for known in ("huggingface", "ollama-cloud", "groq"):
        assert known in state.reason


def test_every_preset_is_usable_as_written(monkeypatch):
    """Each preset must be complete: a name and a key is enough, or it is a trap."""
    for name, preset in PROVIDER_PRESETS.items():
        _clear_tutor_env(monkeypatch)
        monkeypatch.setenv("TESSERA_TUTOR_PROVIDER", name)
        if preset.needs_key:
            monkeypatch.setenv("TESSERA_TUTOR_API_KEY", "test-value")
        state = tutor_config()
        assert state.configured is True, (name, state.missing, state.reason)
        assert state.model, name
        assert state.base_url == preset.base_url, name
