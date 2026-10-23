from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.api.schemas import ORMModel


class TaskCreate(BaseModel):
    project_id: UUID
    title: str = Field(min_length=2, max_length=200)
    description: str = Field(default="", max_length=10000)
    assignee_id: UUID | None = None
    status: Literal["todo", "in_progress", "blocked", "done"] = "todo"
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    due_date: date | None = None


class TaskUpdate(BaseModel):
    project_id: UUID | None = None
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=10000)
    assignee_id: UUID | None = None
    status: Literal["todo", "in_progress", "blocked", "done"] | None = None
    priority: Literal["low", "medium", "high", "urgent"] | None = None
    due_date: date | None = None
    version: int = Field(ge=1)


class TaskResponse(ORMModel):
    id: UUID
    tenant_id: UUID
    project_id: UUID
    assignee_id: UUID | None
    created_by: UUID
    title: str
    description: str
    status: str
    priority: str
    due_date: date | None
    version: int
    created_at: datetime
    updated_at: datetime


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=10000)


class CommentResponse(ORMModel):
    id: UUID
    tenant_id: UUID
    task_id: UUID
    author_id: UUID
    body: str
    created_at: datetime


class DocumentCreate(BaseModel):
    project_id: UUID
    title: str = Field(min_length=2, max_length=200)
    content: str = Field(default="", max_length=100000)


class DocumentResponse(ORMModel):
    id: UUID
    tenant_id: UUID
    project_id: UUID
    title: str
    content: str
    storage_bytes: int
    created_by: UUID
    created_at: datetime
    updated_at: datetime


class NotificationResponse(ORMModel):
    id: UUID
    title: str
    body: str
    read_at: datetime | None
    created_at: datetime
