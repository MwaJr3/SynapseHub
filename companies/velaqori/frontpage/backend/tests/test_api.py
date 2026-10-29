from __future__ import annotations

from datetime import timedelta
from pathlib import Path

from sqlalchemy import select

from app import config, fetcher, service
from app.database import SessionLocal
from app.models import Feed, Item, User, utcnow

from . import feedfixtures as fx
from .conftest import signup

SAMPLE_OPML = Path(config.SAMPLE_FEEDS_PATH).with_name("sample-feeds.opml")


# ----------------------------------------------------------------------------- auth


def test_register_login_logout_me(web):
    c = signup("a@example.com")
    me = c.get("/api/auth/me")
    assert me.status_code == 200 and me.json()["user"]["email"] == "a@example.com"
    assert c.post("/api/auth/logout").status_code == 200
    assert c.get("/api/auth/me").status_code == 401
    bad = c.post("/api/auth/login", json={"email": "a@example.com", "password": "wrong-password"})
    assert bad.status_code == 401
    ok = c.post("/api/auth/login", json={"email": "A@Example.com", "password": "correct-horse-1"})
    assert ok.status_code == 200
    assert c.get("/api/auth/me").status_code == 200


def test_register_validation_and_duplicates(web):
    c = signup("dup@example.com")
    again = c.post("/api/auth/register", json={"email": "dup@example.com", "password": "another-pass-1"})
    assert again.status_code == 409
    assert c.post("/api/auth/register", json={"email": "not-an-email", "password": "long-enough-1"}).status_code == 422
    assert c.post("/api/auth/register", json={"email": "x@example.com", "password": "short"}).status_code == 422


def test_protected_routes_require_auth(client):
    for path in ("/api/library", "/api/items", "/api/digest", "/api/opml/export", "/api/discover/packs"):
        assert client.get(path).status_code == 401, path
    assert client.post("/api/feeds", json={"url": "https://x.test/feed"}).status_code == 401


def test_password_reset_flow(web):
    c = signup("reset@example.com", "original-pass-1")
    c.post("/api/auth/logout")
    missing = c.post("/api/auth/password-reset/request", json={"email": "nobody@example.com"})
    assert missing.status_code == 200 and "dev_token" not in missing.json()  # same response: no account enumeration
    token = c.post("/api/auth/password-reset/request", json={"email": "reset@example.com"}).json()["dev_token"]
    assert c.post("/api/auth/password-reset/confirm", json={"token": token, "password": "brand-new-pass-1"}).status_code == 200
    assert c.post("/api/auth/password-reset/confirm", json={"token": token, "password": "brand-new-pass-2"}).status_code == 400  # single use
    assert c.post("/api/auth/login", json={"email": "reset@example.com", "password": "original-pass-1"}).status_code == 401
    assert c.post("/api/auth/login", json={"email": "reset@example.com", "password": "brand-new-pass-1"}).status_code == 200


# ----------------------------------------------------------------------------- guest


def test_guest_gets_19_feeds_in_5_categories_with_content(client):
    r = client.post("/api/auth/guest")
    assert r.status_code == 200 and r.json()["user"]["is_guest"] is True
    lib = client.get("/api/library").json()
    assert len(lib["feeds"]) == 19
    assert [c["name"] for c in lib["categories"]] == ["Frontend", "Design", "Backend & DevOps", "General Tech", "AI & ML"]
    assert lib["totals"]["unread"] == 19 * 6
    assert client.get("/api/items?limit=5").json()["items"]


def test_guest_data_is_isolated_and_session_scoped(web):
    from fastapi.testclient import TestClient
    from app.main import app

    g1, g2 = TestClient(app), TestClient(app)
    g1.post("/api/auth/guest")
    g2.post("/api/auth/guest")
    first = g1.get("/api/items?limit=1").json()["items"][0]
    assert g1.patch(f"/api/items/{first['id']}", json={"is_bookmarked": True}).status_code == 200
    assert g2.get("/api/library").json()["totals"]["saved"] == 0
    assert g2.patch(f"/api/items/{first['id']}", json={"is_read": True}).status_code == 404


def test_expired_guest_is_purged_and_rejected(client):
    client.post("/api/auth/guest")
    with SessionLocal() as db:
        guest = db.scalar(select(User).where(User.kind == "guest"))
        guest.expires_at = utcnow() - timedelta(minutes=1)
        db.commit()
    assert client.get("/api/auth/me").status_code == 401
    other = client.__class__(client.app)
    other.post("/api/auth/guest")
    with SessionLocal() as db:
        assert len(db.scalars(select(User).where(User.kind == "guest")).all()) == 1  # old one purged


