"""study planner consent, authorization codes and read-only tokens

Stage 5, workstream A. Four tables, three of them about permission rather than data:

    oauth_clients        a registered application and its exact redirect allowlist
    consent_grants       the learner's decision, kept after revocation
    authorization_codes  single-use PKCE codes, stored hashed, 5-minute lifetime
    access_tokens        one-hour bearer tokens, stored hashed, scoped, revocable

There is no column anywhere in this migration that grants write access to learning
data: `learning-summary:read` is the only scope the API will mint.

Revision ID: 9c1f2d7a4b3e
Revises: 6b7d41c9f2ae
Create Date: 2026-10-27 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '9c1f2d7a4b3e'
down_revision: Union[str, Sequence[str], None] = '6b7d41c9f2ae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


#: JSON lists on SQLite, jsonb on PostgreSQL — the same variant the models declare.
JSONList = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'oauth_clients',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('redirect_uris', JSONList, nullable=False),
        sa.Column('allowed_scopes', JSONList, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'consent_grants',
        sa.Column('id', sa.String(length=32), nullable=False),
        sa.Column('user_id', sa.String(length=32), nullable=False),
        sa.Column('client_id', sa.String(length=64), nullable=False),
        sa.Column('scopes', JSONList, nullable=False),
        sa.Column('purpose', sa.Text(), nullable=False),
        sa.Column('granted_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("purpose <> ''", name='ck_consent_grants_purpose_present'),
        sa.ForeignKeyConstraint(['client_id'], ['oauth_clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'client_id', name='uq_consent_grants_user_client'),
    )
    op.create_index('ix_consent_grants_user_id', 'consent_grants', ['user_id'])
    op.create_index('ix_consent_grants_client_id', 'consent_grants', ['client_id'])

    op.create_table(
        'authorization_codes',
        sa.Column('id', sa.String(length=32), nullable=False),
        sa.Column('code_hash', sa.String(length=64), nullable=False),
        sa.Column('client_id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=32), nullable=False),
        sa.Column('scopes', JSONList, nullable=False),
        sa.Column('redirect_uri', sa.String(length=500), nullable=False),
        sa.Column('code_challenge', sa.String(length=128), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['oauth_clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code_hash'),
    )
    op.create_index('ix_authorization_codes_hash', 'authorization_codes', ['code_hash'], unique=True)
    op.create_index('ix_authorization_codes_client_id', 'authorization_codes', ['client_id'])
    op.create_index('ix_authorization_codes_user_id', 'authorization_codes', ['user_id'])

    op.create_table(
        'access_tokens',
        sa.Column('id', sa.String(length=32), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('client_id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=32), nullable=False),
        sa.Column('scopes', JSONList, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("scopes <> '[]'", name='ck_access_tokens_scopes_present'),
        sa.ForeignKeyConstraint(['client_id'], ['oauth_clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token_hash'),
    )
    op.create_index('ix_access_tokens_hash', 'access_tokens', ['token_hash'], unique=True)
    op.create_index('ix_access_tokens_client_id', 'access_tokens', ['client_id'])
    op.create_index('ix_access_tokens_user_id', 'access_tokens', ['user_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_access_tokens_user_id', table_name='access_tokens')
    op.drop_index('ix_access_tokens_client_id', table_name='access_tokens')
    op.drop_index('ix_access_tokens_hash', table_name='access_tokens')
    op.drop_table('access_tokens')

    op.drop_index('ix_authorization_codes_user_id', table_name='authorization_codes')
    op.drop_index('ix_authorization_codes_client_id', table_name='authorization_codes')
    op.drop_index('ix_authorization_codes_hash', table_name='authorization_codes')
    op.drop_table('authorization_codes')

    op.drop_index('ix_consent_grants_client_id', table_name='consent_grants')
    op.drop_index('ix_consent_grants_user_id', table_name='consent_grants')
    op.drop_table('consent_grants')

    op.drop_table('oauth_clients')
