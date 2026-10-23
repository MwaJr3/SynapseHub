import hmac
import uuid
from collections.abc import Generator
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal, cast

import jwt
from fastapi import Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import decode_access_token, hash_token
from app.config import get_settings
from app.database.session import session_scope, set_context
from app.errors import AppError, PermissionDeniedError
from app.models import APIKey, AuthSession, Tenant, TenantMembership, User
from app.services.usage import increment_usage

bearer_scheme = HTTPBearer(auto_error=False)
TenantRole = Literal["tenant_admin", "manager", "member", "read_only"]


@dataclass(frozen=True)
class Principal:
    id: uuid.UUID
    email: str
    full_name: str
    is_platform_admin: bool
    session_id: uuid.UUID
    credential_type: str = "jwt"
    scopes: frozenset[str] = frozenset()


@dataclass
class TenantContext:
    db: Session
    tenant: Tenant
    principal: Principal
    role: TenantRole
    membership: TenantMembership | None
    request_id: str | None

    @property
    def tenant_id(self) -> uuid.UUID:
        return self.tenant.id

    @property
    def user_id(self) -> uuid.UUID:
        return self.principal.id


def get_current_principal(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> Principal:
    if api_key:
        if credentials is not None:
            raise AppError(400, "MULTIPLE_CREDENTIALS", "Use only one authentication credential")
        if request.url.path.startswith(f"{get_settings().api_prefix}/auth/"):
            raise AppError(
                403, "INTERACTIVE_AUTH_REQUIRED", "API keys cannot manage account sessions"
            )
        if "." not in api_key:
            raise AppError(401, "INVALID_API_KEY", "The API key is invalid")
        prefix = api_key.split(".", 1)[0]
        # Narrow internal credential lookup by public prefix. The secret is compared
        # in constant time; the caller never chooses this control-plane DB context.
        with session_scope(platform_admin=True) as db:
            key = db.scalar(select(APIKey).where(APIKey.prefix == prefix))
            now = datetime.now(UTC)
            if (
                key is None
                or not hmac.compare_digest(key.key_hash, hash_token(api_key))
                or key.revoked_at is not None
                or (key.expires_at is not None and key.expires_at <= now)
            ):
                raise AppError(401, "INVALID_API_KEY", "The API key is invalid or expired")
            user = db.get(User, key.created_by)
            tenant = db.get(Tenant, key.tenant_id)
            membership = db.get(TenantMembership, (key.tenant_id, key.created_by))
            if (
                user is None
                or not user.is_active
                or tenant is None
                or tenant.status != "active"
                or membership is None
                or membership.status != "active"
            ):
                raise AppError(401, "INVALID_API_KEY", "The API key is no longer authorized")
            key.last_used_at = now
            return Principal(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_platform_admin=False,
                session_id=key.id,
                credential_type="api_key",
                scopes=frozenset(key.scopes),
            )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(401, "AUTH_REQUIRED", "Authentication is required")
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = uuid.UUID(payload["sub"])
        session_id = uuid.UUID(payload["sid"])
    except (jwt.PyJWTError, ValueError, KeyError) as exc:
        raise AppError(401, "INVALID_TOKEN", "The access token is invalid or expired") from exc

    with session_scope() as db:
        auth_session = db.get(AuthSession, session_id)
        user = db.get(User, user_id)
        now = datetime.now(UTC)
        if (
            auth_session is None
            or user is None
            or auth_session.user_id != user.id
            or auth_session.revoked_at is not None
            or auth_session.expires_at <= now
            or not user.is_active
        ):
            raise AppError(401, "SESSION_INVALID", "The authentication session is no longer active")
        return Principal(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_platform_admin=user.is_platform_admin,
            session_id=auth_session.id,
        )


def require_platform_admin(principal: Principal = Depends(get_current_principal)) -> Principal:
    if not principal.is_platform_admin:
        raise PermissionDeniedError("Platform administrator access is required")
    return principal


def get_tenant_context(
    request: Request,
    tenant_header: str | None = Header(default=None, alias="X-Tenant-ID"),
    principal: Principal = Depends(get_current_principal),
) -> Generator[TenantContext, None, None]:
    """Verify membership and establish RLS context in one transaction."""
    with session_scope(
        user_id=principal.id,
        platform_admin=principal.is_platform_admin,
        request_id=getattr(request.state, "request_id", None),
    ) as db:
        if (
            principal.credential_type == "api_key"
            and request.method not in {"GET", "HEAD", "OPTIONS"}
            and "write" not in principal.scopes
        ):
            raise AppError(403, "INSUFFICIENT_API_KEY_SCOPE", "This API key is read-only")
        selected_id: uuid.UUID | None = None
        if tenant_header:
            try:
                selected_id = uuid.UUID(tenant_header)
            except ValueError as exc:
                raise AppError(400, "INVALID_TENANT", "X-Tenant-ID must be a UUID") from exc
        else:
            memberships = db.scalars(
                select(TenantMembership).where(
                    TenantMembership.user_id == principal.id,
                    TenantMembership.status == "active",
                )
            ).all()
            if len(memberships) == 1:
                selected_id = memberships[0].tenant_id
            elif len(memberships) > 1:
                raise AppError(400, "TENANT_REQUIRED", "Select an organization with X-Tenant-ID")
            elif not principal.is_platform_admin:
                raise PermissionDeniedError("No active organization membership is available")

        if selected_id is None:
            raise AppError(400, "TENANT_REQUIRED", "X-Tenant-ID is required for this account")

        membership = db.get(TenantMembership, (selected_id, principal.id))
        if not principal.is_platform_admin and (
            membership is None or membership.status != "active"
        ):
            # Deliberately generic: do not reveal whether the organization exists.
            raise AppError(403, "TENANT_ACCESS_DENIED", "Organization access was denied")

        tenant = db.get(Tenant, selected_id)
        if tenant is None:
            if principal.is_platform_admin:
                raise AppError(404, "NOT_FOUND", "Organization was not found")
            raise AppError(403, "TENANT_ACCESS_DENIED", "Organization access was denied")
        if tenant.status != "active":
            raise AppError(
                403,
                "TENANT_NOT_ACTIVE",
                f"Organization access is unavailable while it is {tenant.status}",
            )

        set_context(
            db,
            tenant_id=tenant.id,
            user_id=principal.id,
            platform_admin=principal.is_platform_admin,
            request_id=getattr(request.state, "request_id", None),
        )
        if principal.is_platform_admin:
            role: TenantRole = "tenant_admin"
        else:
            if membership is None:  # Defensive; the active-membership check above rejects this.
                raise PermissionDeniedError()
            role = cast(TenantRole, membership.role)
        request.state.tenant_id = str(tenant.id)
        request.state.user_id = str(principal.id)
        request.state.platform_admin = principal.is_platform_admin
        yield TenantContext(
            db=db,
            tenant=tenant,
            principal=principal,
            role=role,
            membership=membership,
            request_id=getattr(request.state, "request_id", None),
        )
        # Successful tenant operations and their usage increment share one commit.
        # This avoids a second connection/transaction during dependency teardown.
        increment_usage(db, tenant.id, "api_requests")


def require_roles(*roles: TenantRole):
    def dependency(context: TenantContext = Depends(get_tenant_context)) -> TenantContext:
        if not context.principal.is_platform_admin and context.role not in roles:
            raise PermissionDeniedError()
        return context

    return dependency