def test_guest_signup_keeps_their_setup(client):
    client.post("/api/auth/guest")
    before = client.get("/api/library").json()["totals"]["feeds"]
    r = client.post("/api/auth/register", json={"email": "keep@example.com", "password": "long-enough-1"})
    assert r.status_code == 200 and r.json()["user"]["is_guest"] is False
    assert client.get("/api/library").json()["totals"]["feeds"] == before


# ----------------------------------------------------------------------------- feeds


def test_add_feed_validates_and_stores_metadata(user, blog):
    r = user.post("/api/feeds", json={"url": blog, "category_name": "Reading"})
    assert r.status_code == 201, r.text
    feed = r.json()
    assert feed["title"] == "Fictional Blog" and feed["status"] == "active" and feed["total"] == 5 and feed["unread"] == 5
    assert feed["icon_url"] and feed["last_success_at"]
    lib = user.get("/api/library").json()
    assert lib["categories"][0]["name"] == "Reading" and lib["categories"][0]["unread"] == 5


def test_add_feed_rejects_non_feeds_and_unreachable(user, web):
    web.set("https://notfeed.example.test/", "<html><body>hello</body></html>", content_type="text/html")
    r = user.post("/api/feeds", json={"url": "https://notfeed.example.test/"})
    assert r.status_code == 422 and "feed" in r.json()["detail"].lower()
    assert user.post("/api/feeds", json={"url": "https://nowhere.example.test/feed"}).status_code == 422  # 404
    web.set("https://down.example.test/feed", "boom", status=503)
    assert user.post("/api/feeds", json={"url": "https://down.example.test/feed"}).status_code == 502
    assert user.get("/api/library").json()["totals"]["feeds"] == 0


def test_add_feed_autodiscovers_from_site_url(user, web):
    web.set("https://site.example.test/", '<html><head><link rel="alternate" type="application/rss+xml" href="/rss.xml"></head></html>', content_type="text/html")
    web.set("https://site.example.test/rss.xml", fx.rss2("Discovered", fx.generated_entries("Discovered", 2), link="https://site.example.test/"))
    r = user.post("/api/feeds", json={"url": "site.example.test"})
    assert r.status_code == 201 and r.json()["url"] == "https://site.example.test/rss.xml"


def test_duplicate_feed_is_rejected_even_with_url_variations(user, blog):
    assert user.post("/api/feeds", json={"url": blog}).status_code == 201
    assert user.post("/api/feeds", json={"url": blog.upper().replace("HTTPS", "https").replace("BLOG.EXAMPLE.TEST", "blog.example.test") + "#top"}).status_code in (409, 422)
    assert user.post("/api/feeds", json={"url": blog}).status_code == 409


def test_edit_title_category_and_delete_cascades(user, blog):
    fid = user.post("/api/feeds", json={"url": blog}).json()["id"]
    cat = user.post("/api/categories", json={"name": "Tools"}).json()
    r = user.patch(f"/api/feeds/{fid}", json={"custom_title": "My Blog", "category_id": cat["id"]}).json()
    assert r["title"] == "My Blog" and r["category_id"] == cat["id"]
    item = user.get("/api/items").json()["items"][0]
    user.patch(f"/api/items/{item['id']}", json={"is_bookmarked": True, "is_read": True})
    assert user.delete(f"/api/feeds/{fid}").json()["items_removed"] == 5
    with SessionLocal() as db:
        assert db.scalar(select(Item).where(Item.feed_id == fid)) is None
    assert user.get("/api/library").json()["totals"]["saved"] == 0


def test_feeds_are_private_between_users(user, other, blog):
    fid = user.post("/api/feeds", json={"url": blog}).json()["id"]
    iid = user.get("/api/items").json()["items"][0]["id"]
    assert other.get("/api/library").json()["totals"]["feeds"] == 0
    assert other.get("/api/items").json()["items"] == []
    assert other.delete(f"/api/feeds/{fid}").status_code == 404
    assert other.patch(f"/api/feeds/{fid}", json={"custom_title": "x"}).status_code == 404
    assert other.get(f"/api/items/{iid}").status_code == 404
    assert other.post(f"/api/feeds/{fid}/refresh").status_code == 404
    assert other.post("/api/items/mark-read", json={"scope": "feed", "feed_id": fid}).status_code == 404


