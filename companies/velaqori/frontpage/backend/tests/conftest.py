"""Isolated database + an in-memory fake web for feeds. No test touches the network."""
from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

_tmp = tempfile.mkdtemp(prefix="frontpage-tests-")
os.environ["FRONTPAGE_DATA_DIR"] = _tmp
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["FRONTPAGE_SKIP_WARM"] = "1"
os.environ["FRONTPAGE_RATE_LIMIT"] = "0"
os.environ["FRONTPAGE_HOST_MIN_INTERVAL"] = "0"
os.environ["FRONTPAGE_ALLOW_PRIVATE_HOSTS"] = "1"
os.environ["FRONTPAGE_DEV_EXPOSE_RESET"] = "1"

import httpx  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import config, fetcher, security  # noqa: E402
from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402

from . import feedfixtures as fx  # noqa: E402

SAMPLE = json.loads(Path(config.SAMPLE_FEEDS_PATH).read_text())


class FakeWeb:
    """Routes URL -> response; honours ETag/If-None-Match and counts hits."""

    def __init__(self) -> None:
        self.routes: dict[str, dict] = {}
        self.hits: dict[str, int] = {}

    def set(self, url: str, body: bytes | str = b"", *, status: int = 200, headers: dict | None = None, content_type: str = "application/rss+xml") -> None:
        data = body.encode() if isinstance(body, str) else body
        self.routes[url] = {"body": data, "status": status, "headers": headers or {}, "ct": content_type}

    def handler(self, request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        self.hits[url] = self.hits.get(url, 0) + 1
        route = self.routes.get(url)
        if route is None:
            return httpx.Response(404, text="not found")
        headers = {"content-type": route["ct"], **route["headers"]}
        etag = headers.get("etag")
        if etag and request.headers.get("if-none-match") == etag:
            return httpx.Response(304, headers=headers)
        if route["status"] in (301, 302, 307, 308):
            return httpx.Response(route["status"], headers=headers)
        return httpx.Response(route["status"], content=route["body"], headers=headers)


@pytest.fixture(autouse=True)
def db_reset():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    security.limiter.reset()
    config.ALLOW_PRIVATE_HOSTS = True
    yield


@pytest.fixture()
def web():
    fake = FakeWeb()
    for group in SAMPLE["categories"]:
        for feed in group["feeds"]:
            entries = fx.generated_entries(feed["title"], 6)
            if feed.get("format") == "atom":
                atom_entries = [{"title": e["title"], "link": e["link"], "id": e["guid"], "date": fx.now().isoformat(), "author": e["author"], "summary": e["description"], "content": e["content"]} for e in entries]
                fake.set(feed["feedUrl"], fx.atom(feed["title"], atom_entries, link=feed["siteUrl"]), content_type="application/atom+xml")
            else:
                fake.set(feed["feedUrl"], fx.rss2(feed["title"], entries, link=feed["siteUrl"]))
    fetcher.set_transport(httpx.MockTransport(fake.handler))
    yield fake
    fetcher.set_transport(None)


@pytest.fixture()
def client(web):
    with TestClient(app) as c:
        yield c


def signup(email: str = "reader@example.com", password: str = "correct-horse-1") -> TestClient:
    c = TestClient(app)
    r = c.post("/api/auth/register", json={"email": email, "password": password, "display_name": email.split("@")[0]})
    assert r.status_code == 200, r.text
    return c


@pytest.fixture()
def user(web) -> TestClient:
    return signup("reader@example.com")


@pytest.fixture()
def other(web) -> TestClient:
    return signup("other@example.com")


@pytest.fixture()
def blog(web):
    """One fictional RSS feed at a known URL."""
    url = "https://blog.example.test/feed.xml"
    web.set(url, fx.rss2("Fictional Blog", fx.generated_entries("Fictional Blog", 5), link="https://blog.example.test/"))
    return url
