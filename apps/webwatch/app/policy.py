"""Collection policy: robots/terms awareness, allowlist, rate limits, budgets.

Defaults are safe: collection only runs against explicitly allowed sources,
with bounded request counts. Anything that would require bypassing access
controls is out of scope and refused.
"""
from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser


class PolicyError(ValueError):
    pass


@dataclass(frozen=True)
class SourcePolicy:
    name: str
    base_url: str
    allowed: bool
    rate_limit_seconds: float = 2.0     # minimum delay between requests to this host
    max_pages_per_run: int = 25
    respect_robots: bool = True


def check_allowed(source: SourcePolicy, url: str) -> None:
    if not source.allowed:
        raise PolicyError(f"Source {source.name!r} is not marked as permitted.")
    host = urlparse(url).hostname or ""
    base_host = urlparse(source.base_url).hostname or ""
    if host != base_host:
        raise PolicyError(f"Refusing {host!r}: outside the source's permitted host {base_host!r}.")


def robots_allows(robots_txt: str, user_agent: str, url: str) -> bool:
    """Evaluate a robots.txt body (provided offline; never fetched implicitly)."""
    rp = RobotFileParser()
    rp.parse(robots_txt.splitlines())
    return rp.can_fetch(user_agent, url)