def test_ssrf_private_addresses_blocked(user, web):
    config.ALLOW_PRIVATE_HOSTS = False
    for url in ("http://127.0.0.1:8000/feed", "http://localhost/feed", "http://169.254.169.254/latest/meta-data", "ftp://example.com/feed", "http://[::1]/feed"):
        r = user.post("/api/feeds", json={"url": url})
        assert r.status_code in (422, 502), (url, r.text)
        assert web.hits.get(url, 0) == 0


# ----------------------------------------------------------------------------- refresh / health


def test_refresh_adds_only_new_items_and_preserves_state(user, web, blog):
    fid = user.post("/api/feeds", json={"url": blog}).json()["id"]
    first = user.get("/api/items").json()["items"][0]
    user.patch(f"/api/items/{first['id']}", json={"is_read": True, "is_bookmarked": True})
    entries = fx.generated_entries("Fictional Blog", 5)
    entries.insert(0, {"title": "Brand new post", "link": "https://blog.example.test/posts/new", "guid": "new-1", "date": fx.rfc822(fx.now()), "description": "fresh"})
    entries[1]["title"] = "Edited title"  # same guid, edited text
    web.set(blog, fx.rss2("Fictional Blog", entries))
    result = user.post(f"/api/feeds/{fid}/refresh").json()
    assert result["new_items"] == 1 and result["error"] is None
    items = user.get("/api/items?limit=100").json()
    assert items["total"] == 6  # no duplicates
    edited = next(i for i in items["items"] if i["id"] == first["id"])
    assert edited["title"] == "Edited title" and edited["is_read"] and edited["is_bookmarked"]


def test_conditional_get_uses_etag(user, web, blog):
    web.set(blog, fx.rss2("Fictional Blog", fx.generated_entries("Fictional Blog", 3)), headers={"etag": '"v1"'})
    fid = user.post("/api/feeds", json={"url": blog}).json()["id"]
    r = user.post(f"/api/feeds/{fid}/refresh").json()
    assert r["not_modified"] is True and r["new_items"] == 0 and r["feed"]["status"] == "active"


def test_failure_marks_error_keeps_last_success_and_backs_off(user, web, blog):
    fid = user.post("/api/feeds", json={"url": blog}).json()["id"]
    good = user.get("/api/library").json()["feeds"][0]["last_success_at"]
    web.set(blog, "oops", status=500)
    r = user.post(f"/api/feeds/{fid}/refresh").json()
    assert r["error"] and r["feed"]["status"] == "error" and r["feed"]["error_kind"] == "temporary"
    assert r["feed"]["last_success_at"] == good and r["feed"]["total"] == 5  # old content stays readable
    assert r["feed"]["next_retry_at"]
    # Bulk refresh respects the backoff window; a manual retry (force) does not.
    bulk = user.post("/api/feeds/refresh").json()
    assert bulk["skipped"] == 1 and bulk["checked"] == 0
    web.set(blog, fx.rss2("Fictional Blog", fx.generated_entries("Fictional Blog", 5)))
    healed = user.post(f"/api/feeds/{fid}/refresh").json()
    assert healed["feed"]["status"] == "active" and healed["feed"]["error"] is None


def test_backoff_doubles_and_repeated_404_becomes_permanent(user, web, blog):
    fid = user.post("/api/feeds", json={"url": blog}).json()["id"]
    web.set(blog, "gone", status=404)
    delays = []
    for _ in range(3):
        feed = user.post(f"/api/feeds/{fid}/refresh").json()["feed"]
        delays.append(feed["next_retry_at"])
    assert feed["error_kind"] == "permanent" and "not found" in feed["error"].lower()
    assert service.backoff_delay(1) == timedelta(minutes=5) and service.backoff_delay(3) == timedelta(minutes=20)
    assert service.backoff_delay(50) == timedelta(hours=24)


