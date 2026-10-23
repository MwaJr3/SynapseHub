import uuid

from celery import Celery
from celery.schedules import crontab
from sqlalchemy import func, select
from sqlalchemy.exc import OperationalError

from app.config import get_settings
from app.database.session import session_scope
from app.errors import NotFoundError
from app.models import Document, Project, Task, Tenant, TenantMembership
from app.services.usage import increment_usage

settings = get_settings()
celery_app = Celery("tenantcore", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    beat_schedule={
        "dispatch-usage-aggregation": {
            "task": "tenantcore.dispatch_usage_aggregation",
            "schedule": crontab(minute="*/15"),
        }
    },
)


def set_absolute_usage(db, tenant_id: uuid.UUID, metric: str, value: int) -> None:
    from datetime import UTC, datetime

    from sqlalchemy.dialects.postgresql import insert

    from app.models import UsageMetric

    statement = insert(UsageMetric).values(
        tenant_id=tenant_id,
        period_date=datetime.now(UTC).date(),
        metric=metric,
        value=value,
    )
    statement = statement.on_conflict_do_update(
        constraint="uq_usage_tenant_period_metric",
        set_={"value": value, "updated_at": datetime.now(UTC)},
    )
    db.execute(statement)


@celery_app.task(
    name="tenantcore.aggregate_usage",
    bind=True,
    autoretry_for=(OperationalError,),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=3,
)
def aggregate_usage(self, tenant_id: str) -> dict[str, int | str]:
    """Aggregate exactly one tenant; no process-global tenant context is used."""
    tenant_uuid = uuid.UUID(tenant_id)
    with session_scope(tenant_id=tenant_uuid, request_id=f"celery:{self.request.id}") as db:
        tenant = db.get(Tenant, tenant_uuid)
        if tenant is None or tenant.status != "active":
            raise NotFoundError("Active organization")
        values = {
            "projects": db.scalar(select(func.count(Project.id))) or 0,
            "active_users": db.scalar(
                select(func.count(TenantMembership.user_id)).where(
                    TenantMembership.tenant_id == tenant_uuid,
                    TenantMembership.status == "active",
                )
            )
            or 0,
            "storage_bytes": int(
                db.scalar(select(func.coalesce(func.sum(Document.storage_bytes), 0))) or 0
            ),
        }
        for metric, value in values.items():
            set_absolute_usage(db, tenant_uuid, metric, int(value))
        increment_usage(db, tenant_uuid, "background_jobs")
        return {"tenant_id": tenant_id, **{key: int(value) for key, value in values.items()}}


@celery_app.task(name="tenantcore.project_report")
def project_report(tenant_id: str, project_id: str) -> dict[str, int | str]:
    """Read-only report used to verify that jobs retain their tenant boundary."""
    tenant_uuid = uuid.UUID(tenant_id)
    with session_scope(tenant_id=tenant_uuid) as db:
        project = db.get(Project, uuid.UUID(project_id))
        if project is None:
            raise NotFoundError("Project")
        task_count = (
            db.scalar(select(func.count(Task.id)).where(Task.project_id == project.id)) or 0
        )
        increment_usage(db, tenant_uuid, "background_jobs")
        return {
            "tenant_id": tenant_id,
            "project_id": str(project.id),
            "name": project.name,
            "task_count": int(task_count),
        }


@celery_app.task(name="tenantcore.dispatch_usage_aggregation")
def dispatch_usage_aggregation() -> int:
    """The dispatcher fans out explicit tenant IDs to isolated child transactions."""
    with session_scope(platform_admin=True) as db:
        tenant_ids = db.scalars(select(Tenant.id).where(Tenant.status == "active")).all()
    for tenant_id in tenant_ids:
        aggregate_usage.delay(str(tenant_id))
    return len(tenant_ids)
