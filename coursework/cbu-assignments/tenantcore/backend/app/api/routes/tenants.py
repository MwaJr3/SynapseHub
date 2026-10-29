from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import func, literal_column, or_, select

from app.api.schemas import AuditEventResponse, PageMetadata
from app.audit.service import platform_event, tenant_event
from app.auth.dependencies import (
    Principal,
    TenantContext,
    get_tenant_context,
    require_platform_admin,
    require_roles,
)
from app.database.session import session_scope
from app.errors import AppError, NotFoundError
from app.models import (
    Plan,
    PlatformAuditEvent,
    Subscription,
    Tenant,
    UsageMetric,
    User,
)
from app.tenants.schemas import (
    OrganizationUpdate,
    PlatformDashboardResponse,
    TenantCreate,
    TenantResponse,
    TenantUpdate,
)

router = APIRouter(tags=["organizations"])


@router.get("/plans")
def list_plans(_: Principal = Depends(require_platform_admin)):
    with session_scope(platform_admin=True) as db:
        plans = db.scalars(select(Plan).where(Plan.is_active.is_(True)).order_by(Plan.code)).all()
        return {
            "items": [
                {
                    "id": plan.id,
                    "code": plan.code,
                    "name": plan.name,
                    "limits": plan.limits,
                    "price_cents_monthly": plan.price_cents_monthly,
                }
                for plan in plans
            ]
        }