def test_slow_feed_does_not_block_others(user, web, blog):
    import httpx

    original = web.handler

    def handler(request):
        if "slow" in str(request.url):
            raise httpx.ReadTimeout("slow", request=request)
        return original(request)

    fetcher.set_transport(httpx.MockTransport(handler))
    web.set("https://slow.example.test/feed", fx.rss2("Slow", fx.generated_entries("Slow", 2)))
    with SessionLocal() as db:
        owner = db.scalar(select(User).where(User.email == "reader@example.com"))
        for url in (blog, "https://slow.example.test/feed"):
            db.add(Feed(user_id=owner.id, url=url, title=url))
        db.commit()
    summary = user.post("/api/feeds/refresh").json()
    assert summary["checked"] == 2 and summary["errors"] == 1 and summary["new_items"] == 5
    states = {f["url"]: f for f in user.get("/api/library").json()["feeds"]}
    assert states["https://slow.example.test/feed"]["status"] == "error" and "longer than" in states["https://slow.example.test/feed"]["error"]
    assert states[blog]["status"] == "active"


def test_permanent_redirect_updates_stored_url(user, web, blog):
    new = "https://moved.example.test/feed.xml"
    web.set(blog, "", status=301, headers={"location": new})
    web.set(new, fx.rss2("Moved", fx.generated_entries("Moved", 2)))
    fid = user.post("/api/feeds", json={"url": blog}).json()["id"]
    feed = next(f for f in user.get("/api/library").json()["feeds"] if f["id"] == fid)
    assert feed["url"] == new


def test_stale_status_after_30_days(user, web):
    old = fx.now() - timedelta(days=45)
    web.set("https://quiet.example.test/feed", fx.rss2("Quiet", [{"title": "Old post", "link": "https://quiet.example.test/1", "date": fx.rfc822(old), "description": "x"}]))
    r = user.post("/api/feeds", json={"url": "https://quiet.example.test/feed"}).json()
    assert r["status"] == "stale"
    assert user.get("/api/library").json()["health"] == {"active": 0, "stale": 1, "error": 0}


def test_retention_keeps_newest_and_all_bookmarks(user, web, monkeypatch):
    monkeypatch.setattr(config, "MAX_ITEMS_PER_FEED", 5)
    web.set("https://many.example.test/feed", fx.rss2("Many", fx.generated_entries("Many", 4)))
    fid = user.post("/api/feeds", json={"url": "https://many.example.test/feed"}).json()["id"]
    oldest = user.get("/api/items?sort=oldest&limit=1").json()["items"][0]
    user.patch(f"/api/items/{oldest['id']}", json={"is_bookmarked": True})
    web.set("https://many.example.test/feed", fx.rss2("Many", [{**e, "guid": "n" + e["guid"], "link": e["link"] + "n"} for e in fx.generated_entries("Many", 10, hours_apart=0.1)]))
    user.post(f"/api/feeds/{fid}/refresh")
    items = user.get("/api/items?limit=100").json()
    assert items["total"] <= 6 and any(i["id"] == oldest["id"] for i in items["items"])


# ----------------------------------------------------------------------------- categories


def test_category_crud_reorder_and_delete_reassigns(user, blog, web):
    web.set("https://two.example.test/feed", fx.rss2("Two", fx.generated_entries("Two", 2)))
    a = user.post("/api/categories", json={"name": "Alpha"}).json()
    b = user.post("/api/categories", json={"name": "Beta"}).json()
    assert user.post("/api/categories", json={"name": "alpha"}).status_code == 409
    assert user.patch(f"/api/categories/{b['id']}", json={"name": "Alpha"}).status_code == 409
    assert user.patch(f"/api/categories/{b['id']}", json={"name": "Bravo"}).json()["name"] == "Bravo"
    f1 = user.post("/api/feeds", json={"url": blog, "category_id": a["id"]}).json()
    f2 = user.post("/api/feeds", json={"url": "https://two.example.test/feed", "category_id": a["id"]}).json()
    assert user.put("/api/categories/order", json={"ids": [b["id"], a["id"]]}).status_code == 200
    assert [c["name"] for c in user.get("/api/library").json()["categories"]] == ["Bravo", "Alpha"]
    assert user.put("/api/categories/order", json={"ids": [a["id"]]}).status_code == 400
    moved = user.delete(f"/api/categories/{a['id']}?move_to={b['id']}").json()
    assert moved["feeds_moved"] == 2
    assert {f["category_id"] for f in user.get("/api/library").json()["feeds"]} == {b["id"]}
    gone = user.delete(f"/api/categories/{b['id']}").json()
    assert gone["moved_to"] == "Uncategorized"
    lib = user.get("/api/library").json()
    assert lib["uncategorized"]["feed_count"] == 2 and f1["id"] and f2["id"]


