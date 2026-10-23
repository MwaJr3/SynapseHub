from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from app.api.schemas import AuditEventResponse, PageMetadata
from app.auth.dependencies import TenantContext, require_roles
from app.models import TenantAuditEvent

router = APIRouter(prefix="/audit-events", tags=["audit"])


@router.get("")
def list_audit_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    action: str | None = Query(None, max_length=100),
    resource_type: str | None = Query(None, max_length=80),
    context: TenantContext = Depends(require_roles("tenant_admin", "manager")),
):
    filters = [TenantAuditEvent.tenant_id == context.tenant_id]
    if action:
        filters.append(TenantAuditEvent.action == action)
    if resource_type:
        filters.append(TenantAuditEvent.resource_type == resource_type)
    total = context.db.scalar(select(func.count(TenantAuditEvent.id)).where(*filters)) or 0
    events = context.db.scalars(
        select(TenantAuditEvent)
        .where(*filters)
        .order_by(TenantAuditEvent.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {
        "items": [AuditEventResponse.model_validate(event) for event in events],
        "meta": PageMetadata(
            page=page, page_size=page_size, total=total, pages=(total + page_size - 1) // page_size
        ),
    }
