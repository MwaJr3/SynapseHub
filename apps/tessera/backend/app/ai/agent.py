"""The tutor agent, grounded in the knowledge graph.

Two rules make this tutor different from a chatbot bolted onto a learning app:

1. **It may only speak from retrieved material.** The agent has one tool,
   `search_knowledge`, which reads the learner's own curriculum. Its
   instructions forbid answering subject questions from memory.
2. **It must cite.** Every claim carries the concept (and source, where one
   exists) that it came from, so a learner can check it.

If `OPENAI_API_KEY` is absent the agent is never constructed. Callers get an
honest `configured=False` and the UI shows the retrieval-only path instead of a
fake conversation.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from .. import database

#: The model used for the tutor. Configurable so a deployment can choose.
DEFAULT_MODEL = os.environ.get("TESSERA_TUTOR_MODEL", "gpt-4o-mini")

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
    """Whether the AI tutor can run, and why not when it cannot."""

    configured: bool
    model: str
    missing: tuple[str, ...]
    reason: str


def tutor_config() -> TutorConfig:
    """Report real configuration state. Never guesses, never fakes a key."""
    missing: list[str] = []
    if not (os.environ.get("OPENAI_API_KEY") or "").strip():
        missing.append("OPENAI_API_KEY")
    if missing:
        return TutorConfig(
            configured=False,
            model=DEFAULT_MODEL,
            missing=tuple(missing),
            reason=(
                "No OpenAI API key is configured, so no model is called. Sourced "
                "material is still available through retrieval."
            ),
        )
    return TutorConfig(configured=True, model=DEFAULT_MODEL, missing=(), reason="Configured.")


def build_agent(db_session_factory=database.SessionLocal):
    """Construct the Agents SDK agent. Only called when configured."""
    from agents import Agent, function_tool

    from .retrieval import search

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
            return context_block(passages)
        finally:
            db.close()

    return Agent(
        name="Tessera tutor",
        model=DEFAULT_MODEL,
        instructions=INSTRUCTIONS,
        tools=[search_knowledge],
    )
