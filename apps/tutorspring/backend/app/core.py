"""TutorSpring domain logic: retrieval, grounded answering, tutor modes, review flow."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field

MODES = ("Explain", "Give Me a Hint", "Practice With Me", "Check My Reasoning", "Summarize This Lesson")

NO_SUPPORT = (
    "The approved learning material does not cover this question. I cannot answer from the "
    "sources I trust — please ask a teacher or consult a trusted resource. (It is better to "
    "say this than to guess.)"
)


@dataclass
class RetrievedSource:
    source_id: int
    title: str
    topic: str
    snippet: str
    score: float


@dataclass
class GroundedAnswer:
    text: str
    sources: list[RetrievedSource] = field(default_factory=list)
    supported: bool = False
    demo: bool = True
    provider: str = "demo"


_TOKEN = re.compile(r"[a-z0-9]{3,}")


def _tokens(text: str) -> set[str]:
    return set(_TOKEN.findall(text.lower()))


def retrieve(query: str, sources, max_sources: int = 3) -> list[RetrievedSource]:
    """Deterministic keyword-overlap retrieval over approved sources."""
    q = _tokens(query)
    scored: list[RetrievedSource] = []
    for source in sources:
        if source.approved != "yes":
            continue
        overlap = q & (_tokens(source.title) | _tokens(source.topic) | _tokens(source.body))
        if overlap:
            score = len(overlap) / max(1, len(q))
            snippet = source.body[:240] + ("…" if len(source.body) > 240 else "")
            scored.append(RetrievedSource(source.id, source.title, source.topic, snippet, round(score, 3)))
    scored.sort(key=lambda s: -s.score)
    return scored[:max_sources]


def compose_prompt_note(mode: str, grade: str, language: str) -> str:
    if mode not in MODES:
        raise ValueError(f"Unknown tutor mode '{mode}'.")
    return (
        f"Tutor mode: {mode}. Learner level: {grade or 'unspecified'}. Language: {language}. "
        "Explain at the learner's level. Ask the learner to attempt a problem before revealing a "
        "full worked solution where appropriate. Cite only the provided material."
    )


def answer(mode: str, question: str, sources, provider, grade: str = "", language: str = "en") -> GroundedAnswer:
    retrieved = retrieve(question, sources)
    if not retrieved:
        return GroundedAnswer(text=NO_SUPPORT, sources=[], supported=False, demo=True, provider="none")
    context = "\n\n".join(f"[{r.title} | {r.topic}]\n{r.snippet}" for r in retrieved)
    note = compose_prompt_note(mode, grade, language)
    completion = provider.complete(note, question, context)
    return GroundedAnswer(
        text=completion.text,
        sources=retrieved,
        supported=True,
        demo=completion.demo,
        provider=completion.provider,
    )


def serialize_sources(retrieved: list[RetrievedSource]) -> str:
    return json.dumps([
        {"source_id": r.source_id, "title": r.title, "topic": r.topic, "score": r.score}
        for r in retrieved
    ])


# ------------------------------------------------------------ review queue ---

def flag_message(reason: str) -> str:
    """Learner flags go to the review queue — other learners never see them."""
    if not reason.strip():
        raise ValueError("A short reason is required when flagging an explanation.")
    return "pending"


def review_decision(decision: str, note: str) -> tuple[str, str]:
    if decision not in ("approved", "hidden"):
        raise ValueError("Decision must be approved or hidden.")
    return decision, note


def teacher_summary(practice_rows, flagged_topics) -> dict:
    """Privacy-conscious topic-level summary: counts only, no conversation text."""
    by_topic: dict[str, dict] = {}
    for row in practice_rows:
        entry = by_topic.setdefault(row.topic, {"attempts": 0, "self_correct": 0})
        entry["attempts"] += 1
        entry["self_correct"] += 1 if row.self_correct == "yes" else 0
    return {
        "topics": by_topic,
        "flagged_topics": sorted(set(flagged_topics)),
        "note": "Aggregate topic statistics only. Individual conversations stay private unless "
                "the learner's settings allow sharing.",
    }
