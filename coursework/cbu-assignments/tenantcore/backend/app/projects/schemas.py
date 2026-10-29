from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.api.schemas import ORMModel


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=5000)
    team_id: UUID | None = None
    status: Literal["active", "on_hold", "completed", "archived"] = "active"


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=5000)
    team_id: UUID | None = None
    status: Literal["active", "on_hold", "completed", "archived"] | None = None


class ProjectResponse(ORMModel):
    id: UUID
    tenant_id: UUID
    team_id: UUID | None
    name: str
    description: str
    status: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime
