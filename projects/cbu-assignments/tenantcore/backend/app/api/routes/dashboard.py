from fastapi import APIRouter, Depends
from sqlalchemy import func, select

from app.api.schemas import AuditEventResponse
from app.auth.dependencies import TenantContext, get_tenant_context
from app.models import Project, Task, Team, TenantAuditEvent, TenantMembership

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
def tenant_dashboard(context: TenantContext = Depends(get_tenant_context)):
    counts = {
        "projects": context.db.scalar(select(func.count(Project.id))) or 0,
        "active_projects": context.db.scalar(
            select(func.count(Project.id)).where(Project.status == "active")
        )
        or 0,
        "teams": context.db.scalar(select(func.count(Team.id))) or 0,
        "open_tasks": context.db.scalar(select(func.count(Task.id)).where(Task.status != "done"))
        or 0,
        "members": context.db.scalar(
            select(func.count(TenantMembership.user_id)).where(
                TenantMembership.tenant_id == context.tenant_id,
                TenantMembership.status == "active",
            )
        )
        or 0,
    }
    events = context.db.scalars(
        select(TenantAuditEvent).order_by(TenantAuditEvent.created_at.desc()).limit(8)
    ).all()
    task_statuses: dict[str, int] = {
        status: int(count)
        for status, count in context.db.execute(
            select(Task.status, func.count(Task.id)).group_by(Task.status)
        )
    }
    return {
        "organization": {
            "id": context.tenant.id,
            "name": context.tenant.name,
            "slug": context.tenant.slug,
            "status": context.tenant.status,
            "configuration": context.tenant.configuration,
        },
        "role": context.role,
        "counts": counts,
        "task_statuses": task_statuses,
        "recent_events": [AuditEventResponse.model_validate(event) for event in events],
    }
