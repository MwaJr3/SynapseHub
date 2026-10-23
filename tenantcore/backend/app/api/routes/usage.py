from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select

from app.auth.dependencies import TenantContext, get_tenant_context
from app.models import Document, Project, Task, TenantMembership, UsageMetric
from app.tenants.schemas import UsageSummary

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("", response_model=UsageSummary)
def usage_summary(context: TenantContext = Depends(get_tenant_context)):
    end = datetime.now(UTC).date()
    start = end - timedelta(days=29)
    rows = context.db.execute(
        select(UsageMetric.period_date, UsageMetric.metric, UsageMetric.value)
        .where(UsageMetric.period_date >= start, UsageMetric.period_date <= end)
        .order_by(UsageMetric.period_date, UsageMetric.metric)
    ).all()
    totals: dict[str, int] = {}
    daily: dict[str, dict[str, int | str]] = {}
    for period, metric, value in rows:
        totals[metric] = totals.get(metric, 0) + int(value)
        day = daily.setdefault(period.isoformat(), {"date": period.isoformat()})
        day[metric] = int(value)
    current = {
        "projects": context.db.scalar(
            select(func.count(Project.id)).where(Project.status != "archived")
        )
        or 0,
        "active_users": context.db.scalar(
            select(func.count(TenantMembership.user_id)).where(
                TenantMembership.tenant_id == context.tenant_id,
                TenantMembership.status == "active",
            )
        )
        or 0,
        "open_tasks": context.db.scalar(select(func.count(Task.id)).where(Task.status != "done"))
        or 0,
        "storage_bytes": int(
            context.db.scalar(select(func.coalesce(func.sum(Document.storage_bytes), 0))) or 0
        ),
    }
    return UsageSummary(
        period_start=start.isoformat(),
        period_end=end.isoformat(),
        totals=totals,
        current=current,
        daily=list(daily.values()),
    )
