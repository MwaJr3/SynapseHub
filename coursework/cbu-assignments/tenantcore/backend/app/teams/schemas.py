from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.api.schemas import ORMModel


class TeamCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=3000)


class TeamUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=3000)


class TeamResponse(ORMModel):
    id: UUID
    tenant_id: UUID
    name: str
    description: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime
