import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKey


class Team(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "teams"

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="RESTRICT"))
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    created_by: Mapped[uuid.UUID]

    __table_args__ = (
        UniqueConstraint("tenant_id", "id", name="uq_teams_tenant_id_id"),
        UniqueConstraint("tenant_id", "name", name="uq_teams_tenant_name"),
        ForeignKeyConstraint(
            ["tenant_id", "created_by"],
            ["tenant_memberships.tenant_id", "tenant_memberships.user_id"],
            ondelete="RESTRICT",
        ),
        Index("ix_teams_tenant_created", "tenant_id", "created_at"),
    )


class Project(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "projects"

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="RESTRICT"))
    team_id: Mapped[uuid.UUID | None]
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_by: Mapped[uuid.UUID]

    __table_args__ = (
        UniqueConstraint("tenant_id", "id", name="uq_projects_tenant_id_id"),
        ForeignKeyConstraint(
            ["tenant_id", "team_id"], ["teams.tenant_id", "teams.id"], ondelete="RESTRICT"
        ),
        ForeignKeyConstraint(
            ["tenant_id", "created_by"],
            ["tenant_memberships.tenant_id", "tenant_memberships.user_id"],
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "status IN ('active', 'on_hold', 'completed', 'archived')", name="valid_status"
        ),
        Index("ix_projects_tenant_created", "tenant_id", "created_at"),
        Index("ix_projects_tenant_status", "tenant_id", "status"),
        Index(
            "ix_projects_tenant_active_created",
            "tenant_id",
            "created_at",
            postgresql_where=text("status <> 'archived'"),
        ),
    )


class Task(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "tasks"

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="RESTRICT"))
    project_id: Mapped[uuid.UUID]
    assignee_id: Mapped[uuid.UUID | None]
    created_by: Mapped[uuid.UUID]
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="todo")
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    due_date: Mapped[date | None]
    version: Mapped[int] = mapped_column(Integer, default=1)

    __table_args__ = (
        UniqueConstraint("tenant_id", "id", name="uq_tasks_tenant_id_id"),
        ForeignKeyConstraint(
            ["tenant_id", "project_id"], ["projects.tenant_id", "projects.id"], ondelete="CASCADE"
        ),
        ForeignKeyConstraint(
            ["tenant_id", "assignee_id"],
            ["tenant_memberships.tenant_id", "tenant_memberships.user_id"],
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "created_by"],
            ["tenant_memberships.tenant_id", "tenant_memberships.user_id"],
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "status IN ('todo', 'in_progress', 'blocked', 'done')", name="valid_status"
        ),
        CheckConstraint("priority IN ('low', 'medium', 'high', 'urgent')", name="valid_priority"),
        CheckConstraint("version > 0", name="positive_version"),
        Index("ix_tasks_tenant_project", "tenant_id", "project_id", "status"),
        Index("ix_tasks_tenant_assignee", "tenant_id", "assignee_id", "status"),
        Index("ix_tasks_tenant_created", "tenant_id", "created_at"),
        Index(
            "ix_tasks_tenant_open_due",
            "tenant_id",
            "due_date",
            postgresql_where=text("status <> 'done' AND due_date IS NOT NULL"),
        ),
    )


class Document(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "documents"

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="RESTRICT"))
    project_id: Mapped[uuid.UUID]
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text, default="")
    storage_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    created_by: Mapped[uuid.UUID]

    __table_args__ = (
        ForeignKeyConstraint(
            ["tenant_id", "project_id"], ["projects.tenant_id", "projects.id"], ondelete="CASCADE"
        ),
        ForeignKeyConstraint(
            ["tenant_id", "created_by"],
            ["tenant_memberships.tenant_id", "tenant_memberships.user_id"],
            ondelete="RESTRICT",
        ),
        CheckConstraint("storage_bytes >= 0", name="nonnegative_storage"),
        Index("ix_documents_tenant_project", "tenant_id", "project_id", "created_at"),
    )


