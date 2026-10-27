"""Domain model: knowledge graph, learner model, and evidence.

The two central tables are `concepts` (the graph) and `concept_states` (the
learner model). Everything else is either evidence feeding the learner model
(`attempts`) or material attached to the graph (`lessons`, `questions`).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return uuid.uuid4().hex


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120), default="")
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class SessionToken(Base):
    __tablename__ = "session_tokens"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SourceRow(Base):
    """Provenance for one piece of material (see app.content for the gate)."""

    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(300))
    author: Mapped[str] = mapped_column(String(200), default="")
    url: Mapped[str] = mapped_column(String(600))
    license_class: Mapped[str] = mapped_column(String(20))
    license_name: Mapped[str] = mapped_column(String(120), default="")
    commercial_use_ok: Mapped[bool] = mapped_column(Boolean, default=False)
    attribution: Mapped[str] = mapped_column(Text, default="")
    retrieved_at: Mapped[str] = mapped_column(String(20), default="")
    #: False for catalogue entries: metadata and a link only, no reproduced text.
    holds_copy: Mapped[bool] = mapped_column(Boolean, default=True)


class Concept(Base):
    """A node in the knowledge graph.

    `owner_id` distinguishes the two kinds of concept that now share this table:

    * **NULL — catalogue material.** The seeded curriculum. Everyone can read it;
      nobody can edit it through the API.
    * **A learner id — their own concept.** Visible to that learner alone, at the
      cost of being invisible to everyone else, including the tutor's retrieval.
      Getting this wrong would leak one learner's private notes into another's
      answers, so every read path filters on `owner_id IS NULL OR owner_id = :me`
      (one helper: `app.library.visible_concepts`).
    """

    __tablename__ = "concepts"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    #: NULL for catalogue material; a learner id for a learner-authored concept.
    owner_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    subject: Mapped[str] = mapped_column(String(80), index=True)
    summary: Mapped[str] = mapped_column(Text, default="")
    explanation: Mapped[str] = mapped_column(Text, default="")
    difficulty: Mapped[float] = mapped_column(Float, default=3.0)
    mastery_threshold: Mapped[float] = mapped_column(Float, default=0.75)
    #: Position used only to keep the map readable; it is not a dependency.
    ordering: Mapped[int] = mapped_column(Integer, default=0)


class ConceptEdge(Base):
    """A typed edge between concepts. `prerequisite` gates recommendations.

    Edges belong to the catalogue (`owner_id` NULL) or to one learner. A learner's
    edges are how they record that *they* find two ideas related — which is the
    relationship-building the curriculum asks for, and personal by nature: two
    learners can disagree about what contrasts with what, and both are right.

    The unique constraint includes the owner so the same pair can carry the same
    relation once per learner. Note that PostgreSQL treats NULLs as distinct, so
    catalogue edges rely on the seeder being idempotent plus a check in
    `app.library.relate`; neither the database alone nor the code alone is enough,
    which is why the tests cover both paths.
    """

    __tablename__ = "concept_edges"
    __table_args__ = (
        # Named so the migration can drop and recreate it explicitly, and so the
        # database and the model agree on what the constraint is called.
        UniqueConstraint(
            "from_concept_id",
            "to_concept_id",
            "relation",
            "owner_id",
            name="uq_concept_edges_owner_relation",
        ),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    owner_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    from_concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    to_concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    relation: Mapped[str] = mapped_column(String(24), default="prerequisite")


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    hook: Mapped[str] = mapped_column(Text, default="")
    explanation: Mapped[str] = mapped_column(Text, default="")
    example: Mapped[str] = mapped_column(Text, default="")
    application: Mapped[str] = mapped_column(Text, default="")
    recap: Mapped[str] = mapped_column(Text, default="")
    est_minutes: Mapped[int] = mapped_column(Integer, default=5)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"), nullable=True)


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    prompt: Mapped[str] = mapped_column(Text)
    choices: Mapped[list] = mapped_column(JSON, default=list)
    correct_index: Mapped[int] = mapped_column(Integer)
    explanation: Mapped[str] = mapped_column(Text, default="")
    difficulty: Mapped[float] = mapped_column(Float, default=3.0)
    #: The wrong belief this question is designed to detect.
    misconception: Mapped[str] = mapped_column(Text, default="")
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"), nullable=True)


class Attempt(Base):
    """One graded piece of evidence. Never mutated, never deleted on review."""

    __tablename__ = "attempts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    correct: Mapped[bool] = mapped_column(Boolean)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    confidence: Mapped[int] = mapped_column(Integer, default=3)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)


class RetrievalAttempt(Base):
    """One answer to one retrieval prompt. Append-only, like an assessment.

    This is the table stage 3 exists for: until now the only evidence the system
    accepted was a multiple-choice answer. Retrieval practice is the weakest
    diagnosed process (43/100), and it produces evidence in shapes a quiz cannot:
    a blank filled from memory, a paragraph written from memory and then checked
    against the source, a definition produced from a cue.

    Two fields carry the honesty of the record:

    * `graded_by` — "auto" when the server compared the answer with the source
      text, "self" when the learner judged their own recall against the criteria
      shown to them. Self-graded evidence is real but weaker, and
      `evidence_weight` says how much it moves the schedule.
    * `score` — partial credit in [0, 1]. A half-remembered answer is not the
      same as a blank page, and collapsing both to "wrong" loses the very signal
      the reviewer needs.

    Nothing here is ever updated: a mis-graded attempt is followed by another
    attempt, not edited into a different history.
    """

    __tablename__ = "retrieval_attempts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    #: cloze | cued_recall | free_recall | multiple_choice
    format: Mapped[str] = mapped_column(String(24), index=True)
    #: Rebuilds the prompt deterministically; encodes concept, format and seed.
    prompt_id: Mapped[str] = mapped_column(String(120))
    #: Exactly what the learner was shown, so history is readable later even if
    #: the underlying lesson is edited.
    prompt_text: Mapped[str] = mapped_column(Text, default="")
    #: What the learner wrote. For multiple choice this is the chosen text.
    answer_text: Mapped[str] = mapped_column(Text, default="")
    #: What the source says it should have been — the term, or the criteria.
    expected: Mapped[str] = mapped_column(Text, default="")
    score: Mapped[float] = mapped_column(Float, default=0.0)
    #: "auto" or "self".
    graded_by: Mapped[str] = mapped_column(String(8), default="auto")
    #: How much this counts as evidence: 1.0 for a server-graded answer, 0.5 for
    #: one the learner judged themselves.
    evidence_weight: Mapped[float] = mapped_column(Float, default=1.0)
    correct: Mapped[bool] = mapped_column(Boolean, default=False)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    #: Set when the attempt was made inside a learning session, so a session can
    #: report the evidence it produced without the session itself being evidence.
    session_id: Mapped[str | None] = mapped_column(
        ForeignKey("learning_sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)


class ConceptState(Base):
    """The learner model for one concept."""

    __tablename__ = "concept_states"
    __table_args__ = (UniqueConstraint("user_id", "concept_id"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    mastery: Mapped[float] = mapped_column(Float, default=0.0)
    stability_days: Mapped[float] = mapped_column(Float, default=1.0)
    difficulty: Mapped[float] = mapped_column(Float, default=3.0)
    reps: Mapped[int] = mapped_column(Integer, default=0)
    lapses: Mapped[int] = mapped_column(Integer, default=0)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_review_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    concept_ids: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class ChessPuzzle(Base):
    """A tactical position. `solution_uci` is the full winning line, in UCI."""

    __tablename__ = "chess_puzzles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    fen: Mapped[str] = mapped_column(String(120))
    solution_uci: Mapped[list] = mapped_column(JSON, default=list)
    theme: Mapped[str] = mapped_column(String(80), default="tactics")
    difficulty: Mapped[float] = mapped_column(Float, default=3.0)
    concept_id: Mapped[str | None] = mapped_column(ForeignKey("concepts.id"), nullable=True)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"), nullable=True)


# --------------------------------------------------------------------- AI tutor
#
# Threads and items are stored as JSON payloads so ChatKit's own wire models can
# evolve without a migration of their internals. `owner` keeps conversations
# private: the store filters on it, so a guessed id reveals nothing.

class TutorThreadRow(Base):
    __tablename__ = "tutor_threads"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(300), default="")
    status: Mapped[str] = mapped_column(String(40), default="active")
    payload: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)


class TutorItemRow(Base):
    __tablename__ = "tutor_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    thread_id: Mapped[str] = mapped_column(ForeignKey("tutor_threads.id", ondelete="CASCADE"), index=True)
    owner: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(40), default="message")
    payload: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)


# ---------------------------------------------------------------- chess openings
#
# Opening names and ECO codes are factual reference data. Lines are stored as a
# normalised UCI sequence so a transposition (same position, different order)
# resolves to the same opening.

class OpeningRow(Base):
    __tablename__ = "openings"

    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    eco: Mapped[str] = mapped_column(String(3), index=True)
    name: Mapped[str] = mapped_column(String(200))
    family: Mapped[str] = mapped_column(String(80), index=True)
    moves_san: Mapped[str] = mapped_column(Text)
    moves_uci: Mapped[str] = mapped_column(Text, index=True)
    #: Short study note written for this project.
    idea: Mapped[str] = mapped_column(Text, default="")
    concept_id: Mapped[str | None] = mapped_column(ForeignKey("concepts.id"), nullable=True)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"), nullable=True)


class ChessAttempt(Base):
    __tablename__ = "chess_attempts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    puzzle_id: Mapped[str] = mapped_column(ForeignKey("chess_puzzles.id", ondelete="CASCADE"))
    solved: Mapped[bool] = mapped_column(Boolean, default=False)
    moves_uci: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


# ----------------------------------------------------------- learner profile
#
# What the learner reported about themselves, kept apart from what they have
# demonstrated. Nothing here feeds mastery: a questionnaire score is a starting
# hypothesis, while `attempts` is evidence. Two rules are enforced in app.profile
# and tested: a score that was never supplied stays NULL (never zero), and
# assessments are append-only — correcting one means adding a new row.


class LearnerProfile(Base):
    """The learner's own account of their situation. One row per learner."""

    __tablename__ = "learner_profiles"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    #: Free text about constraints, goals and context. Deliberately not scored.
    context: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class Assessment(Base):
    """One instrument a learner completed, with where its numbers came from."""

    __tablename__ = "assessments"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    #: Allow-listed in app.profile.INSTRUMENTS; an unknown id is rejected.
    instrument: Mapped[str] = mapped_column(String(40), index=True)
    label: Mapped[str] = mapped_column(String(120), default="")
    #: Who put the numbers in: the learner, or a report the learner transcribed.
    reported_by: Mapped[str] = mapped_column(String(20), default="learner")
    source_url: Mapped[str] = mapped_column(String(600), default="")
    source_note: Mapped[str] = mapped_column(Text, default="")
    #: ISO date, or "" when the date was not supplied. Never guessed.
    administered_on: Mapped[str] = mapped_column(String(10), default="")
    scale_min: Mapped[float] = mapped_column(Float, default=0.0)
    scale_max: Mapped[float] = mapped_column(Float, default=100.0)
    #: Retiring a bad row is recorded, not destructive.
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archive_reason: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)


