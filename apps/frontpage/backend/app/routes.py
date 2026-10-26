"""HTTP API. Every data route is scoped to the signed-in (or guest) user in its WHERE clause."""
from __future__ import annotations

import base64
import logging
import threading
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile
from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import config, fetcher, opml, parser, security, service
from .database import SessionLocal, get_db
from .digest import build_digest
from .models import Category, Feed, Item, User, utcnow
from .schemas import (
    CategoryBody, FeedCreateBody, FeedPatchBody, FeedUrlBody, FollowPackBody, ItemPatchBody,
    LoginBody, LookupBody, MarkReadBody, PrefsBody, RegisterBody, ReorderBody, ResetConfirmBody,
    ResetRequestBody, feed_out, item_out, iso, user_out,
)

log = logging.getLogger("frontpage.api")
router = APIRouter(prefix="/api")

VISIT_GAP = timedelta(minutes=30)
MAX_OPML_BYTES = 2 * 1024 * 1024


# ---------------------------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------------------------


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    return security.get_session_user(db, request.cookies.get(config.SESSION_COOKIE))


def current_user(user: User | None = Depends(optional_user)) -> User:
    if user is None:
        raise HTTPException(status_code=401, detail="Please sign in to continue.")
    return user


def set_cookie(response: Response, token: str, max_age: int) -> None:
    response.set_cookie(
        config.SESSION_COOKIE, token, max_age=max_age, httponly=True, samesite="lax",
        secure=config.COOKIE_SECURE, path="/",
    )


def touch_visit(db: Session, user: User) -> None:
    """A "visit" starts after 30 idle minutes; the previous visit's start powers the digest window."""
    now = utcnow()
    if user.last_visit_at is None or now - user.last_visit_at > VISIT_GAP:
        user.previous_visit_at = user.last_visit_at
        user.last_visit_at = now
        db.commit()


# ---------------------------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------------------------


@router.post("/auth/register")
def register(body: RegisterBody, request: Request, response: Response, db: Session = Depends(get_db), existing: User | None = Depends(optional_user)):
    security.limiter.check("register", client_ip(request), 10, 3600)
    taken = db.scalar(select(User).where(User.email == body.email))
    if taken:
        raise HTTPException(status_code=409, detail="An account with that email already exists. Try signing in.")
    name = body.display_name.strip() or body.email.split("@")[0]
    if existing is not None and existing.kind == "guest":
        user = existing  # a guest signing up keeps everything they set up
        user.kind, user.email, user.display_name = "user", body.email, name
        user.password_hash, user.expires_at = security.hash_password(body.password), None
    else:
        user = User(kind="user", email=body.email, display_name=name, password_hash=security.hash_password(body.password))
        db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="An account with that email already exists. Try signing in.")
    token, age = security.create_session(db, user)
    set_cookie(response, token, age)
    return {"user": user_out(user)}


@router.post("/auth/login")
def login(body: LoginBody, request: Request, response: Response, db: Session = Depends(get_db)):
    security.limiter.check("login", client_ip(request), 10, 300)
    user = db.scalar(select(User).where(User.email == body.email, User.kind == "user"))
    # Same work and same message whether the account exists or not.
    if not user or not security.verify_password(body.password, user.password_hash):
        if not user:
            security.verify_password(body.password, "scrypt$16384$8$1$00$00")
        raise HTTPException(status_code=401, detail="That email and password don't match.")
    token, age = security.create_session(db, user)
    set_cookie(response, token, age)
    return {"user": user_out(user)}