def test_cannot_use_another_users_category(user, other):
    cat = other.post("/api/categories", json={"name": "Private"}).json()
    assert user.patch(f"/api/categories/{cat['id']}", json={"name": "x"}).status_code == 404
    assert user.delete(f"/api/categories/{cat['id']}").status_code == 404
    assert user.post("/api/feeds", json={"url": "https://x.test/f", "category_id": cat["id"]}).status_code == 404


# ----------------------------------------------------------------------------- items


def _seed_two_feeds(user, web):
    web.set("https://one.example.test/feed", fx.rss2("One", fx.generated_entries("One", 5)))
    web.set("https://two.example.test/feed", fx.rss2("Two", fx.generated_entries("Two", 5)))
    cat = user.post("/api/categories", json={"name": "Group"}).json()
    f1 = user.post("/api/feeds", json={"url": "https://one.example.test/feed", "category_id": cat["id"]}).json()
    f2 = user.post("/api/feeds", json={"url": "https://two.example.test/feed"}).json()
    return cat, f1, f2


def test_items_sorted_filtered_and_counted(user, web):
    cat, f1, f2 = _seed_two_feeds(user, web)
    everything = user.get("/api/items?limit=100").json()
    assert everything["total"] == 10
    dates = [i["published_at"] for i in everything["items"]]
    assert dates == sorted(dates, reverse=True)
    assert all(i["feed_title"] and "feed_icon" in i for i in everything["items"])
    assert user.get(f"/api/items?feed_id={f1['id']}").json()["total"] == 5
    assert {i["feed_id"] for i in user.get(f"/api/items?category_id={cat['id']}").json()["items"]} == {f1["id"]}
    assert {i["feed_id"] for i in user.get("/api/items?uncategorized=true").json()["items"]} == {f2["id"]}
    oldest = user.get("/api/items?sort=oldest&limit=100").json()["items"]
    assert [i["published_at"] for i in oldest] == sorted(i["published_at"] for i in oldest)


def test_cursor_pagination_has_no_gaps_or_dupes(user, web):
    _seed_two_feeds(user, web)
    seen, cursor = [], None
    while True:
        page = user.get("/api/items?limit=3" + (f"&cursor={cursor}" if cursor else "")).json()
        seen += [i["id"] for i in page["items"]]
        cursor = page["next_cursor"]
        if not cursor:
            break
    assert len(seen) == 10 == len(set(seen))
    assert user.get("/api/items?cursor=garbage").status_code == 400


def test_search_highlights_candidates_and_filters(user, web):
    cat, f1, f2 = _seed_two_feeds(user, web)
    hits = user.get("/api/items?q=fictional article 3").json()
    assert hits["total"] == 2
    assert user.get(f"/api/items?q=article&feed_id={f1['id']}").json()["total"] == 5
    assert user.get("/api/items?q=zzzznothing").json() == {"items": [], "next_cursor": None, "total": 0}
    assert user.get("/api/items?q=100%25").json()["total"] == 0  # LIKE wildcards are escaped
    assert user.get("/api/items?q=%25").json()["total"] == 0
    day = fx.now().date().isoformat()
    assert user.get(f"/api/items?since={day}&until={day}").json()["total"] >= 1
    assert user.get("/api/items?since=2001-01-01&until=2001-01-02").json()["total"] == 0
    assert user.get("/api/items?since=nope").status_code == 400


def test_read_unread_and_mark_all(user, web):
    cat, f1, f2 = _seed_two_feeds(user, web)
    item = user.get("/api/items?limit=1").json()["items"][0]
    assert user.patch(f"/api/items/{item['id']}", json={"is_read": True}).json()["is_read"] is True
    assert user.get("/api/library").json()["totals"]["unread"] == 9
    assert user.patch(f"/api/items/{item['id']}", json={"is_read": False}).json()["is_read"] is False
    assert user.post("/api/items/mark-read", json={"scope": "feed", "feed_id": f1["id"]}).json()["updated"] == 5
    lib = user.get("/api/library").json()
    assert lib["totals"]["unread"] == 5 and lib["categories"][0]["unread"] == 0 and lib["uncategorized"]["unread"] == 5
    assert user.get("/api/items?unread_only=true").json()["total"] == 5
    assert user.post("/api/items/mark-read", json={"scope": "category", "category_id": cat["id"], "read": False}).json()["updated"] == 5
    assert user.post("/api/items/mark-read", json={"scope": "all"}).json()["updated"] == 10
    assert user.get("/api/library").json()["totals"]["unread"] == 0
    assert user.post("/api/items/mark-read", json={"scope": "feed"}).status_code == 400


