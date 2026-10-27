"""Request bodies and response serialisers."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from .models import Feed, Item, User
from .service import _error_kind, feed_status


def _email(value: str) -> str:
    value = value.strip().lower()
    if "@" not in value or "." not in value.rsplit("@", 1)[-1] or len(value) > 254 or " " in value:
        raise ValueError("Enter a valid email address.")
    return value


class RegisterBody(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=200)
    display_name: str = Field(default="", max_length=120)

    _norm = field_validator("email")(_email)


class LoginBody(BaseModel):
    email: str
    password: str = Field(max_length=200)

    _norm = field_validator("email")(_email)


class ResetRequestBody(BaseModel):
    email: str

    _norm = field_validator("email")(_email)


class ResetConfirmBody(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    password: str = Field(min_length=8, max_length=200)


class CategoryBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)

    @field_validator("name")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name can't be blank.")
        return v


class ReorderBody(BaseModel):
    ids: list[int]


class FeedUrlBody(BaseModel):
    url: str = Field(min_length=3, max_length=2048)


class FeedCreateBody(FeedUrlBody):
    category_id: int | None = None
    category_name: str | None = Field(default=None, max_length=80)
    custom_title: str | None = Field(default=None, max_length=300)


class FeedPatchBody(BaseModel):
    custom_title: str | None = Field(default=None, max_length=300)
    category_id: int | None = None
    clear_category: bool = False


class ItemPatchBody(BaseModel):
    is_read: bool | None = None
    is_bookmarked: bool | None = None


class MarkReadBody(BaseModel):
    scope: Literal["all", "feed", "category", "uncategorized"] = "all"
    feed_id: int | None = None
    category_id: int | None = None
    read: bool = True


class PrefsBody(BaseModel):
    layout: Literal["compact", "comfortable", "cards", "magazine"] | None = None
    category_layouts: dict[str, Literal["compact", "comfortable", "cards", "magazine"]] | None = None
    split_reader: bool | None = None
    refresh_minutes: Literal[0, 15, 30, 60] | None = None
    theme: Literal["system", "light", "dark"] | None = None
    reader: dict | None = None
    digest_window: Literal["since_visit", "24h", "7d"] | None = None


class FollowPackBody(BaseModel):
    urls: list[str] | None = None


class LookupBody(BaseModel):
    query: str = Field(min_length=2, max_length=2048)


def iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def user_out(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "is_guest": user.kind == "guest",
        "onboarded": user.onboarded,
        "expires_at": iso(user.expires_at),
        "previous_visit_at": iso(user.previous_visit_at),
    }


def feed_out(feed: Feed, unread: int = 0, total: int = 0) -> dict:
    return {
        "id": feed.id,
        "url": feed.url,
        "site_url": feed.site_url,
        "title": feed.custom_title or feed.title or feed.url,
        "original_title": feed.title,
        "custom_title": feed.custom_title,
        "description": feed.description,
        "icon_url": feed.icon_url,
        "format": feed.format,
        "category_id": feed.category_id,
        "status": feed_status(feed),
        "error": feed.last_error,
        "error_kind": _error_kind(feed),
        "failure_count": feed.failure_count,
        "next_retry_at": iso(feed.next_retry_at),
        "last_fetched_at": iso(feed.last_fetched_at),
        "last_success_at": iso(feed.last_success_at),
        "latest_item_at": iso(feed.latest_item_at),
        "unread": unread,
        "total": total,
    }


def item_out(item: Item, feed: Feed, *, full: bool = False) -> dict:
    data = {
        "id": item.id,
        "feed_id": item.feed_id,
        "feed_title": feed.custom_title or feed.title or feed.url,
        "feed_icon": feed.icon_url,
        "category_id": feed.category_id,
        "title": item.title,
        "url": item.url,
        "author": item.author,
        "summary": item.summary,
        "image_url": item.image_url,
        "published_at": iso(item.published_at),
        "date_missing": item.date_missing,
        "has_full_content": item.has_full_content,
        "is_read": item.is_read,
        "is_bookmarked": item.is_bookmarked,
        "bookmarked_at": iso(item.bookmarked_at),
    }
    if full:
        data["content_html"] = item.content_html
    return data