class Comment(Base, UUIDPrimaryKey):
    __tablename__ = "comments"

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="RESTRICT"))
    task_id: Mapped[uuid.UUID]
    author_id: Mapped[uuid.UUID]
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default="now()")

    __table_args__ = (
        ForeignKeyConstraint(
            ["tenant_id", "task_id"], ["tasks.tenant_id", "tasks.id"], ondelete="CASCADE"
        ),
        ForeignKeyConstraint(
            ["tenant_id", "author_id"],
            ["tenant_memberships.tenant_id", "tenant_memberships.user_id"],
            ondelete="RESTRICT",
        ),
        CheckConstraint("length(trim(body)) > 0", name="nonempty_body"),
        Index("ix_comments_tenant_task_created", "tenant_id", "task_id", "created_at"),
    )


class Notification(Base, UUIDPrimaryKey):
    __tablename__ = "notifications"

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="RESTRICT"))
    user_id: Mapped[uuid.UUID]
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    read_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(server_default="now()")

    __table_args__ = (
        ForeignKeyConstraint(
            ["tenant_id", "user_id"],
            ["tenant_memberships.tenant_id", "tenant_memberships.user_id"],
            ondelete="RESTRICT",
        ),
        Index(
            "ix_notifications_tenant_user_unread",
            "tenant_id",
            "user_id",
            "created_at",
            postgresql_where=text("read_at IS NULL"),
        ),
    )


class TenantAuditEvent(Base, UUIDPrimaryKey):
    __tablename__ = "tenant_audit_events"

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="RESTRICT"))
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
        Index("ix_tenant_audit_tenant_created", "tenant_id", "created_at"),
        Index("ix_tenant_audit_tenant_action", "tenant_id", "action", "created_at"),
    )


class APIKey(Base, UUIDPrimaryKey):
    __tablename__ = "api_keys"

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="RESTRICT"))
    name: Mapped[str] = mapped_column(String(120))
    prefix: Mapped[str] = mapped_column(String(24), unique=True)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True)
    scopes: Mapped[list[str]] = mapped_column(JSONB, default=list)
    created_by: Mapped[uuid.UUID]
    created_at: Mapped[datetime] = mapped_column(server_default="now()")
    expires_at: Mapped[datetime | None]
    last_used_at: Mapped[datetime | None]
    revoked_at: Mapped[datetime | None]

    __table_args__ = (
        ForeignKeyConstraint(
            ["tenant_id", "created_by"],
            ["tenant_memberships.tenant_id", "tenant_memberships.user_id"],
            ondelete="RESTRICT",
        ),
        Index("ix_api_keys_tenant_active", "tenant_id", "revoked_at"),
    )


class Subscription(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "subscriptions"

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="RESTRICT"))
    plan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("plans.id", ondelete="RESTRICT"))
    status: Mapped[str] = mapped_column(String(20), default="trialing")
    current_period_start: Mapped[datetime]
    current_period_end: Mapped[datetime]
    external_reference: Mapped[str | None] = mapped_column(String(200))

    __table_args__ = (
        UniqueConstraint("tenant_id", name="uq_subscriptions_tenant"),
        CheckConstraint(
            "status IN ('trialing', 'active', 'past_due', 'canceled')", name="valid_status"
        ),
        CheckConstraint("current_period_end > current_period_start", name="valid_period"),
    )


class UsageMetric(Base, UUIDPrimaryKey):
    __tablename__ = "usage_metrics"

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="RESTRICT"))
    period_date: Mapped[date]
    metric: Mapped[str] = mapped_column(String(60))
    value: Mapped[int] = mapped_column(BigInteger, default=0)
    updated_at: Mapped[datetime] = mapped_column(server_default="now()", onupdate="now()")

    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "period_date", "metric", name="uq_usage_tenant_period_metric"
        ),
        CheckConstraint("value >= 0", name="nonnegative_value"),
        Index("ix_usage_tenant_metric_period", "tenant_id", "metric", "period_date"),
    )
