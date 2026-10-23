from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.api.schemas import ORMModel


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).lower()


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=20, max_length=500)


class AcceptInvitationRequest(BaseModel):
    token: str = Field(min_length=20, max_length=500)
    password: str = Field(min_length=12, max_length=128)


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)


class UserResponse(ORMModel):
    id: UUID
    email: EmailStr
    full_name: str
    is_platform_admin: bool
    last_login_at: datetime | None


class MembershipTenantResponse(BaseModel):
    tenant_id: UUID
    tenant_name: str
    tenant_slug: str
    tenant_status: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
    memberships: list[MembershipTenantResponse]


class MeResponse(BaseModel):
    user: UserResponse
    memberships: list[MembershipTenantResponse]
    session_id: UUID
