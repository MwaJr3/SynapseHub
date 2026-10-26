"""Feed lifecycle: validate/add, refresh with conditional GET + backoff, dedupe, retention, health."""
from __future__ import annotations

import json
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse, urlunparse

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import config, fetcher, parser
from .database import SessionLocal
from .models import Category, Feed, Item, User, utcnow

log = logging.getLogger("frontpage.service")


# ---------------------------------------------------------------------------------------------
# URL helpers
# ---------------------------------------------------------------------------------------------


def normalize_url(url: str) -> str:
    """Canonical form used for duplicate detection: lowercase host, no fragment, no trailing '/' noise."""
    raw = (url or "").strip()
    if raw and "://" not in raw:
        raw = f"https://{raw}"
    parsed = urlparse(raw)
    path = parsed.path or "/"
    return urlunparse((parsed.scheme.lower(), parsed.netloc.lower(), path, parsed.params, parsed.query, ""))


def feed_status(feed: Feed, now: datetime | None = None) -> str:
    """active | stale | error — derived, never stored, so it cannot drift."""
    now = now or utcnow()
    if feed.last_error and (feed.last_success_at is None or feed.last_fetched_at is None or feed.last_fetched_at >= feed.last_success_at):
        return "error"
    reference = feed.latest_item_at or feed.last_success_at
    if reference and now - reference > timedelta(days=config.STALE_AFTER_DAYS):
        return "stale"
    return "active"


def _error_kind(feed: Feed) -> str | None:
    if not feed.last_error:
        return None
    return "permanent" if feed.permanent_failure else "temporary"


# ---------------------------------------------------------------------------------------------
# Validation + subscription
# ---------------------------------------------------------------------------------------------


@dataclass
class Probe:
    url: str
    parsed: parser.ParsedFeed
    fetch: fetcher.FetchResult


def probe_feed(url: str, *, allow_discovery: bool = True) -> Probe:
    """Fetch ``url`` and make sure it is a real feed. Falls back to <link rel=alternate> discovery."""
    normalized = normalize_url(url)
    result = fetcher.fetch(normalized)
    try:
        parsed = parser.parse_feed(result.body, result.content_type, result.final_url)
        return Probe(result.permanent_redirect_url or result.final_url, parsed, result)
    except parser.FeedParseError as exc:
        if not (allow_discovery and exc.looks_like_html):
            raise fetcher.FetchError(str(exc), permanent=True) from exc
        text = parser.decode_bytes(result.body, result.content_type)
        candidates = parser.discover_feed_links(text, result.final_url)
        base = urlparse(result.final_url)
        root = f"{base.scheme}://{base.netloc}"
        candidates += [f"{root}{p}" for p in ("/feed", "/feed/", "/rss.xml", "/atom.xml", "/feed.xml", "/index.xml", "/rss")]
        seen: set[str] = set()
        for candidate in candidates[:8]:
            if candidate in seen:
                continue
            seen.add(candidate)
            try:
                inner = probe_feed(candidate, allow_discovery=False)
                return inner
            except fetcher.FetchError:
                continue
        raise fetcher.FetchError(
            "That page doesn't advertise an RSS or Atom feed. Try the feed URL directly.", permanent=True
        ) from exc


def get_or_create_category(db: Session, user: User, name: str) -> Category:
    name = name.strip()[:80]
    existing = db.scalar(select(Category).where(Category.user_id == user.id, func.lower(Category.name) == name.lower()))
    if existing:
        return existing
    position = (db.scalar(select(func.max(Category.position)).where(Category.user_id == user.id)) or 0) + 1
    category = Category(user_id=user.id, name=name, position=position)
    db.add(category)
    db.flush()
    return category


def find_duplicate(db: Session, user: User, url: str) -> Feed | None:
    wanted = normalize_url(url)
    for feed in db.scalars(select(Feed).where(Feed.user_id == user.id)):
        if normalize_url(feed.url) == wanted:
            return feed
    return None


