"""End-to-end agent loop against a local OpenAI-compatible endpoint.

No OpenAI account is involved. A stub server speaks the same chat-completions
wire format that Groq, Gemini, OpenRouter and Ollama speak, so running the real
Agents SDK agent against it exercises the parts that would otherwise be untested
without a paid key: the client is built from `TESSERA_TUTOR_BASE_URL`, the model's
tool call reaches `search_knowledge`, the retrieved curriculum text is fed back as
a tool result, and the final answer comes out with its citation.

What this does **not** test is model quality — the replies are scripted. It tests
the wiring, which is exactly what was unverified before.
"""
from __future__ import annotations

import asyncio
import json

import pytest

from stub_provider import FINAL_ANSWER, RunningProvider

@pytest.fixture()
def stub_endpoint(monkeypatch):
    with RunningProvider() as provider:
        monkeypatch.setenv("TESSERA_TUTOR_BASE_URL", provider.base_url)
        monkeypatch.setenv("TESSERA_TUTOR_MODEL", "stub-model")
        monkeypatch.setenv("TESSERA_TUTOR_API_KEY", "stub-key")
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)
        yield provider


def test_the_agent_runs_against_any_openai_compatible_endpoint(stub_endpoint):
    from agents import Runner

    from app.ai.agent import build_agent, tutor_config

    state = tutor_config()
    assert state.configured is True
    # 127.0.0.1 is reported as "local": it is the same shape as a workstation
    # running Ollama, which needs no credential.
    assert state.provider == "local"

    result = asyncio.run(Runner.run(build_agent(), "why is a bare except risky"))

    assert FINAL_ANSWER == result.final_output
    assert "Concept:" in result.final_output


def test_the_tool_call_actually_retrieved_curriculum_material(stub_endpoint):
    """The second request must contain what the tool found, or grounding is a lie."""
    from agents import Runner

    from app.ai.agent import build_agent

    asyncio.run(Runner.run(build_agent(), "why is a bare except risky"))

    assert len(stub_endpoint.requests) == 2, "the agent must call the tool, then answer"
    second = json.dumps(stub_endpoint.requests[1])

    # The retrieved passage and its citation travelled back to the model.
    assert "bare" in second.lower() or "except" in second.lower()
    assert "Exceptions and error handling" in second
    assert "Citation" in second
    # And the model was told what it may not do. (The instruction text wraps, so
    # match on a phrase that does not straddle a newline.)
    assert "search_knowledge tool" in second
    assert "Cite the concept title for every substantive claim" in second


def test_a_provider_error_is_not_converted_into_an_answer(monkeypatch):
    from agents import Runner

    from app.ai.agent import build_agent

    # Nothing is listening on this port: the SDK must fail, not invent text.
    monkeypatch.setenv("TESSERA_TUTOR_BASE_URL", "http://127.0.0.1:9/v1")
    monkeypatch.setenv("TESSERA_TUTOR_MODEL", "stub-model")
    monkeypatch.setenv("TESSERA_TUTOR_API_KEY", "stub-key")

    with pytest.raises(Exception):
        asyncio.run(Runner.run(build_agent(), "why is a bare except risky"))
