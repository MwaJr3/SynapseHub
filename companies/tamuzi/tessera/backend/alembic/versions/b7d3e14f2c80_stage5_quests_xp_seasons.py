"""quests, an append-only XP ledger, seasons

Stage 5. Four tables, and one rule that is enforced by the schema rather than by a
handler: `(user_id, idempotency_key)` is unique on `xp_entries`, so a retried claim
cannot award twice even if two requests race past the API check.

`xp_entries` is append-only. There is no UPDATE path in the application, and the
factors that produced each number are stored beside it so "why 37?" is answerable
from the row.

Revision ID: b7d3e14f2c80
Revises: 9c1f2d7a4b3e
Create Date: 2026-10-27 21:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b7d3e14f2c80'
down_revision: Union[str, Sequence[str], None] = '9c1f2d7a4b3e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


JSONList = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'seasons',
        sa.Column('id', sa.String(length=40), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('theme', sa.String(length=200), nullable=False),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ends_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('ends_at > starts_at', name='ck_seasons_bounds'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_seasons_window', 'seasons', ['starts_at', 'ends_at'])

    op.create_table(
        'quests',
        sa.Column('id', sa.String(length=40), nullable=False),
        sa.Column('slug', sa.String(length=60), nullable=False),
        sa.Column('title', sa.String(length=140), nullable=False),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('kind', sa.String(length=16), nullable=False),
        sa.Column('concept_ids', JSONList, nullable=False),
        sa.Column('difficulty', sa.Integer(), nullable=False),
        sa.Column('base_xp', sa.Integer(), nullable=False),
        sa.Column('min_evidence', sa.Integer(), nullable=False),
        sa.Column('season_id', sa.String(length=40), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('difficulty >= 1 AND difficulty <= 5', name='ck_quests_difficulty'),
        sa.CheckConstraint('base_xp > 0 AND base_xp <= 500', name='ck_quests_base_xp'),
        sa.CheckConstraint('min_evidence >= 1 AND min_evidence <= 20', name='ck_quests_min_evidence'),
        sa.CheckConstraint(
            "kind IN ('retrieval', 'practice', 'application', 'reflection')", name='ck_quests_kind'
        ),
        sa.ForeignKeyConstraint(['season_id'], ['seasons.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    # `slug` is declared `unique=True, index=True` on the model, which is one unique
    # index and not a unique constraint plus an index. Adding both here would show up
    # in `alembic check` as a constraint the models do not have.
    op.create_index('ix_quests_slug', 'quests', ['slug'], unique=True)
    op.create_index('ix_quests_season_id', 'quests', ['season_id'])

    op.create_table(
        'quest_progress',
        sa.Column('id', sa.String(length=32), nullable=False),
        sa.Column('user_id', sa.String(length=32), nullable=False),
        sa.Column('quest_id', sa.String(length=40), nullable=False),
        sa.Column('season_id', sa.String(length=40), nullable=False),
        sa.Column('state', sa.String(length=16), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('claimed_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "state IN ('accepted', 'completed', 'claimed', 'abandoned')",
            name='ck_quest_progress_state',
        ),
        sa.ForeignKeyConstraint(['quest_id'], ['quests.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['season_id'], ['seasons.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'quest_id', 'season_id', name='uq_quest_progress_run'),
    )
    op.create_index('ix_quest_progress_user', 'quest_progress', ['user_id'])
    op.create_index('ix_quest_progress_user_id', 'quest_progress', ['user_id'])
    op.create_index('ix_quest_progress_quest_id', 'quest_progress', ['quest_id'])
    op.create_index('ix_quest_progress_season_id', 'quest_progress', ['season_id'])

    op.create_table(
        'xp_entries',
        sa.Column('id', sa.String(length=32), nullable=False),
        sa.Column('user_id', sa.String(length=32), nullable=False),
        sa.Column('season_id', sa.String(length=40), nullable=False),
        sa.Column('quest_id', sa.String(length=40), nullable=True),
        sa.Column('idempotency_key', sa.String(length=120), nullable=False),
        sa.Column('kind', sa.String(length=20), nullable=False),
        sa.Column('base_xp', sa.Integer(), nullable=False),
        sa.Column('difficulty_factor', sa.Float(), nullable=False),
        sa.Column('challenge_factor', sa.Float(), nullable=False),
        sa.Column('strategic_factor', sa.Float(), nullable=False),
        sa.Column('evidence_factor', sa.Float(), nullable=False),
        sa.Column('xp', sa.Integer(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('concept_id', sa.String(length=80), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('xp >= 0', name='ck_xp_entries_non_negative'),
        sa.CheckConstraint('difficulty_factor > 0', name='ck_xp_entries_difficulty'),
        sa.CheckConstraint('challenge_factor > 0', name='ck_xp_entries_challenge'),
        sa.CheckConstraint('strategic_factor > 0', name='ck_xp_entries_strategic'),
        sa.CheckConstraint('evidence_factor > 0', name='ck_xp_entries_evidence'),
        sa.ForeignKeyConstraint(['quest_id'], ['quests.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['season_id'], ['seasons.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'idempotency_key', name='uq_xp_entries_idempotency'),
        sa.UniqueConstraint('user_id', 'quest_id', 'season_id', name='uq_xp_entries_quest_run'),
    )
    op.create_index('ix_xp_entries_user_created', 'xp_entries', ['user_id', 'created_at'])
    op.create_index('ix_xp_entries_user_season', 'xp_entries', ['user_id', 'season_id'])
    op.create_index('ix_xp_entries_user_id', 'xp_entries', ['user_id'])
    op.create_index('ix_xp_entries_season_id', 'xp_entries', ['season_id'])
    op.create_index('ix_xp_entries_quest_id', 'xp_entries', ['quest_id'])
    op.create_index('ix_xp_entries_created_at', 'xp_entries', ['created_at'])


def downgrade() -> None:
    """Downgrade schema."""
    for index in (
        'ix_xp_entries_created_at',
        'ix_xp_entries_quest_id',
        'ix_xp_entries_season_id',
        'ix_xp_entries_user_id',
        'ix_xp_entries_user_season',
        'ix_xp_entries_user_created',
    ):
        op.drop_index(index, table_name='xp_entries')
    op.drop_table('xp_entries')

    for index in (
        'ix_quest_progress_season_id',
        'ix_quest_progress_quest_id',
        'ix_quest_progress_user_id',
        'ix_quest_progress_user',
    ):
        op.drop_index(index, table_name='quest_progress')
    op.drop_table('quest_progress')

    op.drop_index('ix_quests_season_id', table_name='quests')
    op.drop_index('ix_quests_slug', table_name='quests')
    op.drop_table('quests')

    op.drop_index('ix_seasons_window', table_name='seasons')
    op.drop_table('seasons')
