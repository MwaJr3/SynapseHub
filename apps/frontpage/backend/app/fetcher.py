"""HTTP fetching with SSRF protection, redirects, conditional requests and per-host politeness."""
from __future__ import annotations

import ipaddress
import socket
import threading
import time
from dataclasses import dataclass
from urllib.parse import urljoin, urlparse

import httpx

from . import config


class FetchError(Exception):
    """A fetch failed. ``permanent`` marks errors that retrying will not fix."""

    def __init__(self, message: str, *, permanent: bool = False, status: int | None = None):
        super().__init__(message)
        self.permanent = permanent
        self.status = status


@dataclass
class FetchResult:
    not_modified: bool
    body: bytes
    final_url: str
    permanent_redirect_url: str | None
    etag: str | None
    last_modified: str | None
    content_type: str | None


# Tests (and nothing else) replace this to serve fixtures without the network.
_transport: httpx.BaseTransport | None = None


def set_transport(transport: httpx.BaseTransport | None) -> None:
    global _transport
    _transport = transport


def assert_public_url(url: str) -> None:
    """Reject non-http(s) URLs and hosts that resolve to private/loopback/link-local space."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise FetchError("Only http:// and https:// URLs can be added.", permanent=True)
    if config.ALLOW_PRIVATE_HOSTS:
        return
    host = parsed.hostname
    try:
        infos = socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise FetchError(f"Could not resolve {host}.", permanent=False) from exc
    for info in infos:
        address = ipaddress.ip_address(info[4][0])
        if (
            address.is_private or address.is_loopback or address.is_link_local
            or address.is_multicast or address.is_reserved or address.is_unspecified
        ):
            raise FetchError("That address is not a public website.", permanent=True)


class _HostLimiter:
    """Spaces out requests to the same host so one refresh doesn't hammer a publisher."""

    def __init__(self) -> None:
        self._next: dict[str, float] = {}
        self._lock = threading.Lock()

    def wait(self, host: str) -> None:
        interval = config.HOST_MIN_INTERVAL_SECONDS
        if interval <= 0:
            return
        with self._lock:
            now = time.monotonic()
            slot = max(now, self._next.get(host, 0.0))
            self._next[host] = slot + interval
        delay = slot - now
        if delay > 0:
            time.sleep(min(delay, 5.0))


host_limiter = _HostLimiter()


def fetch(url: str, *, etag: str | None = None, last_modified: str | None = None) -> FetchResult:
    headers = {
        "User-Agent": config.USER_AGENT,
        "Accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, text/html;q=0.5, */*;q=0.3",
        "Accept-Encoding": "gzip, deflate",
    }
    if etag:
        headers["If-None-Match"] = etag
    if last_modified:
        headers["If-Modified-Since"] = last_modified

    current = url
    permanent_target: str | None = None
    chain_permanent = True
    timeout = httpx.Timeout(config.FETCH_TIMEOUT_SECONDS, connect=min(5.0, config.FETCH_TIMEOUT_SECONDS))
    try:
        with httpx.Client(timeout=timeout, follow_redirects=False, transport=_transport, headers=headers) as client:
            for _ in range(config.MAX_REDIRECTS + 1):
                assert_public_url(current)
                host_limiter.wait(urlparse(current).hostname or "")
                with client.stream("GET", current) as response:
                    if response.status_code in (301, 302, 303, 307, 308):
                        location = response.headers.get("location")
                        if not location:
                            raise FetchError("Redirect without a Location header.", permanent=False)
                        nxt = urljoin(current, location)
                        if response.status_code not in (301, 308):
                            chain_permanent = False
                        elif chain_permanent:
                            permanent_target = nxt
                        current = nxt
                        continue
                    if response.status_code == 304:
                        return FetchResult(True, b"", current, permanent_target, etag, last_modified, None)
                    if response.status_code in (404, 410):
                        raise FetchError(f"The feed was not found (HTTP {response.status_code}).", permanent=True, status=response.status_code)
                    if response.status_code in (401, 403):
                        raise FetchError(f"The publisher refused access (HTTP {response.status_code}).", permanent=False, status=response.status_code)
                    if response.status_code == 429:
                        raise FetchError("The publisher is rate limiting requests (HTTP 429).", status=429)
                    if response.status_code >= 400:
                        raise FetchError(f"The publisher returned HTTP {response.status_code}.", status=response.status_code)
                    chunks: list[bytes] = []
                    size = 0
                    for chunk in response.iter_bytes():
                        size += len(chunk)
                        if size > config.MAX_FEED_BYTES:
                            raise FetchError("The feed is larger than 5 MB.", permanent=True)
                        chunks.append(chunk)
                    return FetchResult(
                        False,
                        b"".join(chunks),
                        current,
                        permanent_target if permanent_target and permanent_target != url else None,
                        response.headers.get("etag"),
                        response.headers.get("last-modified"),
                        response.headers.get("content-type"),
                    )
            raise FetchError("Too many redirects.", permanent=False)
    except FetchError:
        raise
    except httpx.TimeoutException as exc:
        raise FetchError(f"The publisher took longer than {config.FETCH_TIMEOUT_SECONDS:.0f}s to respond.") from exc
    except httpx.TooManyRedirects as exc:  # pragma: no cover
        raise FetchError("Too many redirects.") from exc
    except httpx.HTTPError as exc:
        raise FetchError(f"Network error: {exc.__class__.__name__}.") from exc
