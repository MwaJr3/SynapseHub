"""assessment reassessment chain

Reassessing a supplied assessment is not editing it. This revision adds the one
column that makes the difference durable: `assessments.supersedes_id` points at
the submission a new one replaces, so the profile screen can show "43 → 61" and
still prove which row the 43 came from.

The three constraints are the database's share of the rule, not decoration:

* `ck_assessments_not_self_superseding` — a row cannot claim to replace itself.
* `uq_assessments_supersedes` — a submission is superseded at most once, so the
  chain is a line. Without it two reassessments could both replace the same row
  and "which one is current?" would depend on read order.
* `ck_assessments_scale_order` — `scale_min < scale_max`. The app validates it,
  but a reversed scale is the kind of error that turns every percentage on the
  profile screen into nonsense while still looking plausible.

`ON DELETE SET NULL` on the self-reference: deleting a predecessor must not take
its successor with it. Deleting a *user* still cascades, which is what the
account-deletion path expects.

SQLite rebuilds `assessments` for this (batch mode), which is why the operations
are grouped: one rebuild, not four.

Revision ID: 6b7d41c9f2ae
Revises: 903c564d8cda
Create Date: 2026-10-27 13:10:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "6b7d41c9f2ae"
down_revision: Union[str, Sequence[str], None] = "903c564d8cda"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CHECKS: tuple[tuple[str, str], ...] = (
    (
        "ck_assessments_not_self_superseding",
        "supersedes_id IS NULL OR supersedes_id <> id",
    ),
    ("ck_assessments_reported_by", "reported_by IN ('learner', 'provider-report')"),
    ("ck_assessments_scale_order", "scale_min < scale_max"),
)


def upgrade() -> None:
    with op.batch_alter_table("assessments", schema=None) as batch_op:
        batch_op.add_column(sa.Column("supersedes_id", sa.String(length=32), nullable=True))
        batch_op.create_foreign_key(
            "fk_assessments_supersedes",
            "assessments",
            ["supersedes_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_unique_constraint("uq_assessments_supersedes", ["supersedes_id"])
        for name, condition in CHECKS:
            batch_op.create_check_constraint(name, condition)
        batch_op.create_index("ix_assessments_user_supersedes", ["user_id", "supersedes_id"])


def downgrade() -> None:
    with op.batch_alter_table("assessments", schema=None) as batch_op:
        batch_op.drop_index("ix_assessments_user_supersedes")
        for name, _condition in reversed(CHECKS):
            batch_op.drop_constraint(name, type_="check")
        batch_op.drop_constraint("uq_assessments_supersedes", type_="unique")
        batch_op.drop_constraint("fk_assessments_supersedes", type_="foreignkey")
        batch_op.drop_column("supersedes_id")
