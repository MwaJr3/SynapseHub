"""Digest ("what did I miss?"): a ranked, capped, explainable shortlist.

Design decisions (documented in the README):
* Visit-based, not calendar-based: the window opens at your previous visit, clamped to 12h..7d so
  a quiet day still has something and a long absence doesn't become a firehose.
* Deterministic scoring — no AI, so every pick can say *why* it is there:
    freshness (half-life 18h) + rarity (quiet publishers outrank prolific ones) + depth
    (full article available) + affinity (you actually read this source before).
* At most 2 picks per source, at most 12 overall, grouped under your own categories.
"""
from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime, timedelta

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from .models import Category, Feed, Item, User, utcnow

MIN_WINDOW = timedelta(hours=12)
MAX_WINDOW = timedelta(days=7)
PER_FEED_CAP = 2
TOTAL_CAP = 12
HALF_LIFE_HOURS = 18.0


def window_start(user: User, mode: str, now: datetime) -> datetime:
    if mode == "24h":
        return now - timedelta(hours=24)
    if mode == "7d":
        return now - timedelta(days=7)
    since = user.previous_visit_at or (now - timedelta(days=1))
    return min(max(since, now - MAX_WINDOW), now - MIN_WINDOW)


def build_digest(db: Session, user: User, mode: str = "since_visit") -> dict:
    now = utcnow()
    start = window_start(user, mode, now)
    rows = db.execute(
        select(Item, Feed).join(Feed, Feed.id == Item.feed_id).where(Item.user_id == user.id, Item.published_at >= start, Item.is_read.is_(False)).order_by(Item.published_at.desc())
    ).all()
    per_feed_total: dict[int, int] = defaultdict(int)
    for item, _ in rows:
        per_feed_total[item.feed_id] += 1

    read_rate: dict[int, float] = {}
    stats = db.execute(
        select(Item.feed_id, func.count(Item.id), func.sum(case((Item.is_read.is_(True), 1), else_=0))).where(Item.user_id == user.id).group_by(Item.feed_id)
    ).all()
    for feed_id, total, read in stats:
        read_rate[feed_id] = (read or 0) / total if total else 0.0

    scored = []
    for item, feed in rows:
        age_h = max((now - item.published_at).total_seconds() / 3600, 0)
        freshness = math.pow(0.5, age_h / HALF_LIFE_HOURS)
        rarity = 1 / math.sqrt(per_feed_total[item.feed_id])
        depth = 0.25 if item.has_full_content else 0.0
        affinity = 0.5 * read_rate.get(item.feed_id, 0.0)
        score = freshness + 0.8 * rarity + depth + affinity
        reason = "Fresh today"
        if per_feed_total[item.feed_id] == 1:
            reason = "Only new post from this source"
        elif rarity >= 0.5:
            reason = "From a quieter source"
        if affinity >= 0.25:
            reason = "A source you read often"
        elif age_h > 36:
            reason = "Still worth a look"
        scored.append((score, item, feed, reason))
    scored.sort(key=lambda row: row[0], reverse=True)

    picks, taken = [], defaultdict(int)
    for score, item, feed, reason in scored:
        if taken[item.feed_id] >= PER_FEED_CAP or len(picks) >= TOTAL_CAP:
            continue
        taken[item.feed_id] += 1
        picks.append((score, item, feed, reason))

    category_names = {c.id: c.name for c in db.scalars(select(Category).where(Category.user_id == user.id))}
    groups: dict[str, list] = defaultdict(list)
    for entry in picks:
        groups[category_names.get(entry[2].category_id, "Uncategorized")].append(entry)
    order = {c.name: c.position for c in db.scalars(select(Category).where(Category.user_id == user.id))}
    ordered = sorted(groups.items(), key=lambda kv: order.get(kv[0], 10_000))

    return {
        "window": {"mode": mode, "start": start, "end": now},
        "total_new": len(rows),
        "shown": len(picks),
        "remaining": max(len(rows) - len(picks), 0),
        "sources": len(per_feed_total),
        "groups": [{"category": name, "items": [(item, feed, reason, round(score, 3)) for score, item, feed, reason in entries]} for name, entries in ordered],
    }
