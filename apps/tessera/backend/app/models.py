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
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


#: JSON lists on SQLite, jsonb on PostgreSQL. This is not cosmetic: jsonb is
#: stored decomposed and can be indexed and queried with containment operators,
#: while `json` keeps text and re-parses on every access. A column declared `JSON`
#: produces `json` on PostgreSQL, which is what this was doing until the schema
#: was finally inspected on a real server.
JSONList = JSON().with_variant(JSONB(), "postgresql")


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
    __table_args__ = (
        # The scales are part of the meaning of the numbers: a difficulty of 9 or a
        # mastery threshold of 1.4 would silently break every comparison built on
        # them. Python validates input; the database refuses bad rows from anywhere,
        # including a migration, a seeder or a psql session.
        CheckConstraint("difficulty >= 1.0 AND difficulty <= 5.0", name="ck_concepts_difficulty_range"),
        CheckConstraint(
            "mastery_threshold > 0.0 AND mastery_threshold <= 1.0",
            name="ck_concepts_threshold_range",
        ),
    )

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
        # The vocabulary lives in `app.library.RELATIONS` and drives behaviour
        # (only `prerequisite` gates recommendations). A relation outside the set
        # would be stored happily and then silently ignored by every read path, so
        # the database keeps the two lists from disagreeing.
        CheckConstraint(
            "relation IN ('prerequisite', 'contrasts_with', 'example_of', 'mechanism_behind', "
            "'evidence_for', 'application_of', 'exception_to', 'related_to')",
            name="ck_concept_edges_relation_vocabulary",
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
    __table_args__ = (
        CheckConstraint("correct_index >= 0", name="ck_questions_correct_index"),
        CheckConstraint("difficulty >= 1.0 AND difficulty <= 5.0", name="ck_questions_difficulty_range"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    concept_id: Mapped[str] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), index=True)
    prompt: Mapped[str] = mapped_column(Text)
    choices: Mapped[list] = mapped_column(JSONList, default=list)
    correct_index: Mapped[int] = mapped_column(Integer)
    explanation: Mapped[str] = mapped_column(Text, default="")
    difficulty: Mapped[float] = mapped_column(Float, default=3.0)
    #: The wrong belief this question is designed to detect.
    misconception: Mapped[str] = mapped_column(Text, default="")
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"), nullable=True)


class Attempt(Base):
    """One graded piece of evidence. Never mutated, never deleted on review."""

    __tablename__ = "attempts"
    __table_args__ = (
        # Calibration is computed from `confidence` against `correct`. If confidence
        # could fall outside 1..5 the calibration table would have a bucket nobody
        # can act on, so the range is enforced here as well as in the route.
        CheckConstraint("confidence >= 1 AND confidence <= 5", name="ck_attempts_confidence_range"),
        CheckConstraint("latency_ms >= 0", name="ck_attempts_latency_non_negative"),
        # Evidence is read per learner, newest first, by the analytics screen.
        Index("ix_attempts_user_created", "user_id", "created_at"),
    )

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
    __table_args__ = (
        # Every composite score in stage 4 averages `score * evidence_weight`. A
        # score outside [0, 1] or a weight outside (0, 1] would make those averages
        # meaningless in a way no amount of Python validation could catch after the
        # fact.
        CheckConstraint("score >= 0.0 AND score <= 1.0", name="ck_retrieval_score_range"),
        CheckConstraint(
            "evidence_weight > 0.0 AND evidence_weight <= 1.0",
            name="ck_retrieval_weight_range",
        ),
        CheckConstraint("latency_ms >= 0", name="ck_retrieval_latency_non_negative"),
        CheckConstraint("graded_by IN ('auto', 'self')", name="ck_retrieval_graded_by"),
        # History and the competency rollup both read one learner's attempts newest
        # first; this index serves both and replaces the single-column one.
        Index("ix_retrieval_attempts_user_created", "user_id", "created_at"),
    )

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
    __table_args__ = (
        UniqueConstraint("user_id", "concept_id"),
        CheckConstraint("mastery >= 0.0 AND mastery <= 1.0", name="ck_concept_states_mastery_range"),
        CheckConstraint("stability_days > 0.0", name="ck_concept_states_stability_positive"),
        CheckConstraint(
            "difficulty >= 1.0 AND difficulty <= 5.0", name="ck_concept_states_difficulty_range"
        ),
        CheckConstraint("reps >= 0 AND lapses >= 0", name="ck_concept_states_counts_non_negative"),
        # The due queue is exactly `where user_id = :me and next_review_at <= now`.
        # On PostgreSQL this is the difference between a sequential scan over every
        # learner's states and an index range scan.
        Index("ix_concept_states_user_due", "user_id", "next_review_at"),
    )

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
    concept_ids: Mapped[list] = mapped_column(JSONList, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class ChessPuzzle(Base):
    """A tactical position. `solution_uci` is the full winning line, in UCI."""

    __tablename__ = "chess_puzzles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    fen: Mapped[str] = mapped_column(String(120))
    solution_uci: Mapped[list] = mapped_column(JSONList, default=list)
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
    moves_uci: Mapped[list] = mapped_column(JSONList, default=list)
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
    __table_args__ = (
        # A chain of submissions, not a rewrite: `supersedes_id` points at the
        # submission this one replaces. Two rules make the chain trustworthy.
        # A row cannot supersede itself, and — because the column is UNIQUE — a
        # submission can be superseded at most once, so the history is a line
        # rather than a tree nobody can compare.
        CheckConstraint(
            "supersedes_id IS NULL OR supersedes_id <> id",
            name="ck_assessments_not_self_superseding",
        ),
        CheckConstraint(
            "reported_by IN ('learner', 'provider-report')",
            name="ck_assessments_reported_by",
        ),
        # A reversed scale would make every percentage computed downstream
        # nonsensical, and would do it silently.
        CheckConstraint("scale_min < scale_max", name="ck_assessments_scale_order"),
        UniqueConstraint("supersedes_id", name="uq_assessments_supersedes"),
        # "What replaced this row, and what did the learner see before it?" is a
        # per-learner question asked on the profile screen.
        Index("ix_assessments_user_supersedes", "user_id", "supersedes_id"),
    )

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
    #: The submission this row replaces when it is a reassessment. NULL for a
    #: first submission. ON DELETE SET NULL because deleting a predecessor must
    #: not take its successor with it: the newer numbers stay valid on their own.
    supersedes_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("assessments.id", ondelete="SET NULL"),
        nullable=True,
    )
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
    __table_args__ = (
        CheckConstraint(
            "status IN ('open', 'completed', 'partial', 'abandoned')",
            name="ck_learning_sessions_status",
        ),
        CheckConstraint(
            "planned_minutes >= 5 AND planned_minutes <= 240",
            name="ck_learning_sessions_planned_minutes",
        ),
        CheckConstraint(
            "minutes_spent IS NULL OR (minutes_spent >= 0 AND minutes_spent <= 600)",
            name="ck_learning_sessions_minutes_spent",
        ),
        Index("ix_learning_sessions_user_started", "user_id", "started_at"),
    )

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
    activities: Mapped[list] = mapped_column(JSONList, default=list)
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
    __table_args__ = (Index("ix_reference_notes_user_updated", "user_id", "updated_at"),)

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