def apply_parsed(db: Session, feed: Feed, parsed: parser.ParsedFeed, result: fetcher.FetchResult | None, now: datetime) -> int:
    """Write feed metadata and upsert items. Returns the number of *new* items."""
    feed.format = parsed.format
    if parsed.title:
        feed.title = parsed.title
    elif not feed.title:
        feed.title = urlparse(feed.url).hostname or feed.url
    feed.description = parsed.description or feed.description
    feed.site_url = parsed.site_url or feed.site_url
    if parsed.icon_url:
        feed.icon_url = parsed.icon_url
    if not feed.icon_url and feed.site_url:
        site = urlparse(feed.site_url)
        feed.icon_url = f"{site.scheme}://{site.netloc}/favicon.ico"
    if result is not None:
        feed.etag = result.etag
        feed.last_modified = result.last_modified

    existing = {
        row.guid_hash: row
        for row in db.scalars(select(Item).where(Item.feed_id == feed.id).order_by(Item.published_at.desc()).limit(config.MAX_ITEMS_PER_FEED * 2))
    }
    created = 0
    seen: set[str] = set()
    for entry in parsed.items:
        key = parser.guid_hash(entry.guid)
        if key in seen:
            continue
        seen.add(key)
        row = existing.get(key)
        if row is not None:
            # Same item re-fetched with edited text: refresh content, never touch read/bookmark state.
            row.title, row.summary, row.content_html = entry.title, entry.summary, entry.content_html
            row.has_full_content, row.image_url, row.author = entry.has_full_content, entry.image_url, entry.author
            if entry.published_at and row.date_missing:
                row.published_at, row.date_missing = entry.published_at, False
            continue
        db.add(
            Item(
                feed_id=feed.id,
                user_id=feed.user_id,
                guid_hash=key,
                url=entry.url,
                title=entry.title,
                author=entry.author,
                summary=entry.summary,
                content_html=entry.content_html,
                has_full_content=entry.has_full_content,
                image_url=entry.image_url,
                published_at=entry.published_at or now,
                date_missing=entry.published_at is None,
                fetched_at=now,
            )
        )
        created += 1
    db.flush()
    prune_items(db, feed)
    latest = db.scalar(select(func.max(Item.published_at)).where(Item.feed_id == feed.id))
    feed.latest_item_at = latest
    return created


def prune_items(db: Session, feed: Feed) -> None:
    """Retention: keep the newest N per feed, never delete bookmarked items."""
    cutoff = db.scalar(
        select(Item.published_at).where(Item.feed_id == feed.id).order_by(Item.published_at.desc()).offset(config.MAX_ITEMS_PER_FEED).limit(1)
    )
    if cutoff is not None:
        db.query(Item).filter(Item.feed_id == feed.id, Item.published_at <= cutoff, Item.is_bookmarked.is_(False)).delete(synchronize_session=False)


def add_feed(db: Session, user: User, url: str, *, category_id: int | None = None, category_name: str | None = None, custom_title: str | None = None, probe: Probe | None = None) -> Feed:
    """Validate then store a subscription. Raises ``FetchError`` (unreachable/not a feed) or ``ValueError`` (duplicate/limit)."""
    count = db.scalar(select(func.count(Feed.id)).where(Feed.user_id == user.id)) or 0
    if count >= config.MAX_FEEDS_PER_USER:
        raise ValueError(f"You can follow up to {config.MAX_FEEDS_PER_USER} feeds.")
    probe = probe or probe_feed(url)
    duplicate = find_duplicate(db, user, probe.url) or find_duplicate(db, user, url)
    if duplicate:
        raise ValueError(f"You already follow “{duplicate.custom_title or duplicate.title or duplicate.url}”.")
    if category_name:
        category_id = get_or_create_category(db, user, category_name).id
    now = utcnow()
    feed = Feed(
        user_id=user.id,
        category_id=category_id,
        url=probe.url,
        custom_title=(custom_title or "").strip() or None,
        last_fetched_at=now,
        last_success_at=now,
    )
    db.add(feed)
    db.flush()
    apply_parsed(db, feed, probe.parsed, probe.fetch, now)
    db.commit()
    return feed


# ---------------------------------------------------------------------------------------------
# Refresh
# ---------------------------------------------------------------------------------------------


@dataclass
class RefreshOutcome:
    feed_id: int
    new_items: int = 0
    not_modified: bool = False
    error: str | None = None
    skipped: bool = False


def backoff_delay(failures: int) -> timedelta:
    seconds = min(config.BACKOFF_BASE_SECONDS * (2 ** max(failures - 1, 0)), config.BACKOFF_MAX_SECONDS)
    return timedelta(seconds=seconds)


