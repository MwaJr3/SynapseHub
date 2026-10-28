from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID
from urllib.parse import urlparse
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid')


class BaseItem(StrictModel):
    id: UUID
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(max_length=50000)
    createdAt: datetime

    @field_validator('title')
    @classmethod
    def title_not_blank(cls, v):
        if not v.strip():
            raise ValueError('Blank title')
        return v


class Task(BaseItem):
    kind: Literal['task']
    completed: bool
    priority: Literal['normal', 'high']
    due: date | Literal['']


class Note(BaseItem):
    kind: Literal['note']


class Source(BaseItem):
    kind: Literal['source']
    url: str = Field(max_length=4096)

    @field_validator('url')
    @classmethod
    def safe_url(cls, v):
        if v and (urlparse(v).scheme not in ('http', 'https') or not urlparse(v).netloc):
            raise ValueError('Unsafe URL')
        return v


class Relation(StrictModel):
    from_: UUID = Field(alias='from')
    to: UUID
    type: Literal['derived-from']


class Workspace(StrictModel):
    version: Literal[1]
    revision: int = Field(ge=0)
    items: list[Annotated[Task | Note | Source, Field(discriminator='kind')]] = Field(max_length=2000)
    relations: list[Relation] = Field(max_length=5000)

    @model_validator(mode='after')
    def integrity(self):
        ids = {i.id for i in self.items}
        if len(ids) != len(self.items):
            raise ValueError('Duplicate IDs')
        edges = set()
        for r in self.relations:
            edge = (r.from_, r.to)
            if r.from_ not in ids or r.to not in ids or r.from_ == r.to or edge in edges:
                raise ValueError('Invalid relationship')
            edges.add(edge)
        return self


class SyncRequest(StrictModel):
    expected_revision: int = Field(ge=0)
    workspace: Workspace


class AskRequest(StrictModel):
    question: str = Field(min_length=1, max_length=2000)
    source_ids: list[UUID] = Field(min_length=1, max_length=50)
    provider: Literal['local', 'cloud'] | None = None
    generate: bool = False
    consent: bool = False


class GeneratedClaim(StrictModel):
    text: str = Field(min_length=1, max_length=3000)
    citation_id: UUID
    quote: str = Field(min_length=10, max_length=2000)


class GeneratedAnswer(StrictModel):
    claims: list[GeneratedClaim] = Field(max_length=12)
