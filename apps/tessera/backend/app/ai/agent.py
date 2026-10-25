"""The tutor agent, grounded in the knowledge graph, on any OpenAI-compatible model.

Two rules make this tutor different from a chatbot bolted onto a learning app:

1. **It may only speak from retrieved material.** The agent has one tool,
   `search_knowledge`, which reads the learner's own curriculum. Its
   instructions forbid answering subject questions from memory.
2. **It must cite.** Every claim carries the concept (and source, where one
   exists) that it came from, so a learner can check it.

The provider is not hard-coded to OpenAI. Anything that speaks the OpenAI chat
completions shape works: Hugging Face's Inference Providers router, Groq, Google
Gemini's compatibility endpoint, OpenRouter's `:free` models, or a model running
locally through Ollama or llama.cpp. Point `TESSERA_TUTOR_BASE_URL` at one of
them, set `TESSERA_TUTOR_API_KEY`, and name the model in `TESSERA_TUTOR_MODEL`.

Hugging Face is the intended default for this product: one token reaches many
open-weight models, and the same weights can be served locally later without
changing any of this code.

If no key (and no local endpoint) is configured, the agent is never constructed.
Callers get an honest `configured=False` and the UI shows the retrieval-only path
instead of a fake conversation.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from urllib.parse import urlparse

from .. import database

#: Environment variables checked for the credential, in order.
KEY_ENV_VARS = ("TESSERA_TUTOR_API_KEY", "OPENAI_API_KEY")

#: Hosts that count as "runs on this machine": no credential is needed there.
LOCAL_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "::1", "host.docker.internal"}

#: Used only when talking to OpenAI itself. Any other endpoint must name its model.
OPENAI_DEFAULT_MODEL = "gpt-4o-mini"

INSTRUCTIONS = """You are Tessera's study tutor, part of Tamuzi Learning.

Ground rules:
- Answer ONLY from the retrieved material given by the search_knowledge tool or
  in the conversation. If the material does not cover the question, say so
  plainly and offer the closest concept that does. Never answer a subject
  question from your own memory.
- Cite the concept title for every substantive claim, in the form
  (Concept: <title>). If a source and licence are given, include them.
- You may quiz the learner, ask a Socratic follow-up, or explain a misconception
  they have demonstrated. You may not invent progress, mastery scores or results.
- Never claim the learner has mastered something: only their own answered
  questions decide that, and you do not have their score.
- Be concise. Short paragraphs, no filler, no motivational padding.
- If asked to answer an exam or assignment question outright, help the learner
  work it out instead of giving the answer.
"""


@dataclass(frozen=True)
class TutorConfig:
    """Whether the AI tutor can run, on what, and why not when it cannot."""

    configured: bool
    model: str
    #: "openai", "local", or the endpoint host (e.g. "api.groq.com").
    provider: str
    #: Empty string means the default OpenAI endpoint.
    base_url: str
    #: The environment variable the credential came from, never the value.
    key_source: str | None
    missing: tuple[str, ...]
    reason: str


def _read(name: str) -> str:
    return (os.environ.get(name) or "").strip()


def tutor_config() -> TutorConfig:
    """Report real configuration state. Never guesses, never fakes a key."""
    base_url = _read("TESSERA_TUTOR_BASE_URL").rstrip("/")
    host = (urlparse(base_url).hostname or "") if base_url else ""
    is_local = host in LOCAL_HOSTS
    provider = "openai" if not base_url else ("local" if is_local else host)

    key_source = next((name for name in KEY_ENV_VARS if _read(name)), None)
    # A model name is required for any non-OpenAI endpoint: guessing one would
    # fail at request time with a provider-specific error instead of here.
    model = _read("TESSERA_TUTOR_MODEL") or (OPENAI_DEFAULT_MODEL if not base_url else "")

    missing: list[str] = []
    if key_source is None and not is_local:
        missing.append("TESSERA_TUTOR_API_KEY")
    if not model:
        missing.append("TESSERA_TUTOR_MODEL")

    if missing:
        if "TESSERA_TUTOR_MODEL" in missing:
            reason = (
                f"An endpoint other than OpenAI is configured ({host or 'none'}), so the model must be "
                "named in TESSERA_TUTOR_MODEL. No model is called until it is."
            )
        else:
            reason = (
                "No model credential is configured, so no model is called. Set TESSERA_TUTOR_API_KEY "
                "(a Hugging Face token works: TESSERA_TUTOR_BASE_URL=https://router.huggingface.co/v1) — "
                "sourced material is still available through retrieval in the meantime."
            )
        return TutorConfig(
            configured=False,
            model=model or "",
            provider=provider,
            base_url=base_url,
            key_source=key_source,
            missing=tuple(missing),
            reason=reason,
        )

    return TutorConfig(
        configured=True,
        model=model,
        provider=provider,
        base_url=base_url,
        key_source=key_source,
        missing=(),
        reason=f"Configured for {provider} using model {model}.",
    )


def build_agent(
    db_session_factory=database.SessionLocal,
    config: TutorConfig | None = None,
    citations: list | None = None,
):
    """Construct the Agents SDK agent. Only called when configured.

    `citations` is filled by the retrieval tool as a side effect, so the caller
    can show the learner exactly which material the answer drew on without
    parsing the model's output for markers it may or may not produce.
    """
    from agents import Agent, function_tool

    from .retrieval import search

    state = config or tutor_config()
    if not state.configured:
        raise RuntimeError(f"the tutor is not configured: {', '.join(state.missing)}")

    @function_tool
    def search_knowledge(question: str) -> str:
        """Search Tessera's curriculum for material relevant to a question.

        Args:
            question: The learner's question, or the topic to look up.
        """
        db = db_session_factory()
        try:
            from .retrieval import context_block

            passages = search(db, question)
            if citations is not None:
                from .store import Citation

                citations.clear()
                citations.extend(
                    Citation(
                        title=passage.concept_title,
                        citation=passage.as_citation(),
                        source_url=passage.source_url,
                        license_name=passage.license_name,
                    )
                    for passage in passages
                )
            return context_block(passages)
        finally:
            db.close()

    model: object = state.model
    if state.base_url:
        # Any OpenAI-compatible endpoint: Groq, Gemini, OpenRouter, Ollama, vLLM.
        # The chat-completions model object is what the Agents SDK uses for
        # non-OpenAI providers, and tracing is switched off so a free provider
        # never causes an upload attempt to api.openai.com.
        from agents import OpenAIChatCompletionsModel, set_tracing_disabled
        from openai import AsyncOpenAI

        set_tracing_disabled(True)
        client = AsyncOpenAI(
            base_url=state.base_url,
            # Local servers usually ignore the key; the SDK still requires one.
            api_key=_read(state.key_source) if state.key_source else "not-needed",
            timeout=60.0,
            max_retries=1,
        )
        model = OpenAIChatCompletionsModel(model=state.model, openai_client=client)

    return Agent(
        name="Tessera tutor",
        model=model,
        instructions=INSTRUCTIONS,
        tools=[search_knowledge],
    )
