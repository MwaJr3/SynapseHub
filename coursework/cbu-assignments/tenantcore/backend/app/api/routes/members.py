from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import func, or_, select

from app.api.schemas import PageMetadata
from app.audit.service import tenant_event
from app.auth.dependencies import TenantContext, get_tenant_context, require_roles
from app.auth.security import hash_token, opaque_token
from app.config import get_settings
from app.errors import AppError, NotFoundError
from app.models import TenantMembership, User
from app.tenants.schemas import (
    MemberInvite,
    MemberInviteResponse,
    MemberResponse,
    MemberUpdate,
)

router = APIRouter(prefix="/members", tags=["members"])


def member_response(membership: TenantMembership, user: User) -> MemberResponse:
    return MemberResponse(
        user_id=user.id,
        tenant_id=membership.tenant_id,
        email=user.email,
        full_name=user.full_name,
        role=membership.role,
        status=membership.status,
        joined_at=membership.joined_at,
        created_at=membership.created_at,
    )


@router.get("")
def list_members(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=160),
    context: TenantContext = Depends(get_tenant_context),
):
    filters = [TenantMembership.tenant_id == context.tenant_id]
    if search:
        term = f"%{search.strip()}%"
        filters.append(or_(User.email.ilike(term), User.full_name.ilike(term)))
    base = select(TenantMembership, User).join(User, User.id == TenantMembership.user_id)
    total = (
        context.db.scalar(
            select(func.count(TenantMembership.user_id))
            .select_from(TenantMembership)
            .join(User, User.id == TenantMembership.user_id)
            .where(*filters)
        )
        or 0
    )
    rows = context.db.execute(
        base.where(*filters)
        .order_by(User.full_name)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {
        "items": [member_response(membership, user) for membership, user in rows],
        "meta": PageMetadata(
            page=page, page_size=page_size, total=total, pages=(total + page_size - 1) // page_size
        ),
    }


@router.post("", response_model=MemberInviteResponse, status_code=status.HTTP_201_CREATED)
def invite_member(
    payload: MemberInvite,
    request: Request,
    context: TenantContext = Depends(require_roles("tenant_admin")),
):
    db = context.db
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        user = User(email=payload.email, full_name=payload.full_name, is_active=False)
        db.add(user)
        db.flush()
    membership = db.get(TenantMembership, (context.tenant_id, user.id))
    if membership is not None and membership.status in {"active", "invited"}:
        raise AppError(
            409, "MEMBERSHIP_EXISTS", "This user already has an active or pending membership"
        )
    raw_token = None if user.is_active else opaque_token()
    now = datetime.now(UTC)
    if membership is None:
        membership = TenantMembership(tenant_id=context.tenant_id, user_id=user.id)
        db.add(membership)
    membership.role = payload.role
    membership.invited_by = context.user_id
    membership.status = "active" if user.is_active else "invited"
    membership.joined_at = now if user.is_active else None
    membership.invitation_token_hash = hash_token(raw_token) if raw_token else None
    membership.invitation_expires_at = (
        now + timedelta(hours=get_settings().invitation_hours) if raw_token else None
    )
    tenant_event(
        db,
        tenant_id=context.tenant_id,
        actor_user_id=context.user_id,
        action="membership.invited" if raw_token else "membership.added",
        resource_type="membership",
        resource_id=user.id,
        metadata={"role": payload.role},
        request_id=context.request_id,
    )
    db.flush()
    return MemberInviteResponse(
        member=member_response(membership, user),
        invitation_token=raw_token,
        delivery=(
            "One-time invitation returned to the administrator; deliver it over a trusted channel"
            if raw_token
            else "Existing active user added to the organization"
        ),
    )


@router.patch("/{user_id}", response_model=MemberResponse)
def update_member(
    user_id: str,
    payload: MemberUpdate,
    context: TenantContext = Depends(require_roles("tenant_admin")),
):
    membership = context.db.get(TenantMembership, (context.tenant_id, user_id))
    user = context.db.get(User, user_id)
    if membership is None or user is None:
        raise NotFoundError("Member")
    if user.id == context.user_id and payload.model_dump(exclude_unset=True):
        raise AppError(409, "SELF_LOCKOUT", "Administrators cannot change their own role or status")
    changes = payload.model_dump(exclude_unset=True)
    removes_admin = membership.role == "tenant_admin" and (
        changes.get("role", membership.role) != "tenant_admin"
        or changes.get("status", membership.status) != "active"
    )
    if removes_admin:
        other_admins = (
            context.db.scalar(
                select(func.count(TenantMembership.user_id)).where(
                    TenantMembership.tenant_id == context.tenant_id,
                    TenantMembership.role == "tenant_admin",
                    TenantMembership.status == "active",
                    TenantMembership.user_id != user.id,
                )
            )
            or 0
        )
        if other_admins == 0:
            raise AppError(409, "LAST_ADMIN", "An organization must retain an active administrator")
    for key, value in changes.items():
        setattr(membership, key, value)
    tenant_event(
        context.db,
        tenant_id=context.tenant_id,
        actor_user_id=context.user_id,
        action="membership.changed",
        resource_type="membership",
        resource_id=user.id,
        metadata={"fields": sorted(changes)},
        request_id=context.request_id,
    )
    context.db.flush()
    return member_response(membership, user)