@router.get("/tenants")
def list_tenants(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    search: str | None = Query(None, max_length=160),
    principal: Principal = Depends(require_platform_admin),
):
    with session_scope(user_id=principal.id, platform_admin=True) as db:
        filters = []
        if status_filter:
            if status_filter not in {"provisioning", "active", "suspended", "archived"}:
                raise AppError(400, "INVALID_STATUS", "Unknown organization status")
            filters.append(Tenant.status == status_filter)
        if search:
            term = f"%{search.strip()}%"
            filters.append(or_(Tenant.name.ilike(term), Tenant.slug.ilike(term)))
        total = db.scalar(select(func.count(Tenant.id)).where(*filters)) or 0
        tenants = db.scalars(
            select(Tenant)
            .where(*filters)
            .order_by(Tenant.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return {
            "items": [TenantResponse.model_validate(tenant) for tenant in tenants],
            "meta": PageMetadata(
                page=page,
                page_size=page_size,
                total=total,
                pages=(total + page_size - 1) // page_size,
            ),
        }


@router.post("/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(
    payload: TenantCreate,
    request: Request,
    principal: Principal = Depends(require_platform_admin),
):
    with session_scope(
        user_id=principal.id,
        platform_admin=True,
        request_id=getattr(request.state, "request_id", None),
    ) as db:
        if db.get(Plan, payload.plan_id) is None:
            raise AppError(400, "INVALID_PLAN", "The selected plan does not exist")
        tenant = Tenant(
            name=payload.name,
            slug=payload.slug,
            plan_id=payload.plan_id,
            configuration=payload.configuration,
            status="provisioning",
        )
        db.add(tenant)
        db.flush()
        now = datetime.now(UTC)
        db.add(
            Subscription(
                tenant_id=tenant.id,
                plan_id=tenant.plan_id,
                status="trialing",
                current_period_start=now,
                current_period_end=now + timedelta(days=30),
            )
        )
        platform_event(
            db,
            actor_user_id=principal.id,
            action="tenant.created",
            resource_type="tenant",
            resource_id=tenant.id,
            metadata={"slug": tenant.slug},
            request_id=getattr(request.state, "request_id", None),
        )
        db.flush()
        return TenantResponse.model_validate(tenant)


@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
def get_tenant(tenant_id: str, principal: Principal = Depends(require_platform_admin)):
    with session_scope(user_id=principal.id, platform_admin=True) as db:
        tenant = db.get(Tenant, tenant_id)
        if tenant is None:
            raise NotFoundError("Organization")
        return TenantResponse.model_validate(tenant)


@router.patch("/tenants/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: str,
    payload: TenantUpdate,
    request: Request,
    principal: Principal = Depends(require_platform_admin),
):
    with session_scope(user_id=principal.id, platform_admin=True) as db:
        tenant = db.get(Tenant, tenant_id)
        if tenant is None:
            raise NotFoundError("Organization")
        changes = payload.model_dump(exclude_unset=True)
        if "plan_id" in changes and db.get(Plan, changes["plan_id"]) is None:
            raise AppError(400, "INVALID_PLAN", "The selected plan does not exist")
        for key, value in changes.items():
            setattr(tenant, key, value)
        platform_event(
            db,
            actor_user_id=principal.id,
            action="tenant.configuration_changed",
            resource_type="tenant",
            resource_id=tenant.id,
            metadata={"fields": sorted(changes)},
            request_id=getattr(request.state, "request_id", None),
        )
        db.flush()
        return TenantResponse.model_validate(tenant)


def transition_tenant(tenant_id: str, target: str, principal: Principal, request: Request):
    with session_scope(user_id=principal.id, platform_admin=True) as db:
        tenant = db.get(Tenant, tenant_id)
        if tenant is None:
            raise NotFoundError("Organization")
        if tenant.status == "archived":
            raise AppError(409, "INVALID_LIFECYCLE", "Archived organizations cannot be reactivated")
        if target == "active" and tenant.status not in {"provisioning", "suspended"}:
            raise AppError(
                409,
                "INVALID_LIFECYCLE",
                "Only provisioning or suspended organizations can activate",
            )
        if target == "suspended" and tenant.status != "active":
            raise AppError(409, "INVALID_LIFECYCLE", "Only active organizations can be suspended")
        now = datetime.now(UTC)
        tenant.status = target
        if target == "active":
            tenant.provisioned_at = tenant.provisioned_at or now
            tenant.suspended_at = None
        elif target == "suspended":
            tenant.suspended_at = now
        elif target == "archived":
            tenant.archived_at = now
        platform_event(
            db,
            actor_user_id=principal.id,
            action=f"tenant.{target}",
            resource_type="tenant",
            resource_id=tenant.id,
            metadata={"previous_request_id": getattr(request.state, "request_id", None)},
            request_id=getattr(request.state, "request_id", None),
        )
        db.flush()
        return TenantResponse.model_validate(tenant)


@router.post("/tenants/{tenant_id}/activate", response_model=TenantResponse)
def activate_tenant(
    tenant_id: str, request: Request, principal: Principal = Depends(require_platform_admin)
):
    return transition_tenant(tenant_id, "active", principal, request)


@router.post("/tenants/{tenant_id}/suspend", response_model=TenantResponse)
def suspend_tenant(
    tenant_id: str, request: Request, principal: Principal = Depends(require_platform_admin)
):
    return transition_tenant(tenant_id, "suspended", principal, request)


@router.post("/tenants/{tenant_id}/archive", response_model=TenantResponse)
def archive_tenant(
    tenant_id: str, request: Request, principal: Principal = Depends(require_platform_admin)
):
    return transition_tenant(tenant_id, "archived", principal, request)


@router.get("/organization", response_model=TenantResponse)
def current_organization(context: TenantContext = Depends(get_tenant_context)):
    return TenantResponse.model_validate(context.tenant)


@router.patch("/organization", response_model=TenantResponse)
def update_organization(
    payload: OrganizationUpdate,
    context: TenantContext = Depends(require_roles("tenant_admin")),
):
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(context.tenant, key, value)
    tenant_event(
        context.db,
        tenant_id=context.tenant_id,
        actor_user_id=context.user_id,
        action="tenant.configuration_changed",
        resource_type="tenant",
        resource_id=context.tenant_id,
        metadata={"fields": sorted(changes)},
        request_id=context.request_id,
    )
    context.db.flush()
    return TenantResponse.model_validate(context.tenant)


@router.get("/platform/dashboard", response_model=PlatformDashboardResponse)
def platform_dashboard(principal: Principal = Depends(require_platform_admin)):
    with session_scope(user_id=principal.id, platform_admin=True) as db:
        counts: dict[str, int] = {
            status: int(count)
            for status, count in db.execute(
                select(Tenant.status, func.count(Tenant.id)).group_by(Tenant.status)
            )
        }
        month = func.date_trunc(literal_column("'month'"), Tenant.created_at)
        growth = db.execute(
            select(month, func.count(Tenant.id)).group_by(month).order_by(month.desc()).limit(12)
        ).all()
        events = db.scalars(
            select(PlatformAuditEvent).order_by(PlatformAuditEvent.created_at.desc()).limit(10)
        ).all()
        usage = db.execute(
            select(UsageMetric.metric, func.sum(UsageMetric.value)).group_by(UsageMetric.metric)
        ).all()
        return PlatformDashboardResponse(
            tenants={
                "total": sum(counts.values()),
                "active": counts.get("active", 0),
                "suspended": counts.get("suspended", 0),
                "provisioning": counts.get("provisioning", 0),
                "archived": counts.get("archived", 0),
            },
            total_users=db.scalar(select(func.count(User.id))) or 0,
            tenant_growth=[
                {"month": month.date().isoformat(), "tenants": count}
                for month, count in reversed(growth)
            ],
            recent_events=[AuditEventResponse.model_validate(event) for event in events],
            usage={metric: int(value or 0) for metric, value in usage},
        )
