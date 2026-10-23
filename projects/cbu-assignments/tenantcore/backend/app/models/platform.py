import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKey


class Plan(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "plans"

    code: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    limits: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    price_cents_monthly: Mapped[int] = mapped_column(default=0)
    is_active: Mapped[bool] = mapped_column(default=True)

    __table_args__ = (CheckConstraint("price_cents_monthly >= 0", name="price_nonnegative"),)


class Tenant(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String(160))
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    status: Mapped[str] = mapped_column(String(20), default="provisioning")
    plan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("plans.id", ondelete="RESTRICT"))
    configuration: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    provisioned_at: Mapped[datetime | None]
    suspended_at: Mapped[datetime | None]
    archived_at: Mapped[datetime | None]

    __table_args__ = (
        CheckConstraint(
            "status IN ('provisioning', 'active', 'suspended', 'archived')",
            name="valid_status",
        ),
        CheckConstraint(
            "slug = lower(slug) AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'", name="valid_slug"
        ),
        Index("ix_tenants_status_created_at", "status", "created_at"),
    )


class User(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True)
    full_name: Mapped[str] = mapped_column(String(160))
    password_hash: Mapped[str | None]
    is_active: Mapped[bool] = mapped_column(default=False)
    is_platform_admin: Mapped[bool] = mapped_column(default=False)
    last_login_at: Mapped[datetime | None]

    __table_args__ = (CheckConstraint("email = lower(email)", name="lowercase_email"),)


class TenantMembership(Base, TimestampMixin):
    __tablename__ = "tenant_memberships"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="RESTRICT"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(20), default="member")
    status: Mapped[str] = mapped_column(String(20), default="invited")
    invited_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    invitation_token_hash: Mapped[str | None] = mapped_column(String(64), unique=True)
    invitation_expires_at: Mapped[datetime | None]
    joined_at: Mapped[datetime | None]

    __table_args__ = (
        CheckConstraint(
            "role IN ('tenant_admin', 'manager', 'member', 'read_only')", name="valid_role"
        ),
        CheckConstraint("status IN ('invited', 'active', 'deactivated')", name="valid_status"),
        Index("ix_memberships_user_status", "user_id", "status"),
        Index("ix_memberships_tenant_role", "tenant_id", "role"),
    )


class AuthSession(Base, UUIDPrimaryKey):
    __tablename__ = "auth_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    refresh_token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(server_default="now()")
    expires_at: Mapped[datetime]
    revoked_at: Mapped[datetime | None]
    replaced_by: Mapped[uuid.UUID | None]
    ip_address: Mapped[str | None] = mapped_column(String(64))
    user_agent: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (Index("ix_auth_sessions_user_active", "user_id", "revoked_at"),)


class PlatformAuditEvent(Base, UUIDPrimaryKey):
    __tablename__ = "platform_audit_events"

    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    action: Mapped[str] = mapped_column(String(100))
    resource_type: Mapped[str] = mapped_column(String(80))
    resource_id: Mapped[str | None] = mapped_column(String(100))
    event_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, default=dict)
    request_id: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(server_default="now()")

    __table_args__ = (
        Index("ix_platform_audit_created_at", "created_at"),
        Index("ix_platform_audit_actor", "actor_user_id", "created_at"),
    )
