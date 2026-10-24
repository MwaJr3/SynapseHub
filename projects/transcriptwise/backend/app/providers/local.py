"""No-key development alternative. Extracts real text; NEVER masquerades as an LLM."""

import math
import re
from collections import Counter

from app.errors import ServiceError
from app.schemas import AnalysisConfig, Detail, Flashcard, Guide, GuideSection, LearningItem, QuizQuestion

STOP = set(
    "a an and are as at be been being but by can could did do does for from had has have how i if in into is it its may might more most not of on one or our should so some than that the their them then there these they this those through to use used using was we were what when where which while who why will with would you your also about each such very just all let's it's don't".split()
)
DEFINITION = re.compile(r"^([A-Za-z][\w \-/]{1,55}?)\s+(?:is|means|refers to|is defined as)\s+(.+)", re.I)


def tokens(text: str):
    return [w.lower() for w in re.findall(r"[A-Za-z][A-Za-z0-9_-]{2,}", text) if w.lower() not in STOP]


def sentences(segments: list[dict]):
    output = []
    for s in segments:
        for sentence in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])", s["text"]):
            sentence = sentence.strip()
            if len(sentence) > 20:
                output.append((sentence, s["id"]))
    if not output:
        output = [(s["text"], s["id"]) for s in segments]
    return output


def item(identifier, body, refs, heading="", provenance="source_claim", details=None):
    return LearningItem(
        id=identifier, body=body, refs=list(dict.fromkeys(refs)), heading=heading, provenance=provenance, details=details or []
    )


