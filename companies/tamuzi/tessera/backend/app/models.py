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


# --------------------------------------------------------------------- integration
#
# The study planner is a separate application with its own accounts. It is not
# allowed to hold a learner's Tessera password, read their session cookie, or act
# with an administrative identity. What it gets instead is a grant the learner
# makes explicitly, in Tessera, for one read-only scope, with an expiry and a
# visible revocation path. These four tables are that grant.
#
# Nothing here can write to learning data: `learning-summary:read` is the only
# scope the server will ever mint a token for.


class OAuthClient(Base):
    """A registered application allowed to ask for a grant.

    `redirect_uris` is an exact-match allowlist. An authorization code is only ever
    handed to a redirect URI that was registered, which is what stops a tampered
    `redirect_uri` parameter from receiving somebody else's code.
    """

    __tablename__ = "oauth_clients"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    redirect_uris: Mapped[list] = mapped_column(JSONList, default=list)
    allowed_scopes: Mapped[list] = mapped_column(JSONList, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class ConsentGrant(Base):
    """One learner's decision about one application.

    A row exists for every decision that has been made, including a revoked one:
    `revoked_at` is set rather than the row being deleted, because "was access ever
    granted, and to what" has to survive the withdrawal.
    """

    __tablename__ = "consent_grants"
    __table_args__ = (
        UniqueConstraint("user_id", "client_id", name="uq_consent_grants_user_client"),
        CheckConstraint("purpose <> ''", name="ck_consent_grants_purpose_present"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    client_id: Mapped[str] = mapped_column(ForeignKey("oauth_clients.id", ondelete="CASCADE"), index=True)
    scopes: Mapped[list] = mapped_column(JSONList, default=list)
    #: The sentence shown on the consent screen, stored as shown. If the wording
    #: changes, the old grant still says what was agreed to at the time.
    purpose: Mapped[str] = mapped_column(Text)
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AuthorizationCode(Base):
    """A short-lived, single-use authorization code bound to PKCE.

    Only the SHA-256 of the code is stored. A leaked database therefore cannot be
    replayed into a token exchange, the same reason session tokens are hashed.
    """

    __tablename__ = "authorization_codes"
    __table_args__ = (Index("ix_authorization_codes_hash", "code_hash", unique=True),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    code_hash: Mapped[str] = mapped_column(String(64), unique=True)
    client_id: Mapped[str] = mapped_column(ForeignKey("oauth_clients.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    scopes: Mapped[list] = mapped_column(JSONList, default=list)
    redirect_uri: Mapped[str] = mapped_column(String(500))
    #: S256 challenge: BASE64URL(SHA256(verifier)). The plain method is refused.
    code_challenge: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AccessToken(Base):
    """A short-lived bearer token for one learner and one client.

    Read-only is enforced by the scope on the row and checked again by the endpoint;
    there is no write endpoint that accepts these tokens at all.
    """

    __tablename__ = "access_tokens"
    __table_args__ = (
        Index("ix_access_tokens_hash", "token_hash", unique=True),
        CheckConstraint("scopes <> '[]'", name="ck_access_tokens_scopes_present"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    client_id: Mapped[str] = mapped_column(ForeignKey("oauth_clients.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    scopes: Mapped[list] = mapped_column(JSONList, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ------------------------------------------------------------------ stage 5: quests
#
# The pieces that make effort visible without making it farmable.
#
# `XpEntry` is an append-only ledger: an entry is written once, carries the four
# factors that produced its number, and is never updated or deleted. `idempotency_key`
# is what makes a retried request harmless; `(user_id, idempotency_key)` is unique in
# the database, so a double submit that slips past the API is still refused by the
# schema.
#
# Seasons partition the ledger rather than resetting it. Nothing is erased at the end
# of a season, and an old entry still says which season it belonged to and why it was
# worth what it was worth.


class Season(Base):
    """A bounded arc that quests and XP belong to."""

    __tablename__ = "seasons"
    __table_args__ = (
        CheckConstraint("ends_at > starts_at", name="ck_seasons_bounds"),
        Index("ix_seasons_window", "starts_at", "ends_at"),
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    theme: Mapped[str] = mapped_column(String(200), default="")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Quest(Base):
    """A thing worth doing, with a value that has to be earned from real evidence."""

    __tablename__ = "quests"
    __table_args__ = (
        CheckConstraint("difficulty >= 1 AND difficulty <= 5", name="ck_quests_difficulty"),
        CheckConstraint("base_xp > 0 AND base_xp <= 500", name="ck_quests_base_xp"),
        CheckConstraint("min_evidence >= 1 AND min_evidence <= 20", name="ck_quests_min_evidence"),
        CheckConstraint(
            "kind IN ('retrieval', 'practice', 'application', 'reflection')", name="ck_quests_kind"
        ),
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(140))
    summary: Mapped[str] = mapped_column(Text, default="")
    kind: Mapped[str] = mapped_column(String(16))
    #: Catalogue concepts this quest draws on. Empty means "any concept the learner
    #: has in their library", which is what a general review quest is.
    concept_ids: Mapped[list] = mapped_column(JSONList, default=list)
    difficulty: Mapped[int] = mapped_column(Integer, default=2)
    base_xp: Mapped[int] = mapped_column(Integer, default=20)
    #: Retrieval attempts (or session minutes for reflection) required before a claim
    #: can be made. Evidence is counted from tables that already exist.
    min_evidence: Mapped[int] = mapped_column(Integer, default=3)
    season_id: Mapped[str | None] = mapped_column(
        ForeignKey("seasons.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class QuestProgress(Base):
    """One learner's run at one quest in one season."""

    __tablename__ = "quest_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "quest_id", "season_id", name="uq_quest_progress_run"),
        CheckConstraint(
            "state IN ('accepted', 'completed', 'claimed', 'abandoned')",
            name="ck_quest_progress_state",
        ),
        Index("ix_quest_progress_user", "user_id"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    quest_id: Mapped[str] = mapped_column(ForeignKey("quests.id", ondelete="CASCADE"), index=True)
    season_id: Mapped[str] = mapped_column(ForeignKey("seasons.id", ondelete="CASCADE"), index=True)
    state: Mapped[str] = mapped_column(String(16), default="accepted")
    accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class XpEntry(Base):
    """One award. Append-only; the four factors are stored with the result.

    The number is reproducible: `round(base_xp × difficulty × challenge × strategic ×
    evidence)`. Storing the factors means a learner can ask "why 37?" and get an
    answer from the row itself, not from a re-run of a formula that may since have
    changed.
    """

    __tablename__ = "xp_entries"
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uq_xp_entries_idempotency"),
        # One award per quest per season, enforced by the schema rather than by the
        # `state` column. The API checks `state` first, but two requests with two
        # different keys could both read `completed` and both insert; this is the
        # row that makes that impossible. Adjustment rows have no quest id, and
        # NULLs do not collide, so manual credit is unaffected.
        UniqueConstraint("user_id", "quest_id", "season_id", name="uq_xp_entries_quest_run"),
        CheckConstraint("xp >= 0", name="ck_xp_entries_non_negative"),
        CheckConstraint("difficulty_factor > 0", name="ck_xp_entries_difficulty"),
        CheckConstraint("challenge_factor > 0", name="ck_xp_entries_challenge"),
        CheckConstraint("strategic_factor > 0", name="ck_xp_entries_strategic"),
        CheckConstraint("evidence_factor > 0", name="ck_xp_entries_evidence"),
        Index("ix_xp_entries_user_created", "user_id", "created_at"),
        Index("ix_xp_entries_user_season", "user_id", "season_id"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    season_id: Mapped[str] = mapped_column(ForeignKey("seasons.id", ondelete="CASCADE"), index=True)
    quest_id: Mapped[str | None] = mapped_column(
        ForeignKey("quests.id", ondelete="SET NULL"), nullable=True, index=True
    )
    #: Any string the caller chooses, but only honoured once. A UUID per submission is
    #: the intended use; a constant is allowed and simply means "award at most once".
    idempotency_key: Mapped[str] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(20), default="quest")
    base_xp: Mapped[int] = mapped_column(Integer)
    difficulty_factor: Mapped[float] = mapped_column(Float, default=1.0)
    challenge_factor: Mapped[float] = mapped_column(Float, default=1.0)
    strategic_factor: Mapped[float] = mapped_column(Float, default=1.0)
    evidence_factor: Mapped[float] = mapped_column(Float, default=1.0)
    xp: Mapped[int] = mapped_column(Integer)
    #: Why this number: the factors, the cap if one applied, and the concept if the
    #: award came from repeated practice (which is where diminishing returns live).
    reason: Mapped[str] = mapped_column(Text, default="")
    concept_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)


# ------------------------------------------------ learner development (stage 7)
#
# Five tables for the document's Phase I. Two of them exist to hold something the
# system must never fabricate:
#
# * `development_hypotheses` stores a *claim* with the evidence behind it, so a
#   tentative inference ("retrieval practice is probably being avoided") is visible
#   as an inference. Confidence is computed from evidence kinds, not asserted.
# * `self_management_baselines` has no score column at all. The document asks for a
#   behavioural baseline "without inventing a percentage", and the schema is where
#   that instruction becomes impossible to break by accident.
#
# The rest record what a learner did: which lesson they worked through, the protocol
# they wrote, and the experiments designed to test it.

JSONDoc = JSON().with_variant(JSONB(), "postgresql")


class DevelopmentHypothesis(Base):
    """One provisional claim about this learner, with the evidence it rests on."""

    __tablename__ = "development_hypotheses"
    __table_args__ = (
        # One live claim per area. Two competing hypotheses about the same dimension
        # would make "what does the system think" ambiguous, which is the opposite of
        # the point.
        UniqueConstraint("user_id", "scope", "key", name="uq_development_hypotheses_area"),
        CheckConstraint("scope IN ('dimension', 'process')", name="ck_development_hypotheses_scope"),
        CheckConstraint(
            "confidence IN ('none', 'low', 'moderate', 'high')",
            name="ck_development_hypotheses_confidence",
        ),
        CheckConstraint(
            "status IN ('open', 'supported', 'contradicted')",
            name="ck_development_hypotheses_status",
        ),
        Index("ix_development_hypotheses_user", "user_id"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    #: dimension | process
    scope: Mapped[str] = mapped_column(String(20))
    key: Mapped[str] = mapped_column(String(40))
    #: The claim in the learner's own words. Never a score.
    claim: Mapped[str] = mapped_column(Text)
    #: Why this claim was worth writing down.
    rationale: Mapped[str] = mapped_column(Text, default="")
    #: Computed from `evidence` — see app.development.confidence_for. Stored so a
    #: later read cannot silently change what the learner was shown.
    confidence: Mapped[str] = mapped_column(String(12), default="none")
    #: What would support or contradict it, and what has been observed so far.
    support: Mapped[list] = mapped_column(JSONList, default=list)
    contradict: Mapped[list] = mapped_column(JSONList, default=list)
    evidence: Mapped[list] = mapped_column(JSONList, default=list)
    status: Mapped[str] = mapped_column(String(14), default="open")
    review_note: Mapped[str] = mapped_column(Text, default="")
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class SelfManagementBaseline(Base):
    """A behavioural baseline: self-report items plus one timed observation.

    There is deliberately no total, average or percentage column. Adding one would
    turn nine opinions and one afternoon into a measurement of a person.
    """

    __tablename__ = "self_management_baselines"
    __table_args__ = (Index("ix_self_management_baselines_user", "user_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    #: [{key, prompt, answer, options}] — the answer is a word from `options`.
    items: Mapped[list] = mapped_column(JSONList, default=list)
    #: {task, planned_minutes, actual_minutes, started_after_minutes, interruptions,
    #: resumed_after_minutes, finished}
    observation: Mapped[dict] = mapped_column(JSONDoc, default=dict)
    #: Derived prose. Counts and comparisons, never a score.
    summary: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class LessonProgress(Base):
    """How far one learner has worked through one lesson."""

    __tablename__ = "lesson_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "lesson_slug", name="uq_lesson_progress_lesson"),
        CheckConstraint(
            "state IN ('studied', 'practised', 'retrieval_passed')",
            name="ck_lesson_progress_state",
        ),
        Index("ix_lesson_progress_user", "user_id"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    lesson_slug: Mapped[str] = mapped_column(String(80))
    state: Mapped[str] = mapped_column(String(20), default="studied")
    #: The learner's answer to the lesson's retrieval check, kept verbatim.
    retrieval_answer: Mapped[str] = mapped_column(Text, default="")
    #: Which of the lesson's criteria they believed their answer met. Self-marked,
    #: because the criteria are prose and pretending a keyword match is grading
    #: would be the fake integration this product avoids.
    criteria_met: Mapped[list] = mapped_column(JSONList, default=list)
    note: Mapped[str] = mapped_column(Text, default="")
    studied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    practised_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    retrieval_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class LearningProtocol(Base):
    """A versioned personal operating procedure, written by the learner."""

    __tablename__ = "learning_protocols"
    __table_args__ = (
        UniqueConstraint("user_id", "version", name="uq_learning_protocols_version"),
        Index("ix_learning_protocols_user", "user_id", "is_current"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    #: {section_key: text}. Empty sections stay empty; nothing is prefilled.
    sections: Mapped[dict] = mapped_column(JSONDoc, default=dict)
    #: {material_type: example}. All four are required before the gate opens.
    material_examples: Mapped[dict] = mapped_column(JSONDoc, default=dict)
    #: Only one row per learner is current; setting a new one clears the old.
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class DevelopmentExperiment(Base):
    """A comparison of two techniques, with the honesty rules attached."""

    __tablename__ = "development_experiments"
    __table_args__ = (
        CheckConstraint(
            "outcome IN ('pending', 'weak_signal', 'no_change', 'supported', 'abandoned')",
            name="ck_development_experiments_outcome",
        ),
        CheckConstraint("sample_size >= 0", name="ck_development_experiments_sample"),
        Index("ix_development_experiments_user", "user_id", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    technique: Mapped[str] = mapped_column(String(120))
    hypothesis: Mapped[str] = mapped_column(Text)
    predicted: Mapped[str] = mapped_column(Text, default="")
    #: How the result will be judged, written before the result exists.
    measure: Mapped[str] = mapped_column(Text, default="")
    #: How many comparable cases were observed. A conclusion from one case is not a
    #: conclusion, and the API refuses to record it as one below MIN_SAMPLE.
    sample_size: Mapped[int] = mapped_column(Integer, default=0)
    observed: Mapped[str] = mapped_column(Text, default="")
    outcome: Mapped[str] = mapped_column(String(14), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    observed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