@router.post("/auth/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    security.destroy_session(db, request.cookies.get(config.SESSION_COOKIE))
    response.delete_cookie(config.SESSION_COOKIE, path="/")
    return {"ok": True}


_template_refreshing = threading.Event()


def _background_template_refresh() -> None:
    if _template_refreshing.is_set():
        return
    _template_refreshing.set()
    try:
        service.refresh_template()
    except Exception:  # pragma: no cover - logged, never surfaced to a guest
        log.exception("Guest template refresh failed")
    finally:
        _template_refreshing.clear()


@router.post("/auth/guest")
def start_guest(request: Request, response: Response, db: Session = Depends(get_db)):
    security.limiter.check("guest", client_ip(request), 20, 600)
    service.purge_expired_guests(db)
    has_items, fresh = service.template_is_fresh(db)
    if not has_items:
        service.refresh_template()  # cold start: wait once so the first guest sees real content
    elif not fresh:
        threading.Thread(target=_background_template_refresh, daemon=True).start()
    guest = User(
        kind="guest", display_name="Guest",
        expires_at=utcnow() + timedelta(seconds=config.GUEST_MAX_AGE_SECONDS),
        last_visit_at=utcnow(),
    )
    db.add(guest)
    db.flush()
    service.clone_template_into(db, guest)
    token, age = security.create_session(db, guest, config.GUEST_MAX_AGE_SECONDS)
    set_cookie(response, token, age)
    return {"user": user_out(guest)}


@router.get("/auth/me")
def me(db: Session = Depends(get_db), user: User = Depends(current_user)):
    touch_visit(db, user)
    return {"user": user_out(user), "prefs": service.load_prefs(user)}


@router.post("/auth/password-reset/request")
def reset_request(body: ResetRequestBody, request: Request, db: Session = Depends(get_db)):
    security.limiter.check("reset", client_ip(request), 5, 900)
    user = db.scalar(select(User).where(User.email == body.email, User.kind == "user"))
    payload: dict = {"ok": True, "message": "If that email has an account, a reset link is on its way."}
    if user:
        token = security.issue_reset_token(db, user)
        # No mail provider is configured: the link goes to the server log (see README).
        log.warning("Password reset link for %s: /reset-password?token=%s", user.email, token)
        if config.DEV_EXPOSE_RESET:
            payload["dev_token"] = token
    return payload


@router.post("/auth/password-reset/confirm")
def reset_confirm(body: ResetConfirmBody, db: Session = Depends(get_db)):
    user = security.consume_reset_token(db, body.token)
    if not user:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired. Request a new one.")
    user.password_hash = security.hash_password(body.password)
    from .models import SessionToken

    db.query(SessionToken).filter(SessionToken.user_id == user.id).delete()  # sign out everywhere
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------------------------
# Library (sidebar + health dashboard in one round trip)
# ---------------------------------------------------------------------------------------------


@router.get("/library")
def library(db: Session = Depends(get_db), user: User = Depends(current_user)):
    counts = {
        row.feed_id: (row.total, row.unread)
        for row in db.execute(
            select(
                Item.feed_id,
                func.count(Item.id).label("total"),
                func.coalesce(func.sum(case((Item.is_read.is_(False), 1), else_=0)), 0).label("unread"),
            ).where(Item.user_id == user.id).group_by(Item.feed_id)
        )
    }
    feeds = list(db.scalars(select(Feed).where(Feed.user_id == user.id).order_by(func.lower(Feed.title))))
    categories = list(db.scalars(select(Category).where(Category.user_id == user.id).order_by(Category.position, Category.id)))
    saved = db.scalar(select(func.count(Item.id)).where(Item.user_id == user.id, Item.is_bookmarked.is_(True))) or 0
    feed_rows = [feed_out(f, unread=int(counts.get(f.id, (0, 0))[1]), total=int(counts.get(f.id, (0, 0))[0])) for f in feeds]
    unread_by_cat: dict[int | None, int] = defaultdict(int)
    for row in feed_rows:
        unread_by_cat[row["category_id"]] += row["unread"]
    health = {"active": 0, "stale": 0, "error": 0}
    for row in feed_rows:
        health[row["status"]] += 1
    newest_fetch = max((f.last_success_at for f in feeds if f.last_success_at), default=None)
    return {
        "categories": [
            {"id": c.id, "name": c.name, "position": c.position, "unread": unread_by_cat[c.id], "feed_count": sum(1 for r in feed_rows if r["category_id"] == c.id)}
            for c in categories
        ],
        "uncategorized": {"unread": unread_by_cat[None], "feed_count": sum(1 for r in feed_rows if r["category_id"] is None)},
        "feeds": feed_rows,
        "totals": {"unread": sum(r["unread"] for r in feed_rows), "items": sum(r["total"] for r in feed_rows), "saved": saved, "feeds": len(feed_rows)},
        "health": health,
        "last_updated": iso(newest_fetch),
    }


# ---------------------------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------------------------


def _own_category(db: Session, user: User, category_id: int) -> Category:
    category = db.scalar(select(Category).where(Category.id == category_id, Category.user_id == user.id))
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")
    return category


@router.post("/categories", status_code=201)
def create_category(body: CategoryBody, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if db.scalar(select(Category.id).where(Category.user_id == user.id, func.lower(Category.name) == body.name.lower())):
        raise HTTPException(status_code=409, detail="You already have a category with that name.")
    category = service.get_or_create_category(db, user, body.name)
    db.commit()
    return {"id": category.id, "name": category.name, "position": category.position}


@router.patch("/categories/{category_id}")
def rename_category(category_id: int, body: CategoryBody, db: Session = Depends(get_db), user: User = Depends(current_user)):
    category = _own_category(db, user, category_id)
    clash = db.scalar(select(Category.id).where(Category.user_id == user.id, func.lower(Category.name) == body.name.lower(), Category.id != category.id))
    if clash:
        raise HTTPException(status_code=409, detail="You already have a category with that name.")
    category.name = body.name
    db.commit()
    return {"id": category.id, "name": category.name, "position": category.position}


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    move_to: int | None = Query(default=None, description="Reassign its feeds here; omit to uncategorize them."),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    category = _own_category(db, user, category_id)
    target = None
    if move_to is not None:
        target = _own_category(db, user, move_to)
        if target.id == category.id:
            raise HTTPException(status_code=400, detail="Pick a different category to move feeds into.")
    moved = db.query(Feed).filter(Feed.user_id == user.id, Feed.category_id == category.id).update({Feed.category_id: target.id if target else None})
    db.delete(category)
    db.commit()
    return {"ok": True, "feeds_moved": moved, "moved_to": target.name if target else "Uncategorized"}


@router.put("/categories/order")
def reorder_categories(body: ReorderBody, db: Session = Depends(get_db), user: User = Depends(current_user)):
    owned = {c.id: c for c in db.scalars(select(Category).where(Category.user_id == user.id))}
    if set(body.ids) != set(owned):
        raise HTTPException(status_code=400, detail="Send every category id exactly once.")
    for position, category_id in enumerate(body.ids, start=1):
        owned[category_id].position = position
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------------------------
# Feeds
# ---------------------------------------------------------------------------------------------


def _own_feed(db: Session, user: User, feed_id: int) -> Feed:
    feed = db.scalar(select(Feed).where(Feed.id == feed_id, Feed.user_id == user.id))
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found.")
    return feed


def _feed_response(db: Session, feed: Feed) -> dict:
    total = db.scalar(select(func.count(Item.id)).where(Item.feed_id == feed.id)) or 0
    unread = db.scalar(select(func.count(Item.id)).where(Item.feed_id == feed.id, Item.is_read.is_(False))) or 0
    return feed_out(feed, unread=unread, total=total)


def _fetch_failure(exc: Exception) -> HTTPException:
    status = 422 if getattr(exc, "permanent", True) else 502
    return HTTPException(status_code=status, detail=str(exc))


@router.post("/feeds/preview")
def preview_feed(body: FeedUrlBody, request: Request, db: Session = Depends(get_db), user: User = Depends(current_user)):
    security.limiter.check("probe", str(user.id), 40, 60)
    try:
        probe = service.probe_feed(body.url)
    except (fetcher.FetchError, parser.FeedParseError) as exc:
        raise _fetch_failure(exc)
    duplicate = service.find_duplicate(db, user, probe.url) or service.find_duplicate(db, user, body.url)
    parsed = probe.parsed
    return {
        "url": probe.url,
        "title": parsed.title or probe.url,
        "description": parsed.description,
        "site_url": parsed.site_url,
        "icon_url": parsed.icon_url,
        "format": parsed.format,
        "item_count": len(parsed.items),
        "warnings": parsed.warnings,
        "duplicate": {"id": duplicate.id, "title": duplicate.custom_title or duplicate.title} if duplicate else None,
        "sample": [{"title": i.title, "published_at": iso(i.published_at)} for i in parsed.items[:3]],
    }


@router.post("/feeds", status_code=201)
def create_feed(body: FeedCreateBody, db: Session = Depends(get_db), user: User = Depends(current_user)):
    security.limiter.check("probe", str(user.id), 40, 60)
    if body.category_id is not None:
        _own_category(db, user, body.category_id)
    try:
        feed = service.add_feed(db, user, body.url, category_id=body.category_id, category_name=body.category_name, custom_title=body.custom_title)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except (fetcher.FetchError, parser.FeedParseError) as exc:
        raise _fetch_failure(exc)
    return _feed_response(db, feed)


@router.patch("/feeds/{feed_id}")
def update_feed(feed_id: int, body: FeedPatchBody, db: Session = Depends(get_db), user: User = Depends(current_user)):
    feed = _own_feed(db, user, feed_id)
    if "custom_title" in body.model_fields_set:
        feed.custom_title = (body.custom_title or "").strip() or None
    if body.clear_category:
        feed.category_id = None
    elif body.category_id is not None:
        feed.category_id = _own_category(db, user, body.category_id).id
    db.commit()
    return _feed_response(db, feed)


@router.delete("/feeds/{feed_id}")
def delete_feed(feed_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    feed = _own_feed(db, user, feed_id)
    removed = db.scalar(select(func.count(Item.id)).where(Item.feed_id == feed.id)) or 0
    db.delete(feed)  # items (and their read/bookmark state) cascade with the feed
    db.commit()
    return {"ok": True, "items_removed": removed}


@router.post("/feeds/{feed_id}/refresh")
def refresh_one(feed_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    feed = _own_feed(db, user, feed_id)
    security.limiter.check("refresh-one", str(user.id), 30, 60)
    outcome = service.refresh_feed(db, feed, force=True)
    db.refresh(feed)
    return {"new_items": outcome.new_items, "error": outcome.error, "not_modified": outcome.not_modified, "feed": _feed_response(db, feed)}


@router.post("/feeds/refresh")
def refresh_all(
    category_id: int | None = None,
    force: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    security.limiter.check("refresh-all", str(user.id), 10, 60)
    query = select(Feed.id).where(Feed.user_id == user.id)
    if category_id is not None:
        query = query.where(Feed.category_id == category_id)
    ids = list(db.scalars(query))
    summary = service.refresh_many(ids, force=force)
    return {"checked": summary.checked, "new_items": summary.new_items, "errors": summary.errors, "skipped": summary.skipped, "at": iso(utcnow())}


# ---------------------------------------------------------------------------------------------
# Items
# ---------------------------------------------------------------------------------------------


def _like_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _encode_cursor(stamp: datetime, item_id: int) -> str:
    return base64.urlsafe_b64encode(f"{stamp.isoformat()}|{item_id}".encode()).decode()


def _decode_cursor(cursor: str) -> tuple[datetime, int]:
    try:
        stamp, item_id = base64.urlsafe_b64decode(cursor.encode()).decode().split("|")
        return datetime.fromisoformat(stamp), int(item_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid cursor.")


def _parse_when(value: str | None, field: str) -> datetime | None:
    if not value:
        return None
    parsed = parser.parse_date(value)
    if parsed is None:
        raise HTTPException(status_code=400, detail=f"Invalid {field} date.")
    return parsed


@router.get("/items")
def list_items(
    scope: str = Query(default="all", pattern="^(all|saved|unread)$"),
    feed_id: int | None = None,
    category_id: int | None = None,
    uncategorized: bool = False,
    unread_only: bool = False,
    q: str | None = Query(default=None, max_length=200),
    since: str | None = None,
    until: str | None = None,
    sort: str = Query(default="newest", pattern="^(newest|oldest|saved)$"),
    cursor: str | None = None,
    limit: int = Query(default=40, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    conditions = [Item.user_id == user.id]
    if scope == "saved":
        conditions.append(Item.is_bookmarked.is_(True))
    if scope == "unread" or unread_only:
        conditions.append(Item.is_read.is_(False))
    if feed_id is not None:
        conditions.append(Item.feed_id == feed_id)
    if category_id is not None:
        conditions.append(Item.feed_id.in_(select(Feed.id).where(Feed.user_id == user.id, Feed.category_id == category_id)))
    if uncategorized:
        conditions.append(Item.feed_id.in_(select(Feed.id).where(Feed.user_id == user.id, Feed.category_id.is_(None))))
    if q and q.strip():
        for term in q.split()[:6]:
            pattern = f"%{_like_escape(term.lower())}%"
            conditions.append(or_(func.lower(Item.title).like(pattern, escape="\\"), func.lower(Item.summary).like(pattern, escape="\\"), func.lower(Item.author).like(pattern, escape="\\")))
    start, end = _parse_when(since, "since"), _parse_when(until, "until")
    if start:
        conditions.append(Item.published_at >= start)
    if end:
        conditions.append(Item.published_at <= end + timedelta(days=1) if end.hour == end.minute == 0 else Item.published_at <= end)

    sort_col = Item.bookmarked_at if sort == "saved" else Item.published_at
    descending = sort != "oldest"
    total = db.scalar(select(func.count(Item.id)).where(*conditions)) or 0
    page_conditions = list(conditions)
    if cursor:
        stamp, last_id = _decode_cursor(cursor)
        page_conditions.append(
            or_(sort_col < stamp, and_(sort_col == stamp, Item.id < last_id)) if descending else or_(sort_col > stamp, and_(sort_col == stamp, Item.id > last_id))
        )
    order = (sort_col.desc(), Item.id.desc()) if descending else (sort_col.asc(), Item.id.asc())
    rows = db.execute(
        select(Item, Feed).join(Feed, Feed.id == Item.feed_id).where(*page_conditions).order_by(*order).limit(limit + 1)
    ).all()
    more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = None
    if more and rows:
        last = rows[-1][0]
        next_cursor = _encode_cursor(last.bookmarked_at if sort == "saved" and last.bookmarked_at else last.published_at, last.id)
    return {"items": [item_out(i, f) for i, f in rows], "next_cursor": next_cursor, "total": total}


@router.get("/items/new-count")
def new_count(since: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    stamp = _parse_when(since, "since")
    count = db.scalar(select(func.count(Item.id)).where(Item.user_id == user.id, Item.fetched_at > stamp, Item.is_read.is_(False))) or 0
    return {"count": count}


@router.post("/items/mark-read")
def mark_read(body: MarkReadBody, db: Session = Depends(get_db), user: User = Depends(current_user)):
    query = db.query(Item).filter(Item.user_id == user.id, Item.is_read.is_(not body.read))
    if body.scope == "feed":
        if body.feed_id is None:
            raise HTTPException(status_code=400, detail="feed_id is required.")
        _own_feed(db, user, body.feed_id)
        query = query.filter(Item.feed_id == body.feed_id)
    elif body.scope == "category":
        if body.category_id is None:
            raise HTTPException(status_code=400, detail="category_id is required.")
        _own_category(db, user, body.category_id)
        query = query.filter(Item.feed_id.in_(select(Feed.id).where(Feed.user_id == user.id, Feed.category_id == body.category_id)))
    elif body.scope == "uncategorized":
        query = query.filter(Item.feed_id.in_(select(Feed.id).where(Feed.user_id == user.id, Feed.category_id.is_(None))))
    updated = query.update({Item.is_read: body.read, Item.read_at: utcnow() if body.read else None}, synchronize_session=False)
    db.commit()
    return {"updated": updated}


def _own_item(db: Session, user: User, item_id: int) -> tuple[Item, Feed]:
    row = db.execute(select(Item, Feed).join(Feed, Feed.id == Item.feed_id).where(Item.id == item_id, Item.user_id == user.id)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Article not found.")
    return row


@router.get("/items/{item_id}")
def get_item(item_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    item, feed = _own_item(db, user, item_id)
    return item_out(item, feed, full=True)


@router.patch("/items/{item_id}")
def patch_item(item_id: int, body: ItemPatchBody, db: Session = Depends(get_db), user: User = Depends(current_user)):
    item, feed = _own_item(db, user, item_id)
    now = utcnow()
    if body.is_read is not None and body.is_read != item.is_read:
        item.is_read, item.read_at = body.is_read, now if body.is_read else None
    if body.is_bookmarked is not None and body.is_bookmarked != item.is_bookmarked:
        item.is_bookmarked, item.bookmarked_at = body.is_bookmarked, now if body.is_bookmarked else None
    db.commit()
    return item_out(item, feed)


# ---------------------------------------------------------------------------------------------
# Digest
# ---------------------------------------------------------------------------------------------


@router.get("/digest")
def digest(window: str = Query(default="since_visit", pattern="^(since_visit|24h|7d)$"), db: Session = Depends(get_db), user: User = Depends(current_user)):
    result = build_digest(db, user, window)
    return {
        "window": {"mode": window, "start": iso(result["window"]["start"]), "end": iso(result["window"]["end"])},
        "total_new": result["total_new"],
        "shown": result["shown"],
        "remaining": result["remaining"],
        "sources": result["sources"],
        "groups": [
            {"category": g["category"], "items": [{**item_out(item, feed), "reason": reason, "score": score} for item, feed, reason, score in g["items"]]}
            for g in result["groups"]
        ],
    }


# ---------------------------------------------------------------------------------------------
# OPML
# ---------------------------------------------------------------------------------------------


async def _read_opml(upload: UploadFile) -> list[opml.OpmlEntry]:
    data = await upload.read(MAX_OPML_BYTES + 1)
    if len(data) > MAX_OPML_BYTES:
        raise HTTPException(status_code=413, detail="That OPML file is larger than 2 MB.")
    try:
        return opml.parse_opml(data)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=422, detail="That file couldn't be read as OPML.")


def _classify(db: Session, user: User, entries: list[opml.OpmlEntry]) -> list[dict]:
    existing = {service.normalize_url(f.url) for f in db.scalars(select(Feed).where(Feed.user_id == user.id))}
    seen: set[str] = set()
    rows = []
    for entry in entries:
        if not entry.url:
            rows.append({"title": entry.title, "url": None, "category": entry.category, "status": "invalid", "reason": entry.problem})
            continue
        try:
            key = service.normalize_url(entry.url)
            fetcher_ok = key.startswith(("http://", "https://"))
        except Exception:
            fetcher_ok, key = False, entry.url
        if not fetcher_ok:
            rows.append({"title": entry.title, "url": entry.url, "category": entry.category, "status": "invalid", "reason": "Not an http(s) URL."})
        elif key in existing or key in seen:
            rows.append({"title": entry.title, "url": entry.url, "category": entry.category, "status": "duplicate", "reason": "Already subscribed." if key in existing else "Listed twice in this file."})
        else:
            seen.add(key)
            rows.append({"title": entry.title, "url": entry.url, "category": entry.category, "status": "new", "reason": None})
    return rows


@router.post("/opml/preview")
async def opml_preview(file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = _classify(db, user, await _read_opml(file))
    summary = {s: sum(1 for r in rows if r["status"] == s) for s in ("new", "duplicate", "invalid")}
    return {"entries": rows, "summary": summary, "categories": sorted({r["category"] for r in rows if r["category"]})}


@router.post("/opml/import")
async def opml_import(file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(current_user)):
    security.limiter.check("opml", str(user.id), 6, 300)
    rows = _classify(db, user, await _read_opml(file))
    pending = [r for r in rows if r["status"] == "new"]

    def probe(row: dict):
        try:
            return row, service.probe_feed(row["url"]), None
        except (fetcher.FetchError, parser.FeedParseError) as exc:
            return row, None, str(exc)

    with ThreadPoolExecutor(max_workers=config.REFRESH_WORKERS) as pool:
        results = list(pool.map(probe, pending))

    added, failed = [], []
    for row, found, error in results:
        if error or found is None:
            failed.append({"title": row["title"], "url": row["url"], "reason": error or "Unreachable."})
            continue
        try:
            feed = service.add_feed(db, user, row["url"], category_name=row["category"], custom_title=None, probe=found)
            added.append({"id": feed.id, "title": feed.custom_title or feed.title, "category": row["category"]})
        except ValueError as exc:
            rows_dup = next((r for r in rows if r["url"] == row["url"]), row)
            rows_dup["status"], rows_dup["reason"] = "duplicate", str(exc)
        except (fetcher.FetchError, parser.FeedParseError) as exc:
            failed.append({"title": row["title"], "url": row["url"], "reason": str(exc)})
    duplicates = [r for r in rows if r["status"] == "duplicate"]
    invalid = [r for r in rows if r["status"] == "invalid"]
    return {
        "added": added, "duplicates": duplicates, "failed": failed, "invalid": invalid,
        "summary": {"added": len(added), "duplicates": len(duplicates), "failed": len(failed), "invalid": len(invalid)},
    }


@router.get("/opml/export")
def opml_export(db: Session = Depends(get_db), user: User = Depends(current_user)):
    categories = list(db.scalars(select(Category).where(Category.user_id == user.id)))
    feeds = list(db.scalars(select(Feed).where(Feed.user_id == user.id).order_by(func.lower(Feed.title))))
    body = opml.export_opml("Frontpage subscriptions", categories, feeds)
    return Response(body, media_type="text/x-opml", headers={"Content-Disposition": 'attachment; filename="frontpage-subscriptions.opml"'})


# ---------------------------------------------------------------------------------------------
# Preferences + onboarding + discovery
# ---------------------------------------------------------------------------------------------


@router.put("/prefs")
def update_prefs(body: PrefsBody, db: Session = Depends(get_db), user: User = Depends(current_user)):
    import json

    current = service.load_prefs(user)
    patch = body.model_dump(exclude_unset=True)
    if "reader" in patch and patch["reader"] is not None:
        reader = patch.pop("reader")
        size, height = reader.get("font_size", current["reader"]["font_size"]), reader.get("line_height", current["reader"]["line_height"])
        current["reader"] = {
            "font_size": min(max(int(size), 14), 28),
            "line_height": min(max(float(height), 1.3), 2.2),
            "serif": bool(reader.get("serif", current["reader"]["serif"])),
            "width": reader.get("width", current["reader"]["width"]) if reader.get("width", "medium") in ("narrow", "medium", "wide") else "medium",
        }
    current.update({k: v for k, v in patch.items() if v is not None})
    user.prefs_json = json.dumps(current)
    db.commit()
    return {"prefs": current}


@router.post("/onboarding/complete")
def complete_onboarding(db: Session = Depends(get_db), user: User = Depends(current_user)):
    user.onboarded = True
    db.commit()
    return {"ok": True}


def _packs() -> list[dict]:
    packs = []
    for group in service.load_sample_catalog():
        packs.append(
            {
                "id": group["name"].lower().replace("&", "and").replace(" ", "-"),
                "name": group["name"],
                "feeds": [{"title": f["title"], "url": f["feedUrl"], "site_url": f.get("siteUrl"), "description": f.get("description", "")} for f in group["feeds"]],
            }
        )
    descriptions = {
        "frontend": "CSS, JavaScript and the web platform, from people who ship it.",
        "design": "UX research, product design and craft.",
        "backend-and-devops": "Infrastructure, platforms and shipping to production.",
        "general-tech": "Engineering culture and what the industry is talking about.",
        "ai-and-ml": "Practical notes on models, tools and what actually works.",
    }
    for pack in packs:
        pack["description"] = descriptions.get(pack["id"], "")
    return packs


@router.get("/discover/packs")
def discover_packs(db: Session = Depends(get_db), user: User = Depends(current_user)):
    followed = {service.normalize_url(f.url) for f in db.scalars(select(Feed).where(Feed.user_id == user.id))}
    packs = _packs()
    for pack in packs:
        for feed in pack["feeds"]:
            feed["followed"] = service.normalize_url(feed["url"]) in followed
        pack["followed_count"] = sum(1 for f in pack["feeds"] if f["followed"])
    return {"packs": packs}


@router.post("/discover/packs/{pack_id}/follow")
def follow_pack(pack_id: str, body: FollowPackBody, db: Session = Depends(get_db), user: User = Depends(current_user)):
    security.limiter.check("pack", str(user.id), 10, 300)
    pack = next((p for p in _packs() if p["id"] == pack_id), None)
    if not pack:
        raise HTTPException(status_code=404, detail="Starter pack not found.")
    wanted = [f for f in pack["feeds"] if body.urls is None or f["url"] in body.urls]
    existing = {service.normalize_url(f.url) for f in db.scalars(select(Feed).where(Feed.user_id == user.id))}
    todo = [f for f in wanted if service.normalize_url(f["url"]) not in existing]

    def probe(entry: dict):
        try:
            return entry, service.probe_feed(entry["url"], allow_discovery=False), None
        except (fetcher.FetchError, parser.FeedParseError) as exc:
            return entry, None, str(exc)

    with ThreadPoolExecutor(max_workers=config.REFRESH_WORKERS) as pool:
        results = list(pool.map(probe, todo))
    added, failed = [], []
    for entry, found, error in results:
        if found is None:
            failed.append({"title": entry["title"], "url": entry["url"], "reason": error})
            continue
        try:
            feed = service.add_feed(db, user, entry["url"], category_name=pack["name"], probe=found)
            added.append({"id": feed.id, "title": feed.title})
        except ValueError:
            continue
    user.onboarded = True
    db.commit()
    return {"added": added, "failed": failed, "already_following": len(wanted) - len(todo), "category": pack["name"]}


@router.post("/discover/lookup")
def discover_lookup(body: LookupBody, db: Session = Depends(get_db), user: User = Depends(current_user)):
    """Paste a site or feed URL (auto-discovers the feed) or search starter packs by name."""
    security.limiter.check("probe", str(user.id), 40, 60)
    query = body.query.strip()
    looks_like_url = "." in query and " " not in query
    results: list[dict] = []
    catalog_hits = [
        {"title": f["title"], "url": f["url"], "description": f["description"], "site_url": f["site_url"], "pack": p["name"], "source": "catalog"}
        for p in _packs() for f in p["feeds"] if query.lower() in f["title"].lower() or query.lower() in f["description"].lower() or query.lower() in p["name"].lower()
    ]
    if looks_like_url:
        try:
            probe = service.probe_feed(query)
            duplicate = service.find_duplicate(db, user, probe.url)
            results.append({"title": probe.parsed.title or probe.url, "url": probe.url, "description": probe.parsed.description, "site_url": probe.parsed.site_url, "source": "discovered", "duplicate": bool(duplicate)})
        except (fetcher.FetchError, parser.FeedParseError) as exc:
            if not catalog_hits:
                raise _fetch_failure(exc)
    return {"results": results + catalog_hits[:8]}