class LocalExtractiveProvider:
    name = "local-extractive-v1"

    async def generate(self, segments: list[dict], config: AnalysisConfig, title: str, target: str | None = None) -> Guide:
        if config.output_language.lower() not in ("english", "en"):
            raise ServiceError(
                "language_not_supported",
                "Local extractive mode cannot translate. Choose English, or configure an AI provider for other output languages.",
            )
        rows = sentences(segments)
        freq = Counter(tokens(" ".join(s["text"] for s in segments)))
        ranked = sorted(
            range(len(rows)),
            key=lambda i: sum(math.log1p(freq[w]) for w in set(tokens(rows[i][0]))) / (max(10, len(tokens(rows[i][0]))) ** 0.65),
            reverse=True,
        )
        distinct = []
        seen = set()
        count = {"quick": 3, "standard": 6, "comprehensive": 8}[config.depth]
        for i in ranked:
            normalized = rows[i][0].lower().strip()
            if normalized not in seen:
                distinct.append(i)
                seen.add(normalized)
            if len(distinct) >= count:
                break
        selected = sorted(distinct)
        sections = []
        # The overview is an honest source excerpt, not a fabricated abstractive summary.
        introductory = rows[: min(2, len(rows))]
        sections.append(
            GuideSection(
                key="overview",
                title="Source overview",
                items=[
                    item("overview-1", " ".join(r[0] for r in introductory), [r[1] for r in introductory], "Opening ideas · source excerpt")
                ],
            )
        )
        sections.append(
            GuideSection(
                key="takeaways", title="Key takeaways", items=[item(f"take-{n}", rows[i][0], [rows[i][1]]) for n, i in enumerate(selected)]
            )
        )
        if config.depth != "quick":
            # All segments considered. Group sequential source material into readable excerpts.
            group_count = min(10 if config.depth == "comprehensive" else 5, len(segments))
            group_size = math.ceil(len(segments) / group_count)
            notes = []
            for n, start in enumerate(range(0, len(segments), group_size)):
                group = segments[start : start + group_size]
                words = Counter(tokens(" ".join(s["text"] for s in group)))
                heading = " · ".join(w.capitalize() for w, _ in words.most_common(3)) or f"Source section {n + 1}"
                # Whole paragraphs retained; the provider makes no rewrite claim.
                notes.append(item(f"note-{n}", "\n\n".join(s["text"] for s in group), [s["id"] for s in group], heading))
            sections.append(GuideSection(key="notes", title="Organized source notes", items=notes))
        definitions = []
        for sentence, ref in rows:
            match = DEFINITION.match(sentence)
            if match and len(match[1].split()) <= 7 and match[1].lower() not in ("this", "it", "there", "that", "here"):
                term = match[1].strip()
                if not any(d[0].lower() == term.lower() for d in definitions):
                    definitions.append((term, sentence, ref, match[2]))
            if len(definitions) >= 8:
                break
        if definitions:
            sections.append(
                GuideSection(
                    key="concepts",
                    title="Concepts in the source",
                    items=[item(f"concept-{n}", sentence, [ref], term) for n, (term, sentence, ref, _) in enumerate(definitions)],
                )
            )
        evidence = [(s, r) for s, r in rows if re.search(r"\b\d+(?:\.\d+)?(?:%|\b)", s)]
        if evidence and config.depth != "quick":
            sections.append(
                GuideSection(
                    key="evidence",
                    title="Facts & figures to examine",
                    items=[
                        item(f"fact-{n}", s, [r], "Stated in the transcript · not independently verified")
                        for n, (s, r) in enumerate(evidence[:8])
                    ],
                )
            )
        recommendations = [
            (s, r)
            for s, r in rows
            if re.search(r"\b(should|recommend|make sure|remember to|must|try to|start by|avoid|practice)\b", s, re.I)
        ]
        if recommendations:
            sections.append(
                GuideSection(
                    key="actions",
                    title="Advice from the source",
                    items=[item(f"action-{n}", s, [r]) for n, (s, r) in enumerate(recommendations[:6])],
                )
            )
        steps = [(s, r) for s, r in rows if re.search(r"^(first\b|second\b|next\b|then\b|finally\b|step\s+\d)", s, re.I)]
        if len(steps) >= 2 and config.depth != "quick":
            sections.append(
                GuideSection(
                    key="procedures",
                    title="Steps described in the source",
                    items=[item(f"step-{n}", s, [r], f"Source step {n + 1}") for n, (s, r) in enumerate(steps[:10])],
                )
            )
        primary = rows[selected[0]] if selected else rows[0]
        if config.include_exercises:
            activity = {
                "programming": "Write a small program that demonstrates the idea. Include one normal case and one edge case, then explain the observed output.",
                "science": "Sketch the relationship described here, identify its assumptions, and design a small, safe calculation or observation to test your explanation.",
                "research": "Restate this claim, identify what evidence the source offers, and write one question that would help you evaluate it independently.",
                "exam": "Explain this idea without looking at the transcript. Then compare your explanation to the source and correct any missing qualifications.",
                "implementation": "Choose one recommendation from the source. Write the smallest practical test, the preparation needed, and an observable success criterion.",
                "professional": "Describe a situation at work where this idea might be useful. Identify a low-risk next step and how you would evaluate its result.",
            }.get(
                config.objective,
                "Explain this source idea in your own words. Write a concrete example, then compare your explanation with the cited passage.",
            )
            sections.append(
                GuideSection(
                    key="applications",
                    title="Put it into practice",
                    items=[
                        item(
                            "application-1",
                            activity,
                            [primary[1]],
                            "A source-based practice activity",
                            "recommendation",
                            [
                                Detail(label="Focus passage", text=primary[0]),
                                Detail(
                                    label="Check your work",
                                    text="Keep the source's important qualifications. Mark anything you add as your own example, not as a statement from the speaker.",
                                ),
                            ],
                        )
                    ],
                )
            )
        if config.include_limitations:
            sections.append(
                GuideSection(
                    key="limitations",
                    title="Reading this guide responsibly",
                    items=[
                        item(
                            "limit-1",
                            "This guide was produced by the local extractive development engine, not a language model. It selects and organizes source text; it cannot verify facts, infer missing prerequisites, translate, or reliably explain unfamiliar concepts. Source statements may be incomplete or incorrect.",
                            [],
                            "Local processing limitations",
                            "recommendation",
                        )
                    ],
                )
            )
        first_concept = definitions[0][0] if definitions else "the main idea in the first takeaway"
        level_tip = {
            "beginner": "Define any unfamiliar words before moving on.",
            "intermediate": "Connect the idea to something you already know.",
            "advanced": "Identify assumptions and test where the idea stops applying.",
        }[config.level]
        sections.append(
            GuideSection(
                key="plan",
                title="Your next learning steps",
                items=[
                    item(
                        "plan-1",
                        f"Start with {first_concept}. {level_tip} Revisit the cited source, attempt the practice activity, then answer the revision questions without looking. Record what still feels unclear in your personal notes.",
                        [primary[1]],
                        "Understand → apply → recall",
                        "recommendation",
                    )
                ],
            )
        )
        quiz, cards = [], []
        if config.include_quiz:
            for n, (term, sentence, ref, definition) in enumerate(definitions[:4]):
                options = list(dict.fromkeys([d[3] for d in definitions[:4]]))
                if len(options) >= 3:
                    quiz.append(
                        QuizQuestion(
                            id=f"q-definition-{n}",
                            kind="multiple_choice",
                            question=f"According to the transcript, what is {term}?",
                            options=options,
                            answer=definition,
                            explanation=sentence,
                            refs=[ref],
                        )
                    )
                else:
                    quiz.append(
                        QuizQuestion(
                            id=f"q-definition-{n}",
                            kind="short_answer",
                            question=f"How does the transcript define {term}?",
                            answer=sentence,
                            explanation="Compare your explanation with this source passage. Open answers are self-assessed, not automatically graded.",
                            refs=[ref],
                        )
                    )
            for n, i in enumerate(selected[: max(1, 4 - len(quiz))]):
                sentence, ref = rows[i]
                quiz.append(
                    QuizQuestion(
                        id=f"q-understand-{n}",
                        kind="short_answer",
                        question=f"Explain this idea in your own words: “{sentence[:350]}”",
                        answer=sentence,
                        explanation="Keep the original meaning and qualifications. This is a self-assessment question, not an automatic measure of mastery.",
                        refs=[ref],
                    )
                )
        if config.include_flashcards:
            for n, (term, sentence, ref, _) in enumerate(definitions[:6]):
                cards.append(Flashcard(id=f"f-definition-{n}", front=f"What does the source say about {term}?", back=sentence, refs=[ref]))
            if not cards:
                for n, i in enumerate(selected[:5]):
                    sentence, ref = rows[i]
                    words = Counter(tokens(sentence))
                    subject = ", ".join(w for w, _ in words.most_common(3)) or "the main topic"
                    cards.append(
                        Flashcard(id=f"f-recall-{n}", front=f"Recall the source's point about {subject}.", back=sentence, refs=[ref])
                    )
        if target:
            sections = [s for s in sections if s.key == target]
            quiz = quiz if target == "quiz" else []
            cards = cards if target == "flashcards" else []
        return Guide(
            title=title,
            sections=sections,
            quiz=quiz,
            flashcards=cards,
            notices=[
                "Local extractive mode — source excerpts and study prompts, not AI-generated explanations. Configure a language-model provider for a fully rewritten learning guide."
            ],
        )
