"""Grounding retrieval for the tutor.

The tutor is only allowed to talk about material Tessera actually holds. This
module is the single place that turns a question into passages taken from the
knowledge graph, each carrying the concept it came from and, where one exists,
the source record with its licence.

It works with no model at all: `/api/tutor/search` exposes it directly, so a
learner can get sourced material even when no AI provider is configured. That
path is retrieval, not generation, and the UI labels it as such rather than
pretending a model answered.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from sqlalchemy.orm import Session

from ..models import Concept, Lesson, SourceRow

#: Words too common to be useful evidence of relevance.
STOPWORDS = frozenset(
    """a an the is are was were be been being do does did how what why when where which who
    i me my we our you your it its of in on at to for with about into from by as that this
    these those and or but if then than so can could should would will shall may might must
    explain tell show give help please more most much many some any not no yes""".split()
)

#: A passage longer than this is truncated with an explicit marker.
MAX_PASSAGE_CHARS = 700
#: Fewer than this many matched tokens means the question is not really about the material.
MIN_TOKEN_LEN = 3


@dataclass(frozen=True)
class Passage:
    concept_id: str
    concept_title: str
    subject: str
    text: str
    score: float
    source_title: str | None = None
    source_url: str | None = None
    license_name: str | None = None
    attribution: str | None = None

    def as_citation(self) -> str:
        """A short, honest citation line for the model and the UI."""
        if not self.source_title:
            return f"{self.concept_title} (Tessera curriculum)"
        parts = [f"{self.source_title}"]
        if self.license_name:
            parts.append(self.license_name)
        if self.source_url:
            parts.append(self.source_url)
        return f"{self.concept_title} — " + " · ".join(parts)


def tokenise(text: str) -> list[str]:
    """Lower-cased word tokens, stopwords and very short words removed."""
    tokens = re.findall(r"[a-z0-9][a-z0-9'+#.-]*", text.lower())
    return [t for t in tokens if len(t) >= MIN_TOKEN_LEN and t not in STOPWORDS]


def _score(question_tokens: set[str], text: str, title: str) -> float:
    """Token overlap with a bonus for title matches.

    Deliberately simple and explainable: no embeddings, no vector store, nothing
    that can silently invent relevance. A term that appears in the title is much
    stronger evidence of "this is what the learner means" than one buried in a
    paragraph, so titles are weighted three times.
    """
    body_tokens = set(tokenise(text))
    title_tokens = set(tokenise(title))
    body_hits = len(question_tokens & body_tokens)
    title_hits = len(question_tokens & title_tokens)
    if body_hits == 0 and title_hits == 0:
        return 0.0
    return title_hits * 3.0 + body_hits


def search(db: Session, question: str, limit: int = 4) -> list[Passage]:
    """Return the most relevant passages for a question, best first."""
    question_tokens = set(tokenise(question))
    if not question_tokens:
        return []

    passages: list[Passage] = []
    for concept in db.query(Concept).all():
        lesson = db.query(Lesson).filter(Lesson.concept_id == concept.id).first()
        source = db.get(SourceRow, lesson.source_id) if lesson and lesson.source_id else None

        # The searchable text is what the learner would actually be told.
        text_parts = [concept.summary, concept.explanation]
        if lesson is not None:
            text_parts.extend([lesson.explanation, lesson.example, lesson.application, lesson.recap])
        body = "\n".join(part for part in text_parts if part)

        score = _score(question_tokens, body, concept.title)
        if score <= 0:
            continue

        excerpt = body if len(body) <= MAX_PASSAGE_CHARS else body[:MAX_PASSAGE_CHARS] + " …[truncated]"
        passages.append(
            Passage(
                concept_id=concept.id,
                concept_title=concept.title,
                subject=concept.subject,
                text=excerpt,
                score=score,
                source_title=source.title if source else None,
                source_url=source.url if source else None,
                license_name=source.license_name if source else None,
                attribution=source.attribution if source else None,
            )
        )

    passages.sort(key=lambda item: item.score, reverse=True)
    return passages[:limit]


def context_block(passages: list[Passage]) -> str:
    """Format passages for the model, with the citation of each one attached."""
    if not passages:
        return "No material in the knowledge graph matched the question."
    blocks = []
    for index, passage in enumerate(passages, start=1):
        blocks.append(f"[{index}] {passage.concept_title} ({passage.subject})\n{passage.text}\nCitation: {passage.as_citation()}")
    return "\n\n".join(blocks)