def record_failure(feed: Feed, error: fetcher.FetchError | parser.FeedParseError, now: datetime) -> None:
    permanent = bool(getattr(error, "permanent", False)) or isinstance(error, parser.FeedParseError)
    feed.last_fetched_at = now
    feed.last_error = str(error)
    feed.failure_count += 1
    feed.permanent_failure = permanent and feed.failure_count >= 3 or feed.failure_count >= config.DEAD_AFTER_FAILURES
    feed.next_retry_at = now + (timedelta(days=1) if feed.permanent_failure else backoff_delay(feed.failure_count))


def refresh_feed(db: Session, feed: Feed, *, force: bool = False) -> RefreshOutcome:
    """Fetch one feed. Never raises for feed problems: failures are recorded on the feed row."""
    now = utcnow()
    if not force and feed.next_retry_at and feed.next_retry_at > now:
        return RefreshOutcome(feed.id, skipped=True, error=feed.last_error)
    try:
        result = fetcher.fetch(feed.url, etag=feed.etag, last_modified=feed.last_modified)
        if result.not_modified:
            feed.last_fetched_at = feed.last_success_at = now
            feed.last_error, feed.failure_count, feed.permanent_failure, feed.next_retry_at = None, 0, False, None
            db.commit()
            return RefreshOutcome(feed.id, not_modified=True)
        parsed = parser.parse_feed(result.body, result.content_type, result.final_url)
        if result.permanent_redirect_url and not db.scalar(
            select(Feed.id).where(Feed.user_id == feed.user_id, Feed.url == result.permanent_redirect_url)
        ):
            feed.url = result.permanent_redirect_url  # follow permanent redirects (301/308)
        created = apply_parsed(db, feed, parsed, result, now)
        feed.last_fetched_at = feed.last_success_at = now
        feed.last_error, feed.failure_count, feed.permanent_failure, feed.next_retry_at = None, 0, False, None
        db.commit()
        return RefreshOutcome(feed.id, new_items=created)
    except (fetcher.FetchError, parser.FeedParseError) as exc:
        db.rollback()
        feed = db.get(Feed, feed.id) or feed
        record_failure(feed, exc, now)
        db.commit()
        return RefreshOutcome(feed.id, error=str(exc))
    except Exception as exc:  # defensive: one broken feed must never break a batch
        db.rollback()
        log.exception("Unexpected error refreshing feed %s", feed.id)
        feed = db.get(Feed, feed.id) or feed
        record_failure(feed, fetcher.FetchError(f"Unexpected error: {exc.__class__.__name__}"), now)
        db.commit()
        return RefreshOutcome(feed.id, error=feed.last_error)


@dataclass
class BatchSummary:
    checked: int = 0
    new_items: int = 0
    errors: int = 0
    skipped: int = 0
    outcomes: list[RefreshOutcome] = field(default_factory=list)


def _refresh_one(feed_id: int, force: bool) -> RefreshOutcome:
    with SessionLocal() as db:
        feed = db.get(Feed, feed_id)
        if feed is None:
            return RefreshOutcome(feed_id, skipped=True)
        return refresh_feed(db, feed, force=force)


def refresh_many(feed_ids: list[int], *, force: bool = False) -> BatchSummary:
    """Refresh feeds in parallel. A slow/broken feed only delays itself (10s cap per request)."""
    summary = BatchSummary()
    if not feed_ids:
        return summary
    with ThreadPoolExecutor(max_workers=config.REFRESH_WORKERS) as pool:
        for outcome in pool.map(lambda fid: _refresh_one(fid, force), feed_ids):
            summary.outcomes.append(outcome)
            if outcome.skipped:
                summary.skipped += 1
                continue
            summary.checked += 1
            summary.new_items += outcome.new_items
            summary.errors += 1 if outcome.error else 0
    return summary


# ---------------------------------------------------------------------------------------------
# Preferences
# ---------------------------------------------------------------------------------------------

DEFAULT_PREFS = {
    "layout": "comfortable",  # compact | comfortable | cards | magazine
    "category_layouts": {},
    "split_reader": True,
    "refresh_minutes": 30,  # 0 = manual only
    "theme": "system",  # system | light | dark
    "reader": {"font_size": 18, "line_height": 1.7, "serif": True, "width": "medium"},
    "digest_window": "since_visit",
}


def load_prefs(user: User) -> dict:
    try:
        stored = json.loads(user.prefs_json or "{}")
    except json.JSONDecodeError:
        stored = {}
    merged = {**DEFAULT_PREFS, **{k: v for k, v in stored.items() if k in DEFAULT_PREFS}}
    merged["reader"] = {**DEFAULT_PREFS["reader"], **(stored.get("reader") or {})}
    return merged


