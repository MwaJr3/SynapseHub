import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models import PlatformAuditEvent, TenantAuditEvent


def tenant_event(
    db: Session,
    *,
    tenant_id: uuid.UUID,
    actor_user_id: uuid.UUID | None,
    action: str,
    resource_type: str,
    resource_id: uuid.UUID | str | None = None,
    metadata: dict[str, Any] | None = None,
    request_id: str | None = None,
) -> TenantAuditEvent:
    event = TenantAuditEvent(
        tenant_id=tenant_id,
        actor_user_id=actor_user_id,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else None,
        event_metadata=metadata or {},
        request_id=request_id,
    )
    db.add(event)
    return event


def platform_event(
    db: Session,
    *,
    actor_user_id: uuid.UUID | None,
    action: str,
    resource_type: str,
    resource_id: uuid.UUID | str | None = None,
    metadata: dict[str, Any] | None = None,
    request_id: str | None = None,
) -> PlatformAuditEvent:
    event = PlatformAuditEvent(
        actor_user_id=actor_user_id,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else None,
        event_metadata=metadata or {},
        request_id=request_id,
    )
    db.add(event)
    return event
