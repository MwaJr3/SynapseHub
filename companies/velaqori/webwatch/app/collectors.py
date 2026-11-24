"""Retrieval adapters: file fixtures first; HTTP adapter is opt-in and bounded.

Conditional GET support (ETag/Last-Modified) avoids re-downloading unchanged
resources — documented, tested with a fake transport.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from .policy import PolicyError, SourcePolicy, check_allowed


class CollectError(ValueError):
    pass


@dataclass
class Page:
    url: str
    fetched_at: str
    body: str
    etag: str = ""
    last_modified: str = ""
    from_cache: bool = False


@dataclass
class FixtureTransport:
    """Deterministic transport for demos/tests: maps URLs to local files."""
    fixtures_dir: str
    etags: dict[str, str] = field(default_factory=dict)

    def fetch(self, url: str, etag: str = "", last_modified: str = "") -> Page:
        from datetime import datetime, timezone
        key = url.replace("://", ":_").replace("/", "_")
        path = Path(self.fixtures_dir) / f"{key}.html"
        if not path.exists():
            raise CollectError(f"No fixture for {url} (fixture transport is offline).")
        current_etag = self.etags.get(url, key)
        if etag and etag == current_etag:
            return Page(url, datetime.now(timezone.utc).isoformat(), "", current_etag, last_modified, from_cache=True)
        return Page(url, datetime.now(timezone.utc).isoformat(), path.read_text(), current_etag, last_modified)


class HttpTransport:
    """Bounded HTTP transport (explicit opt-in; timeouts; no auth bypasses)."""
    def __init__(self, timeout: float = 8.0, user_agent: str = "webwatch/0.1 (+local research tool)") -> None:
        self.timeout = timeout
        self.user_agent = user_agent

    def fetch(self, url: str, etag: str = "", last_modified: str = "") -> Page:
        import urllib.error
        import urllib.parse
        import urllib.request
        from datetime import datetime, timezone
        headers = {"User-Agent": self.user_agent}
        if etag:
            headers["If-None-Match"] = etag
        if last_modified:
            headers["If-Modified-Since"] = last_modified
        if urllib.parse.urlparse(url).scheme not in ("http", "https"):
            raise CollectError(f"Refusing non-HTTP(S) URL: {url}")
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:  # nosec B310 - scheme checked above
                body = resp.read(512_000).decode("utf-8", "replace")   # bounded read (512 KB)
                return Page(url, datetime.now(timezone.utc).isoformat(), body,
                            resp.headers.get("ETag", ""), resp.headers.get("Last-Modified", ""))
        except urllib.error.HTTPError as exc:
            if exc.code == 304:
                return Page(url, datetime.now(timezone.utc).isoformat(), "", etag, last_modified, from_cache=True)
            raise CollectError(f"HTTP {exc.code} for {url}") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            raise CollectError(f"Fetch failed for {url}: {type(exc).__name__}") from exc


def extract_records(body: str, url: str) -> list[dict]:
    """Very small, explicit HTML record extractor (h2 titles + following text).
    Changing page structures are handled defensively: empty extraction is
    reported as schema drift, never as 'no change'."""
    import re
    from html.parser import HTMLParser

    class P(HTMLParser):
        def __init__(self):
            super().__init__()
            self.records = []
            self._capture = False
            self._buf: list[str] = []
            self._title = ""
        def handle_starttag(self, tag, attrs):
            if tag == "h2":
                self._capture = True; self._buf = []
        def handle_endtag(self, tag):
            if tag == "h2" and self._capture:
                self._title = "".join(self._buf).strip(); self._capture = False
            elif tag in ("p", "li") and self._title:
                self.records.append({"title": self._title, "snippet": "".join(self._buf).strip()[:200]})
                self._title = ""
        def handle_data(self, data):
            if self._capture or self._title:
                self._buf.append(data)

    parser = P()
    parser.feed(body)
    return parser.records
