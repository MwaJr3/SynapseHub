import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select

from app.api.schemas import MessageResponse
from app.audit.service import platform_event, tenant_event
from app.auth.dependencies import Principal, get_current_principal
from app.auth.schemas import (
    AcceptInvitationRequest,
    LoginRequest,
    MembershipTenantResponse,
    MeResponse,
    PasswordChange,
    ProfileUpdate,
    RefreshRequest,
    TokenResponse,
    UserResponse,
)
from app.auth.security import (
    create_access_token,
    hash_password,
    hash_token,
    opaque_token,
    verify_password,
)
from app.config import get_settings
from app.database.session import session_scope, set_context
from app.errors import AppError
from app.models import AuthSession, Tenant, TenantMembership, User
from app.services.rate_limit import enforce_login_rate_limit

router = APIRouter(prefix="/auth", tags=["authentication"])


def membership_rows(db, user_id: uuid.UUID) -> list[MembershipTenantResponse]:
    rows = db.execute(
        select(TenantMembership, Tenant)
        .join(Tenant, Tenant.id == TenantMembership.tenant_id)
        .where(TenantMembership.user_id == user_id)
        .order_by(Tenant.name)
    ).all()
    return [
        MembershipTenantResponse(
            tenant_id=tenant.id,
            tenant_name=tenant.name,
            tenant_slug=tenant.slug,
            tenant_status=tenant.status,
            role=membership.role,
        )
        for membership, tenant in rows
    ]


def issue_token_pair(db, user: User) -> tuple[str, str, int]:
    settings = get_settings()
    refresh_token = opaque_token()
    auth_session = AuthSession(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token),
        expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_days),
    )
    db.add(auth_session)
    db.flush()
    access_token, expires_in = create_access_token(user.id, auth_session.id)
    return access_token, refresh_token, expires_in


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request):
    enforce_login_rate_limit(request, str(payload.email))
    with session_scope(request_id=getattr(request.state, "request_id", None)) as db:
        user = db.scalar(select(User).where(User.email == str(payload.email).lower()))
        if (
            user is None
            or not verify_password(payload.password, user.password_hash)
            or not user.is_active
        ):
            raise AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect")

        set_context(
            db,
            user_id=user.id,
            platform_admin=user.is_platform_admin,
            request_id=getattr(request.state, "request_id", None),
        )
        user.last_login_at = datetime.now(UTC)
        access_token, refresh_token, expires_in = issue_token_pair(db, user)
        platform_event(
            db,
            actor_user_id=user.id,
            action="auth.login",
            resource_type="auth_session",
            metadata={"email": user.email},
            request_id=getattr(request.state, "request_id", None),
        )
        memberships = membership_rows(db, user.id)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
            user=UserResponse.model_validate(user),
            memberships=memberships,
        )


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, request: Request):
    with session_scope(request_id=getattr(request.state, "request_id", None)) as db:
        old_session = db.scalar(
            select(AuthSession).where(
                AuthSession.refresh_token_hash == hash_token(payload.refresh_token)
            )
        )
        now = datetime.now(UTC)
        if old_session is None or old_session.revoked_at or old_session.expires_at <= now:
            raise AppError(401, "INVALID_REFRESH_TOKEN", "The refresh token is invalid or expired")
        user = db.get(User, old_session.user_id)
        if user is None or not user.is_active:
            raise AppError(401, "SESSION_INVALID", "The user is no longer active")

        set_context(
            db,
            user_id=user.id,
            platform_admin=user.is_platform_admin,
            request_id=getattr(request.state, "request_id", None),
        )
        old_session.revoked_at = now
        access_token, refresh_token, expires_in = issue_token_pair(db, user)
        new_session = db.scalar(
            select(AuthSession).where(AuthSession.refresh_token_hash == hash_token(refresh_token))
        )
        old_session.replaced_by = new_session.id if new_session else None
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
            user=UserResponse.model_validate(user),
            memberships=membership_rows(db, user.id),
        )


