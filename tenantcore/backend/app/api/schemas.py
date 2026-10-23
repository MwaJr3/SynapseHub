from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    message: str


class PageMetadata(BaseModel):
    page: int
    page_size: int
    total: int
    pages: int


class AuditEventResponse(ORMModel):
    id: UUID
    action: str
    resource_type: str
    resource_id: str | None
    event_metadata: dict[str, Any] = Field(default_factory=dict)
    actor_user_id: UUID | None
    request_id: str | None
    created_at: datetime
