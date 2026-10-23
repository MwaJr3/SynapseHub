import uuid
from datetime import UTC, datetime

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import UsageMetric


def increment_usage(db: Session, tenant_id: uuid.UUID, metric: str, amount: int = 1) -> None:
    if amount < 0:
        raise ValueError("Usage increments cannot be negative")
    today = datetime.now(UTC).date()
    statement = insert(UsageMetric).values(
        tenant_id=tenant_id, period_date=today, metric=metric, value=amount
    )
    statement = statement.on_conflict_do_update(
        constraint="uq_usage_tenant_period_metric",
        set_={"value": UsageMetric.value + amount, "updated_at": datetime.now(UTC)},
    )
    db.execute(statement)
