"""Retrieval practice: four ways to find out what a learner can produce.

Stage 1 measured what an instrument said about a learner; stage 2 let a learner
write things down. Neither showed whether anything could be recalled, and the
diagnostic the product is built around says retrieval is the weakest process
(43/100) while reference — keeping notes to look things up later — is at 0%. More
notes would not close that, and a multiple-choice quiz answers a different
question: *can you recognise it*, not *can you produce it*.

Four formats, in increasing strength of evidence:

| format | what the learner does | graded by | evidence |
| --- | --- | --- | --- |
| `multiple_choice` | picks an option | the server | 1.0 |
| `cloze` | fills one blank from a sentence | the server | 1.0 |
| `cued_recall` | writes an answer to a cue | themselves, against criteria | 0.5 |
| `free_recall` | writes everything they remember | themselves, against criteria | 0.5 |

Two honesty rules run through the module:

**A prompt is rebuilt, never stored.** `prompt_id` encodes the concept, the format
and a seed. Grading rebuilds the same prompt from the same seed and compares
against the source text. Nothing is held in server memory between the GET and the
POST, so a restart, a second worker, or a tab left open overnight all behave the
same way — and the client cannot invent an answer key because it never receives
one.

**Self-grading is evidence, not proof.** The criteria shown are lines from the
material itself, quoted, never generated: the learner ticks the ones they actually
produced. That is the only workable design for free recall, and it is why such an
attempt carries half weight in the scheduler. A learner can still cheat their own
schedule; what they cannot do is make the system *claim* they were tested.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from . import learner, library, mastery as mastery_mod
from .models import Concept, Lesson, Question, RetrievalAttempt, User

#: Evidence weight each format carries into the scheduler.
FORMAT_EVIDENCE = {
    "multiple_choice": 1.0,
    "cloze": 1.0,
    "cued_recall": 0.5,
    "free_recall": 0.5,
}

#: A score at or above this counts as recall for scheduling purposes.
CORRECT_THRESHOLD = 0.7

MAX_ANSWER_CHARS = 6_000
MAX_CRITERIA = 5

STOPWORDS = frozenset(
    """
    a an the is are was were be been being and or but if then than so of in on at to for with
    about into from by as that this these those it its i me my we our you your they them he she
    do does did not no yes can could should would will what why how when where which who whom
    whose there here also into via just very more most much many some any each other same
    """.split()
)


class PracticeError(ValueError):
    """A request that cannot be graded. Routes turn this into a 4xx."""

    def __init__(self, message: str, *, status: int = 422) -> None:
        super().__init__(message)
        self.status = status


# ---------------------------------------------------------------- text helpers

SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


def sentences(text: str) -> list[str]:
    """Sentence-ish chunks, whitespace-normalised, empties dropped."""
    flat = re.sub(r"\s+", " ", text or "").strip()
    if not flat:
        return []
    return [chunk.strip() for chunk in SENTENCE_SPLIT.split(flat) if len(chunk.strip()) > 12]


def words(text: str) -> list[str]:
    return re.findall(r"[A-Za-z][A-Za-z'+-]*", text or "")


def normalise(text: str) -> str:
    """Lower-case, strip punctuation and collapse spaces — for answer comparison."""
    return re.sub(r"[^a-z0-9 ]+", " ", (text or "").lower()).strip()


def _seed(prompt_seed: int) -> int:
    return abs(int(prompt_seed))


def make_prompt_id(concept_id: str, fmt: str, prompt_seed: int) -> str:
    return f"{concept_id}#{fmt}#{_seed(prompt_seed)}"


def parse_prompt_id(prompt_id: str) -> tuple[str, str, int]:
    parts = (prompt_id or "").split("#")
    if len(parts) != 3:
        raise PracticeError("that prompt id is not valid")
    concept_id, fmt, raw_seed = parts
    if fmt not in FORMAT_EVIDENCE:
        raise PracticeError(f"unknown retrieval format {fmt!r}")
    try:
        prompt_seed = int(raw_seed)
    except ValueError as error:
        raise PracticeError("that prompt id is not valid") from error
    return concept_id, fmt, prompt_seed


# --------------------------------------------------------------- source text


@dataclass(frozen=True)
class Material:
    """Everything a prompt can legitimately be built from."""

    concept: Concept
    lesson: Lesson | None
    summary: str
    explanation: str
    sentences: tuple[str, ...]

    @property
    def has_prose(self) -> bool:
        return bool(self.sentences)


def material_for(db: Session, user: User, concept_id: str) -> Material:
    concept = library.get_concept(db, user, concept_id)
    lesson = db.query(Lesson).filter(Lesson.concept_id == concept.id).first()

    parts: list[str] = []
    if concept.summary:
        parts.append(concept.summary)
    if concept.explanation:
        parts.append(concept.explanation)
    if lesson is not None:
        # Recap first: it is the compressed statement of what should be recalled.
        for field in (lesson.recap, lesson.explanation, lesson.application, lesson.example):
            value = getattr(lesson, field, "") or ""
            if value:
                parts.append(value)

    collected: list[str] = []
    for part in parts:
        collected.extend(sentences(part))
    # De-duplicate while keeping order: the same line twice in a rubric would
    # quietly double its weight.
    seen: set[str] = set()
    unique: list[str] = []
    for line in collected:
        key = line.lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(line)

    return Material(
        concept=concept,
        lesson=lesson,
        summary=concept.summary or "",
        explanation=concept.explanation or "",
        sentences=tuple(unique),
    )


def formats_by_concept(db: Session, concept_ids: list[str]) -> dict[str, list[str]]:
    """`available_formats` for many concepts in a fixed number of queries.

    The review queue needs a suggested format for each due item, and asking per
    concept turned a four-query screen into a hundred-query one. Two extra queries
    here, regardless of how many concepts are due.
    """
    if not concept_ids:
        return {}
    with_questions = {
        row[0]
        for row in db.query(Question.concept_id)
        .filter(Question.concept_id.in_(concept_ids))
        .distinct()
        .all()
    }
    with_lessons = {
        row[0]
        for row in db.query(Lesson.concept_id)
        .filter(Lesson.concept_id.in_(concept_ids))
        .distinct()
        .all()
    }
    prose = {
        concept.id
        for concept in db.query(Concept).filter(Concept.id.in_(concept_ids)).all()
        if (concept.summary or "").strip() or (concept.explanation or "").strip()
    }

    result: dict[str, list[str]] = {}
    for concept_id in concept_ids:
        formats: list[str] = []
        if concept_id in with_questions:
            formats.append("multiple_choice")
        if concept_id in prose or concept_id in with_lessons:
            formats.extend(["cloze", "cued_recall", "free_recall"])
        result[concept_id] = formats
    return result


def available_formats(db: Session, concept: Concept) -> list[str]:
    """Which formats this concept can actually support, with no invented content."""
    formats: list[str] = []
    if db.query(Question).filter(Question.concept_id == concept.id).count() > 0:
        formats.append("multiple_choice")
    lesson = db.query(Lesson).filter(Lesson.concept_id == concept.id).first()
    prose = bool((concept.summary or "").strip() or (concept.explanation or "").strip() or lesson)
    if prose:
        formats.extend(["cloze", "cued_recall", "free_recall"])
    return formats


def _cloze_candidates(material: Material) -> list[str]:
    """Terms worth blanking: words the concept's own summary treats as load-bearing.

    A blank is only fair if the missing word is recoverable from the sentence. The
    rule is deliberately narrow: the term must appear in the concept summary *and*
    in the sentence being blanked, be at least four letters, and not be a
    stopword. When nothing qualifies, the sentence is not used for cloze at all —
    inventing a blank from a weak heuristic would produce an unanswerable prompt
    and blame the learner for it.
    """
    summary_words = {word.lower() for word in words(material.summary)}
    candidates: set[str] = set()
    for sentence in material.sentences:
        for word in words(sentence):
            lowered = word.lower()
            if len(lowered) < 4 or lowered in STOPWORDS:
                continue
            if lowered in summary_words:
                candidates.add(word)
    return sorted(candidates, key=lambda item: (-len(item), item.lower()))


def _blank_sentence(sentence: str, term: str) -> str:
    pattern = re.compile(rf"\b{re.escape(term)}\b", re.IGNORECASE)
    return pattern.sub("_____", sentence, count=1)


# ------------------------------------------------------------------- prompts


@dataclass(frozen=True)
class Prompt:
    prompt_id: str
    concept_id: str
    concept_title: str
    format: str
    prompt_text: str
    #: Extra context shown before the answer box (a cue, a sentence with a blank).
    #: Never contains the expected answer.
    choices: tuple[str, ...] = ()
    #: Self-graded formats only: the criteria the learner judges themselves
    #: against. For free recall these are shown *after* writing, which the route
    #: enforces by requiring `reveal` before returning them.
    criteria: tuple[str, ...] = ()

    def payload(self, *, revealed: bool) -> dict:
        data = {
            "prompt_id": self.prompt_id,
            "concept_id": self.concept_id,
            "concept_title": self.concept_title,
            "format": self.format,
            "prompt": self.prompt_text,
            "choices": list(self.choices),
            "graded_by": "self" if self.format in ("cued_recall", "free_recall") else "auto",
            "evidence_weight": FORMAT_EVIDENCE[self.format],
            "instructions": _INSTRUCTIONS[self.format],
            "criteria": list(self.criteria) if (revealed or self.format == "cued_recall") else [],
            "criteria_hidden": bool(self.criteria) and not revealed and self.format == "free_recall",
        }
        return data


_INSTRUCTIONS = {
    "multiple_choice": "Choose the option you think is right. The server checks it.",
    "cloze": "Fill the blank from memory. The server compares it with the source sentence.",
    "cued_recall": "Answer from memory, then tick only the criteria you actually produced.",
    "free_recall": "Write everything you remember without looking. When you are finished, "
    "the source lines appear and you tick the ones you produced.",
}


def _pick(items: list[str], seed: int) -> str:
    return items[seed % len(items)] if items else ""


def build_prompt(
    db: Session,
    user: User,
    concept_id: str,
    fmt: str,
    prompt_seed: int = 0,
    *,
    revealed: bool = False,
) -> Prompt:
    """Rebuild the prompt for a concept, format and seed. Deterministic."""
    if fmt not in FORMAT_EVIDENCE:
        raise PracticeError(f"unknown retrieval format {fmt!r}; expected one of {sorted(FORMAT_EVIDENCE)}")

    material = material_for(db, user, concept_id)
    concept = material.concept
    prompt_id = make_prompt_id(concept.id, fmt, prompt_seed)
    seed = _seed(prompt_seed)

    if fmt == "multiple_choice":
        questions = (
            db.query(Question)
            .filter(Question.concept_id == concept.id)
            .order_by(Question.id)
            .all()
        )
        if not questions:
            raise PracticeError("this concept has no multiple-choice questions", status=409)
        question = questions[seed % len(questions)]
        return Prompt(
            prompt_id=prompt_id,
            concept_id=concept.id,
            concept_title=concept.title,
            format=fmt,
            prompt_text=question.prompt,
            choices=tuple(question.choices or ()),
        )

    if fmt == "cloze":
        candidates = _cloze_candidates(material)
        usable = [sentence for sentence in material.sentences if any(
            re.search(rf"\b{re.escape(term)}\b", sentence, re.IGNORECASE) for term in candidates
        )]
        if not usable:
            raise PracticeError(
                "there is not enough source text to build a fair cloze for this concept. "
                "Use cued recall or free recall instead.",
                status=409,
            )
        sentence = usable[seed % len(usable)]
        term = next(
            (candidate for candidate in candidates if re.search(rf"\b{re.escape(candidate)}\b", sentence, re.IGNORECASE)),
            None,
        )
        if term is None:  # pragma: no cover - `usable` guarantees the opposite
            raise PracticeError("no blank could be built for that sentence", status=409)
        return Prompt(
            prompt_id=prompt_id,
            concept_id=concept.id,
            concept_title=concept.title,
            format=fmt,
            prompt_text=_blank_sentence(sentence, term),
        )

    if fmt == "cued_recall":
        if not material.sentences:
            raise PracticeError("this concept has no prose to recall yet", status=409)
        cue = material.summary or material.sentences[0]
        return Prompt(
            prompt_id=prompt_id,
            concept_id=concept.id,
            concept_title=concept.title,
            format=fmt,
            prompt_text=(
                f"Cue: {cue}\n\nWithout looking, write what {concept.title} means and why it matters."
            ),
            criteria=material.sentences[:MAX_CRITERIA],
        )

    # free recall
    if not material.sentences:
        raise PracticeError("this concept has no prose to recall yet", status=409)
    return Prompt(
        prompt_id=prompt_id,
        concept_id=concept.id,
        concept_title=concept.title,
        format="free_recall",
        prompt_text=(
            f"Write everything you can remember about {concept.title}. "
            "Do not open the lesson. Aim for two or three minutes of writing."
        ),
        criteria=material.sentences[:MAX_CRITERIA],
    )


# ------------------------------------------------------------------- grading


def grade_cloze(answer: str, expected: str) -> tuple[float, str]:
    """Compare a filled blank with the term. Returns (score, explanation)."""
    given = normalise(answer)
    target = normalise(expected)
    if not given:
        return 0.0, "Nothing was entered."
    if given == target:
        return 1.0, f"Exactly the source term: “{expected}”."
    # A close inflection ("variables" for "variable") is the same knowledge; a
    # different word is not. Prefix matching on the shorter of the two is the
    # narrowest rule that captures this without accepting unrelated words.
    shorter, longer = (given, target) if len(given) <= len(target) else (target, given)
    if len(shorter) >= 4 and longer.startswith(shorter):
        return 0.75, f"Close: the source says “{expected}”. Counted, at reduced credit."
    if target and target in given.split():
        return 0.75, f"The source term appears in your answer: “{expected}”."
    return 0.0, f"The source says “{expected}”."


def grade_self(checked: list[int], criteria_count: int) -> tuple[float, str]:
    """Turn the ticked criteria into a score."""
    if criteria_count <= 0:
        raise PracticeError("there are no criteria to judge against")
    unique = sorted({int(index) for index in checked})
    if any(index < 0 or index >= criteria_count for index in unique):
        raise PracticeError("a ticked criterion is not in this prompt's list")
    score = len(unique) / criteria_count
    if not unique:
        return 0.0, "None of the source points were produced. That is useful information, not a failure."
    return round(score, 4), f"Produced {len(unique)} of {criteria_count} source points."


def _material_fingerprint(material: Material) -> str:
    """Short hash of the source text, so a changed lesson is visible in history."""
    joined = "\n".join(material.sentences)
    return hashlib.sha1(joined.encode("utf-8")).hexdigest()[:8]


@dataclass(frozen=True)
class GradedAttempt:
    attempt: RetrievalAttempt
    explanation: str
    model: dict


def record(
    db: Session,
    user: User,
    *,
    prompt_id: str,
    answer: str = "",
    choice_index: int | None = None,
    checked: list[int] | None = None,
    latency_ms: int = 0,
    session_id: str | None = None,
    now: datetime | None = None,
) -> GradedAttempt:
    """Grade one answer, store it, and move the learner model.

    The order matters: the attempt row is written before the model is updated, so a
    failure between the two leaves evidence that was recorded but not yet acted
    on — recoverable — rather than a model that claims evidence nobody can find.
    """
    now = now or datetime.now(timezone.utc)
    concept_id, fmt, prompt_seed = parse_prompt_id(prompt_id)
    prompt = build_prompt(db, user, concept_id, fmt, prompt_seed, revealed=True)
    material = material_for(db, user, concept_id)

    if answer and len(answer) > MAX_ANSWER_CHARS:
        raise PracticeError(f"an answer longer than {MAX_ANSWER_CHARS} characters will not be stored")

    if session_id is not None:
        # Raises NotFound for somebody else's session.
        library.get_session(db, user, session_id)

    if fmt == "multiple_choice":
        if choice_index is None:
            raise PracticeError("a multiple-choice answer needs a choice_index")
        question = (
            db.query(Question)
            .filter(Question.concept_id == concept_id)
            .order_by(Question.id)
            .all()
        )[prompt_seed % db.query(Question).filter(Question.concept_id == concept_id).count()]
        choices = list(question.choices or [])
        if not 0 <= choice_index < len(choices):
            raise PracticeError("choice_index is outside the options offered")
        score = 1.0 if choice_index == question.correct_index else 0.0
        expected = choices[question.correct_index] if choices else ""
        answer_text = choices[choice_index]
        explanation = question.explanation or ""
        if score == 0.0 and question.misconception:
            explanation = f"{explanation} This answer usually means: {question.misconception}".strip()

    elif fmt == "cloze":
        # Recover the blanked term by rebuilding the same prompt and blanking it.
        candidates = _cloze_candidates(material)
        usable = [sentence for sentence in material.sentences if any(
            re.search(rf"\b{re.escape(term)}\b", sentence, re.IGNORECASE) for term in candidates
        )]
        sentence = usable[prompt_seed % len(usable)]
        expected = next(
            candidate for candidate in candidates
            if re.search(rf"\b{re.escape(candidate)}\b", sentence, re.IGNORECASE)
        )
        score, explanation = grade_cloze(answer, expected)
        answer_text = answer

    else:
        if checked is None:
            raise PracticeError(
                "recall formats are judged against the source lines, so the criteria you "
                "produced must be sent as `checked` (an empty list is a valid answer)"
            )
        expected = "\n".join(prompt.criteria)
        score, explanation = grade_self(checked, len(prompt.criteria))
        answer_text = answer

    weight = FORMAT_EVIDENCE[fmt]
    correct = score >= CORRECT_THRESHOLD

    attempt = RetrievalAttempt(
        user_id=user.id,
        concept_id=concept_id,
        format=fmt,
        prompt_id=prompt_id,
        prompt_text=prompt.prompt_text,
        answer_text=answer_text,
        expected=expected,
        score=score,
        graded_by="self" if weight < 1.0 else "auto",
        evidence_weight=weight,
        correct=correct,
        latency_ms=max(0, latency_ms),
        session_id=session_id,
        created_at=now,
    )
    db.add(attempt)
    db.flush()

    concept = db.get(Concept, concept_id)
    model = learner.apply_evidence(
        db,
        user=user,
        concept=concept,
        correct=correct,
        latency_ms=latency_ms,
        now=now,
        evidence_weight=weight,
    )
    db.commit()
    db.refresh(attempt)

    return GradedAttempt(
        attempt=attempt,
        explanation=f"{explanation} Source fingerprint {_material_fingerprint(material)}.",
        model=model,
    )


def attempt_payload(attempt: RetrievalAttempt, concept_title: str = "") -> dict:
    return {
        "id": attempt.id,
        "concept_id": attempt.concept_id,
        "concept_title": concept_title,
        "format": attempt.format,
        "prompt": attempt.prompt_text,
        "answer": attempt.answer_text,
        "expected": attempt.expected,
        "score": attempt.score,
        "correct": attempt.correct,
        "graded_by": attempt.graded_by,
        "evidence_weight": attempt.evidence_weight,
        "latency_ms": attempt.latency_ms,
        "session_id": attempt.session_id,
        "created_at": attempt.created_at.isoformat(),
    }


def history(db: Session, user: User, *, concept_id: str | None = None, limit: int = 50) -> list[dict]:
    query = db.query(RetrievalAttempt).filter(RetrievalAttempt.user_id == user.id)
    if concept_id:
        query = query.filter(RetrievalAttempt.concept_id == library.get_concept(db, user, concept_id).id)
    rows = query.order_by(RetrievalAttempt.created_at.desc()).limit(limit).all()
    titles = {
        concept.id: concept.title
        for concept in library.visible_concepts(db, user).all()
    }
    return [attempt_payload(row, titles.get(row.concept_id, "")) for row in rows]


def summary(db: Session, user: User) -> dict:
    """Counts by format and grading method.

    Deliberately no composite "recall score": averaging a self-graded paragraph
    with a server-graded blank would produce a number that means nothing and looks
    authoritative. The counts are here so a learner can see which formats they
    actually use.
    """
    rows = db.query(RetrievalAttempt).filter(RetrievalAttempt.user_id == user.id).all()
    by_format: dict[str, dict] = {}
    for row in rows:
        bucket = by_format.setdefault(
            row.format,
            {"format": row.format, "attempts": 0, "mean_score": 0.0, "auto_graded": 0, "self_graded": 0},
        )
        bucket["attempts"] += 1
        bucket["mean_score"] += row.score
        bucket["auto_graded" if row.graded_by == "auto" else "self_graded"] += 1
    for bucket in by_format.values():
        bucket["mean_score"] = round(bucket["mean_score"] / max(1, bucket["attempts"]), 3)
    return {
        "total": len(rows),
        "by_format": sorted(by_format.values(), key=lambda item: item["format"]),
        "note": (
            "Counts of attempts and how they were graded. Self-graded attempts are "
            "shown separately because they are weaker evidence."
        ),
    }


def session_evidence(db: Session, user: User, session_id: str) -> dict:
    """What a sitting actually produced, for the session record."""
    rows = (
        db.query(RetrievalAttempt)
        .filter(RetrievalAttempt.user_id == user.id, RetrievalAttempt.session_id == session_id)
        .all()
    )
    return {
        "attempts": len(rows),
        "correct": sum(1 for row in rows if row.correct),
        "mean_score": round(sum(row.score for row in rows) / len(rows), 3) if rows else 0.0,
        "formats": sorted({row.format for row in rows}),
        "note": (
            "These are the retrieval attempts made during this sitting. The sitting itself "
            "is not evidence; the answers are."
        )
        if rows
        else "No retrieval attempts were recorded during this sitting.",
    }


def tier_for(concept: Concept, mastery_value: float) -> str:
    return mastery_mod.tier(mastery_value, concept.mastery_threshold)
