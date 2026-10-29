"""learner concepts, relations, notes and sessions

Stage 2 of LIFESYSTEM: the first tables that hold what a learner *made*, not what
they answered.

Two things here are written by hand rather than taken from autogenerate:

1. **`concept_edges` is rebuilt.** The baseline table carried a UNIQUE constraint
   on `(from, to, relation)` with no owner. Keeping it would mean two learners
   could never record the same relation between the same two concepts — the second
   one would hit an integrity error instead of being accepted. The table is small
   (catalogue seed data), the rows are copied across, and the replacement
   constraint is named so a future migration can drop it deliberately.

2. **Constraints are named.** Autogenerate produced `drop_constraint(None)`, which
   renders SQL that cannot run. Naming them makes `downgrade` executable rather
   than decorative.

Revision ID: a14e2f472411
Revises: ba2a346c0567
Create Date: 2026-10-26 12:26:32.674982
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a14e2f472411"
down_revision: Union[str, Sequence[str], None] = "ba2a346c0567"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "learning_sessions",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("concept_id", sa.String(length=80), nullable=False),
        sa.Column("objective", sa.Text(), nullable=False),
        sa.Column("stopping_condition", sa.Text(), nullable=False),
        sa.Column("planned_minutes", sa.Integer(), nullable=False),
        sa.Column("activities", sa.JSON(), nullable=False),
        sa.Column("reflection", sa.Text(), nullable=False),
        sa.Column("evidence", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("minutes_spent", sa.Integer(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["concept_id"], ["concepts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_learning_sessions_concept_id", "learning_sessions", ["concept_id"])
    op.create_index("ix_learning_sessions_started_at", "learning_sessions", ["started_at"])
    op.create_index("ix_learning_sessions_status", "learning_sessions", ["status"])
    op.create_index("ix_learning_sessions_user_id", "learning_sessions", ["user_id"])

    op.create_table(
        "reference_notes",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("concept_id", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("source_ref", sa.String(length=300), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["concept_id"], ["concepts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reference_notes_concept_id", "reference_notes", ["concept_id"])
    op.create_index("ix_reference_notes_created_at", "reference_notes", ["created_at"])
    op.create_index("ix_reference_notes_user_id", "reference_notes", ["user_id"])

    # Concepts gain an owner. NULL keeps every existing row as catalogue material,
    # which is exactly what they are.
    with op.batch_alter_table("concepts", schema=None) as batch_op:
        batch_op.add_column(sa.Column("owner_id", sa.String(length=32), nullable=True))
        batch_op.create_index(batch_op.f("ix_concepts_owner_id"), ["owner_id"], unique=False)
        batch_op.create_foreign_key(
            "fk_concepts_owner_id_users",
            "users",
            ["owner_id"],
            ["id"],
            ondelete="CASCADE",
        )

    # Rebuild concept_edges: the old three-column UNIQUE constraint would stop a
    # second learner recording the same relation, which is not a meaningful rule.
    op.create_table(
        "concept_edges_v2",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("owner_id", sa.String(length=32), nullable=True),
        sa.Column("from_concept_id", sa.String(length=80), nullable=False),
        sa.Column("to_concept_id", sa.String(length=80), nullable=False),
        sa.Column("relation", sa.String(length=24), nullable=False),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["users.id"], name="fk_concept_edges_owner_id_users", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["from_concept_id"], ["concepts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["to_concept_id"], ["concepts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "from_concept_id",
            "to_concept_id",
            "relation",
            "owner_id",
            name="uq_concept_edges_owner_relation",
        ),
    )
    op.execute(
        "INSERT INTO concept_edges_v2 (id, owner_id, from_concept_id, to_concept_id, relation) "
        "SELECT id, NULL, from_concept_id, to_concept_id, relation FROM concept_edges"
    )
    op.drop_table("concept_edges")
    op.rename_table("concept_edges_v2", "concept_edges")
    op.create_index("ix_concept_edges_from_concept_id", "concept_edges", ["from_concept_id"])
    op.create_index("ix_concept_edges_to_concept_id", "concept_edges", ["to_concept_id"])
    op.create_index("ix_concept_edges_owner_id", "concept_edges", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_concept_edges_owner_id", table_name="concept_edges")
    op.drop_index("ix_concept_edges_to_concept_id", table_name="concept_edges")
    op.drop_index("ix_concept_edges_from_concept_id", table_name="concept_edges")

    # Back to the ownerless shape. Learner-authored edges cannot survive a schema
    # that has no way to say whose they are, so they are removed — and the
    # catalogue edges are kept.
    op.create_table(
        "concept_edges_v1",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("from_concept_id", sa.String(length=80), nullable=False),
        sa.Column("to_concept_id", sa.String(length=80), nullable=False),
        sa.Column("relation", sa.String(length=20), nullable=False),
        sa.ForeignKeyConstraint(["from_concept_id"], ["concepts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["to_concept_id"], ["concepts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("from_concept_id", "to_concept_id", "relation"),
    )
    op.execute(
        "INSERT INTO concept_edges_v1 (id, from_concept_id, to_concept_id, relation) "
        "SELECT id, from_concept_id, to_concept_id, relation FROM concept_edges WHERE owner_id IS NULL"
    )
    op.drop_table("concept_edges")
    op.rename_table("concept_edges_v1", "concept_edges")
    op.create_index("ix_concept_edges_from_concept_id", "concept_edges", ["from_concept_id"])
    op.create_index("ix_concept_edges_to_concept_id", "concept_edges", ["to_concept_id"])

    with op.batch_alter_table("concepts", schema=None) as batch_op:
        batch_op.drop_constraint("fk_concepts_owner_id_users", type_="foreignkey")
        batch_op.drop_index(batch_op.f("ix_concepts_owner_id"))
        batch_op.drop_column("owner_id")

    op.drop_table("reference_notes")
    op.drop_table("learning_sessions")