class AssessmentScore(Base):
    """One axis of one assessment. `value` is NULL when it was not supplied."""

    __tablename__ = "assessment_scores"
    __table_args__ = (UniqueConstraint("assessment_id", "axis", "name"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    assessment_id: Mapped[str] = mapped_column(
        ForeignKey("assessments.id", ondelete="CASCADE"), index=True
    )
    #: dimension | process | preference | attribute | label
    axis: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(60))
    #: NULL means "not supplied". Never coerced to 0.0 — see tests.
    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    #: For categorical results (e.g. "INTJ", "Kinesthetic") where a number would lie.
    value_label: Mapped[str] = mapped_column(String(80), default="")
    note: Mapped[str] = mapped_column(Text, default="")


# ------------------------------------------------------- sessions and reference
#
# The first tables in Tessera that hold something a learner *did* rather than
# something they answered. A session is deliberately not a pomodoro timer: it is a
# statement of intent (objective, stopping condition) and a record of what
# happened, so the weekly review has something to read other than a duration.


class LearningSession(Base):
    """One deliberate sitting on one concept.

    `status='open'` is the interruption-recovery mechanism: a session that is not
    finished stays open, is listed on return, and can be resumed or abandoned
    without pretending it did not happen.
    """

    __tablename__ = "learning_sessions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    #: What this sitting is for, in the learner's words. Required: a session with
    #: no objective is just time spent.
    objective: Mapped[str] = mapped_column(Text)
    #: When to stop. Required for the same reason.
    stopping_condition: Mapped[str] = mapped_column(Text)
    planned_minutes: Mapped[int] = mapped_column(Integer, default=25)
    #: priming | encoding | reference | retrieval | application | reflection
    activities: Mapped[list] = mapped_column(JSON, default=list)
    reflection: Mapped[str] = mapped_column(Text, default="")
    evidence: Mapped[str] = mapped_column(Text, default="")
    #: open | completed | partial | abandoned
    status: Mapped[str] = mapped_column(String(16), default="open", index=True)
    minutes_spent: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ReferenceNote(Base):
    """A note kept for later lookup, tied to a concept and to its owner.

    The distinction this table exists to make: a note is not learning. Writing one
    is cheap and feels productive, which is why the diagnosed reference gap is not
    fixed by more notes. The API therefore reports notes *separately* from
    mastery, and nothing here feeds `concept_states`.
    """

    __tablename__ = "reference_notes"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    #: Where the note came from. Free text on purpose: a URL, a page number, a
    #: lecture. Never inferred, never filled in with a placeholder.
    source_ref: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