# ---------------------------------------------------------------------------------------------
# Guest experience: a shared template account is cloned for each guest
# ---------------------------------------------------------------------------------------------

_template_lock = threading.Lock()


def load_sample_catalog() -> list[dict]:
    data = json.loads(config.SAMPLE_FEEDS_PATH.read_text(encoding="utf-8"))
    return data["categories"]


def get_template(db: Session) -> User:
    template = db.scalar(select(User).where(User.kind == "template"))
    if template is None:
        template = User(kind="template", display_name="Guest template", onboarded=True)
        db.add(template)
        db.flush()
        for position, group in enumerate(load_sample_catalog(), start=1):
            category = Category(user_id=template.id, name=group["name"], position=position)
            db.add(category)
            db.flush()
            for entry in group["feeds"]:
                db.add(
                    Feed(
                        user_id=template.id,
                        category_id=category.id,
                        url=entry["feedUrl"],
                        site_url=entry.get("siteUrl"),
                        title=entry["title"],
                        description=entry.get("description", ""),
                        format=entry.get("format"),
                    )
                )
        db.commit()
    return template


def refresh_template(*, force: bool = False) -> BatchSummary:
    """Refresh the shared template's feeds (guarded so concurrent guests don't stampede publishers)."""
    with _template_lock:
        with SessionLocal() as db:
            template = get_template(db)
            ids = [f.id for f in db.scalars(select(Feed).where(Feed.user_id == template.id))]
        summary = refresh_many(ids, force=force)
        with SessionLocal() as db:
            template = get_template(db)
            template.last_visit_at = utcnow()
            db.commit()
        return summary


def template_is_fresh(db: Session) -> tuple[bool, bool]:
    """(has_items, is_fresh)."""
    template = get_template(db)
    has_items = bool(db.scalar(select(func.count(Item.id)).where(Item.user_id == template.id)))
    stamp = template.last_visit_at
    fresh = bool(stamp and utcnow() - stamp < timedelta(seconds=config.GUEST_TEMPLATE_TTL_SECONDS))
    return has_items, fresh


def clone_template_into(db: Session, guest: User) -> None:
    template = get_template(db)
    category_map: dict[int, int] = {}
    for category in db.scalars(select(Category).where(Category.user_id == template.id).order_by(Category.position)):
        clone = Category(user_id=guest.id, name=category.name, position=category.position)
        db.add(clone)
        db.flush()
        category_map[category.id] = clone.id
    feed_map: dict[int, int] = {}
    for feed in db.scalars(select(Feed).where(Feed.user_id == template.id)):
        clone = Feed(
            user_id=guest.id,
            category_id=category_map.get(feed.category_id) if feed.category_id else None,
            url=feed.url, site_url=feed.site_url, title=feed.title, description=feed.description,
            icon_url=feed.icon_url, format=feed.format, etag=feed.etag, last_modified=feed.last_modified,
            last_fetched_at=feed.last_fetched_at, last_success_at=feed.last_success_at,
            latest_item_at=feed.latest_item_at, last_error=feed.last_error,
            failure_count=feed.failure_count, permanent_failure=feed.permanent_failure,
            next_retry_at=feed.next_retry_at,
        )
        db.add(clone)
        db.flush()
        feed_map[feed.id] = clone.id
    rows = []
    for item in db.scalars(select(Item).where(Item.user_id == template.id)):
        rows.append(
            {
                "feed_id": feed_map[item.feed_id], "user_id": guest.id, "guid_hash": item.guid_hash,
                "url": item.url, "title": item.title, "author": item.author, "summary": item.summary,
                "content_html": item.content_html, "has_full_content": item.has_full_content,
                "image_url": item.image_url, "published_at": item.published_at,
                "date_missing": item.date_missing, "fetched_at": item.fetched_at,
                "is_read": False, "is_bookmarked": False,
            }
        )
    if rows:
        db.bulk_insert_mappings(Item, rows)
    guest.onboarded = True
    db.commit()


def purge_expired_guests(db: Session) -> int:
    expired = db.scalars(select(User).where(User.kind == "guest", User.expires_at < utcnow())).all()
    for user in expired:
        db.delete(user)
    db.commit()
    return len(expired)