def test_bookmarks_saved_view_sort_and_search(user, web):
    _seed_two_feeds(user, web)
    items = user.get("/api/items?limit=10").json()["items"]
    for pos in (2, 0, 5):
        user.patch(f"/api/items/{items[pos]['id']}", json={"is_bookmarked": True})
    saved = user.get("/api/items?scope=saved&sort=saved").json()
    assert saved["total"] == 3 and [i["id"] for i in saved["items"]] == [items[5]["id"], items[0]["id"], items[2]["id"]]
    by_pub = user.get("/api/items?scope=saved").json()["items"]
    assert [i["id"] for i in by_pub] == [items[0]["id"], items[2]["id"], items[5]["id"]]
    assert user.get("/api/library").json()["totals"]["saved"] == 3
    q = items[0]["title"].split(":")[0]
    assert user.get(f"/api/items?scope=saved&q={q}").json()["total"] >= 1
    user.patch(f"/api/items/{items[0]['id']}", json={"is_bookmarked": False})
    assert user.get("/api/library").json()["totals"]["saved"] == 2


def test_reader_view_content_is_sanitised(user, web):
    web.set("https://evil.example.test/feed", fx.rss2("Evil", [{"title": "x", "link": "https://evil.example.test/1", "description": "d", "content": "<p>safe</p><script>steal()</script><img src=x onerror=alert(1)>" + "<p>long body</p>" * 30}]))
    user.post("/api/feeds", json={"url": "https://evil.example.test/feed"})
    item = user.get("/api/items").json()["items"][0]
    full = user.get(f"/api/items/{item['id']}").json()
    assert "<p>safe</p>" in full["content_html"] and "script" not in full["content_html"] and "onerror" not in full["content_html"]
    assert "content_html" not in item  # list payload stays light


# ----------------------------------------------------------------------------- OPML


def test_opml_preview_and_import_sample_file(user, web):
    data = SAMPLE_OPML.read_bytes()
    prev = user.post("/api/opml/preview", files={"file": ("sample.opml", data, "text/x-opml")}).json()
    assert prev["summary"]["new"] >= 19 and prev["summary"]["duplicate"] >= 1
    res = user.post("/api/opml/import", files={"file": ("sample.opml", data, "text/x-opml")}).json()
    assert res["summary"]["added"] == 19
    assert any("not found" in f["reason"].lower() or "404" in f["reason"] for f in res["failed"]), res["failed"]
    assert res["summary"]["duplicates"] >= 1
    lib = user.get("/api/library").json()
    assert lib["totals"]["feeds"] == 19
    assert {"Frontend", "Design", "Backend & DevOps", "General Tech", "AI & ML"} <= {c["name"] for c in lib["categories"]}
    again = user.post("/api/opml/import", files={"file": ("sample.opml", data, "text/x-opml")}).json()
    assert again["summary"]["added"] == 0


def test_opml_rejects_non_opml(user):
    r = user.post("/api/opml/preview", files={"file": ("x.opml", b"<html><body>no</body></html>", "text/xml")})
    assert r.status_code == 422
    assert user.post("/api/opml/preview", files={"file": ("x.opml", b"\x00\x01garbage", "text/xml")}).status_code == 422


def test_opml_variants_are_handled():
    from app import opml

    xml = b"""<?xml version="1.0"?><opml version="2.0"><body>
      <outline text="Top"><outline text="Nested"><outline text="Deep One" xmlurl="https://d.test/feed"/></outline></outline>
      <outline text="No type" xmlUrl="https://n.test/feed"/><outline xmlUrl="https://m.test/feed"/><outline text="Folder only"/></body></opml>"""
    entries = opml.parse_opml(xml)
    urls = {e.url: e for e in entries}
    assert urls["https://d.test/feed"].category == "Nested"
    assert "https://n.test/feed" in urls and "https://m.test/feed" in urls
    assert any(e.problem for e in entries)