@router.post("/logout", response_model=MessageResponse)
def logout(request: Request, principal: Principal = Depends(get_current_principal)):
    with session_scope(
        user_id=principal.id,
        platform_admin=principal.is_platform_admin,
        request_id=getattr(request.state, "request_id", None),
    ) as db:
        auth_session = db.get(AuthSession, principal.session_id)
        if auth_session and auth_session.revoked_at is None:
            auth_session.revoked_at = datetime.now(UTC)
        platform_event(
            db,
            actor_user_id=principal.id,
            action="auth.logout",
            resource_type="auth_session",
            resource_id=principal.session_id,
            request_id=getattr(request.state, "request_id", None),
        )
    return MessageResponse(message="Signed out")


@router.get("/me", response_model=MeResponse)
def me(principal: Principal = Depends(get_current_principal)):
    with session_scope(user_id=principal.id, platform_admin=principal.is_platform_admin) as db:
        user = db.get(User, principal.id)
        if user is None:
            raise AppError(401, "SESSION_INVALID", "The user no longer exists")
        return MeResponse(
            user=UserResponse.model_validate(user),
            memberships=membership_rows(db, user.id),
            session_id=principal.session_id,
        )


@router.patch("/profile", response_model=UserResponse)
def update_profile(payload: ProfileUpdate, principal: Principal = Depends(get_current_principal)):
    with session_scope(user_id=principal.id, platform_admin=principal.is_platform_admin) as db:
        user = db.get(User, principal.id)
        if user is None:
            raise AppError(404, "NOT_FOUND", "User was not found")
        user.full_name = payload.full_name
        platform_event(
            db,
            actor_user_id=principal.id,
            action="user.profile_updated",
            resource_type="user",
            resource_id=user.id,
        )
        db.flush()
        return UserResponse.model_validate(user)


@router.post("/password", response_model=MessageResponse)
def change_password(payload: PasswordChange, principal: Principal = Depends(get_current_principal)):
    with session_scope(user_id=principal.id, platform_admin=principal.is_platform_admin) as db:
        user = db.get(User, principal.id)
        if user is None or not verify_password(payload.current_password, user.password_hash):
            raise AppError(400, "INVALID_PASSWORD", "The current password is incorrect")
        user.password_hash = hash_password(payload.new_password)
        now = datetime.now(UTC)
        for auth_session in db.scalars(select(AuthSession).where(AuthSession.user_id == user.id)):
            if auth_session.id != principal.session_id:
                auth_session.revoked_at = now
        platform_event(
            db,
            actor_user_id=principal.id,
            action="user.password_changed",
            resource_type="user",
            resource_id=user.id,
        )
    return MessageResponse(message="Password changed; other sessions were revoked")


@router.post("/accept-invitation", response_model=MessageResponse)
def accept_invitation(payload: AcceptInvitationRequest, request: Request):
    # This narrow internal control-plane operation looks up an opaque invitation hash.
    # It never accepts a tenant ID and does not expose membership data to the caller.
    with session_scope(platform_admin=True) as db:
        membership = db.scalar(
            select(TenantMembership).where(
                TenantMembership.invitation_token_hash == hash_token(payload.token)
            )
        )
        now = datetime.now(UTC)
        if (
            membership is None
            or membership.status != "invited"
            or membership.invitation_expires_at is None
            or membership.invitation_expires_at <= now
        ):
            raise AppError(400, "INVALID_INVITATION", "The invitation is invalid or expired")
        user = db.get(User, membership.user_id)
        tenant = db.get(Tenant, membership.tenant_id)
        if user is None or tenant is None or user.is_active or tenant.status != "active":
            raise AppError(400, "INVALID_INVITATION", "The invitation cannot be accepted")
        user.password_hash = hash_password(payload.password)
        user.is_active = True
        membership.status = "active"
        membership.joined_at = now
        membership.invitation_token_hash = None
        membership.invitation_expires_at = None
        set_context(db, tenant_id=tenant.id, user_id=user.id, platform_admin=True)
        tenant_event(
            db,
            tenant_id=tenant.id,
            actor_user_id=user.id,
            action="membership.invitation_accepted",
            resource_type="membership",
            resource_id=user.id,
        )
    return MessageResponse(message="Invitation accepted. You can now sign in.")
