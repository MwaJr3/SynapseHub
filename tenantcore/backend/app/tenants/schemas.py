import re
from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.api.schemas import AuditEventResponse, ORMModel

TenantStatus = Literal["provisioning", "active", "suspended", "archived"]
TenantRole = Literal["tenant_admin", "manager", "member", "read_only"]


class TenantCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    slug: str = Field(min_length=2, max_length=80)
    plan_id: UUID
    configuration: dict[str, Any] = Field(default_factory=dict)

    @field_validator("slug")
    @classmethod
    def valid_slug(cls, value: str) -> str:
        value = value.lower()
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", value):
            raise ValueError("Use lowercase letters, numbers, and single hyphens")
        return value


class TenantUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    plan_id: UUID | None = None
    configuration: dict[str, Any] | None = None


class TenantResponse(ORMModel):
    id: UUID
    name: str
    slug: str
    status: TenantStatus
    plan_id: UUID
    configuration: dict[str, Any]
    provisioned_at: datetime | None
    suspended_at: datetime | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime


class OrganizationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    configuration: dict[str, Any] | None = None


class MemberInvite(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    full_name: str = Field(min_length=2, max_length=160)
    role: TenantRole = "member"

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class MemberUpdate(BaseModel):
    role: TenantRole | None = None
    status: Literal["active", "deactivated"] | None = None


class MemberResponse(BaseModel):
    user_id: UUID
    tenant_id: UUID
    email: str
    full_name: str
    role: TenantRole
    status: str
    joined_at: datetime | None
    created_at: datetime


class MemberInviteResponse(BaseModel):
    member: MemberResponse
    invitation_token: str | None = None
    delivery: str


APIScope = Literal["read", "write"]


def default_api_scopes() -> list[APIScope]:
    return ["read"]


class APIKeyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    scopes: list[APIScope] = Field(default_factory=default_api_scopes)
    expires_in_days: int | None = Field(default=90, ge=1, le=365)


class APIKeyResponse(ORMModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    prefix: str
    scopes: list[str]
    created_at: datetime
    expires_at: datetime | None
    last_used_at: datetime | None
    revoked_at: datetime | None


class APIKeyCreatedResponse(BaseModel):
    api_key: APIKeyResponse
    secret: str
    warning: str


class UsageSummary(BaseModel):
    period_start: str
    period_end: str
    totals: dict[str, int]
    current: dict[str, int]
    daily: list[dict[str, Any]]


class PlatformDashboardResponse(BaseModel):
    tenants: dict[str, int]
    total_users: int
    tenant_growth: list[dict[str, Any]]
    recent_events: list[AuditEventResponse]
    usage: dict[str, int]