def test_opml_export_roundtrips_categories(user, web):
    _seed_two_feeds(user, web)
    xml = user.get("/api/opml/export")
    assert xml.status_code == 200 and "attachment" in xml.headers["content-disposition"]
    from app import opml

    entries = {e.url: e.category for e in opml.parse_opml(xml.content)}
    assert entries == {"https://one.example.test/feed": "Group", "https://two.example.test/feed": None}


# ----------------------------------------------------------------------------- prefs / digest / discovery


def test_preferences_persist_and_validate(user):
    r = user.put("/api/prefs", json={"layout": "cards", "refresh_minutes": 15, "reader": {"font_size": 99}}).json()["prefs"]
    assert r["layout"] == "cards" and r["refresh_minutes"] == 15 and r["reader"]["font_size"] == 28
    assert user.get("/api/auth/me").json()["prefs"]["layout"] == "cards"
    assert user.put("/api/prefs", json={"layout": "huge"}).status_code == 422
    assert user.put("/api/prefs", json={"refresh_minutes": 7}).status_code == 422
    user.put("/api/prefs", json={"category_layouts": {"3": "compact"}})
    assert user.get("/api/auth/me").json()["prefs"]["category_layouts"] == {"3": "compact"}


def test_digest_caps_per_source_ranks_and_explains(user, web):
    for n in range(4):
        web.set(f"https://busy{n}.example.test/feed", fx.rss2(f"Busy{n}", fx.generated_entries(f"Busy{n}", 8, hours_apart=1)))
        user.post("/api/feeds", json={"url": f"https://busy{n}.example.test/feed"})
    web.set("https://rare.example.test/feed", fx.rss2("Rare", fx.generated_entries("Rare", 1)))
    user.post("/api/feeds", json={"url": "https://rare.example.test/feed"})
    d = user.get("/api/digest?window=24h").json()
    flat = [i for g in d["groups"] for i in g["items"]]
    assert d["shown"] == len(flat) <= 12 and d["total_new"] > d["shown"] and d["remaining"] == d["total_new"] - d["shown"]
    from collections import Counter

    assert max(Counter(i["feed_id"] for i in flat).values()) <= 2
    rare = next(i for i in flat if i["feed_title"] == "Rare")
    assert rare["reason"] == "Only new post from this source" and flat.index(rare) < 5
    assert all(i["reason"] for i in flat)
    user.post("/api/items/mark-read", json={"scope": "all"})
    assert user.get("/api/digest?window=24h").json()["shown"] == 0


def test_starter_packs_and_follow(user, web):
    packs = user.get("/api/discover/packs").json()["packs"]
    assert [p["name"] for p in packs] == ["Frontend", "Design", "Backend & DevOps", "General Tech", "AI & ML"]
    res = user.post(f"/api/discover/packs/{packs[4]['id']}/follow", json={}).json()
    assert len(res["added"]) == 2 and res["category"] == "AI & ML"
    after = user.get("/api/discover/packs").json()["packs"][4]
    assert after["followed_count"] == 2
    assert user.post("/api/discover/packs/nope/follow", json={}).status_code == 404
    assert user.get("/api/auth/me").json()["user"]["onboarded"] is True


def test_lookup_by_url_and_by_name(user, web):
    web.set("https://findme.example.test/", '<html><head><link rel="alternate" type="application/atom+xml" href="/feed.atom"></head></html>', content_type="text/html")
    web.set("https://findme.example.test/feed.atom", fx.atom("Find Me", [{"title": "t", "link": "https://findme.example.test/1", "date": fx.now().isoformat(), "summary": "s"}]), content_type="application/atom+xml")
    r = user.post("/api/discover/lookup", json={"query": "findme.example.test"}).json()["results"]
    assert r[0]["url"] == "https://findme.example.test/feed.atom" and r[0]["title"] == "Find Me"
    names = user.post("/api/discover/lookup", json={"query": "figma"}).json()["results"]
    assert names and names[0]["title"] == "Figma Blog"


def test_rate_limit_on_login(web):
    config.RATE_LIMIT_ENABLED = True
    try:
        c = signup("rl@example.com")
        codes = [c.post("/api/auth/login", json={"email": "rl@example.com", "password": "bad-password-1"}).status_code for _ in range(12)]
        assert 429 in codes
    finally:
        config.RATE_LIMIT_ENABLED = False


def test_health_and_spa_routes(client):
    assert client.get("/api/health").json()["status"] == "ok"
    assert client.get("/api/nope").status_code == 404
    assert client.get("/api/library").headers["cache-control"] == "no-store"
