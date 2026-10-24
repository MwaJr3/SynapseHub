"""Target policy: offline fixtures by default; live checks are scoped and opt-in."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse


class TargetError(ValueError):
    pass


@dataclass
class ResponseDump:
    url: str
    status: int
    headers: dict[str, str]
    redirects: list[str]


def load_fixture(path: str | Path) -> ResponseDump:
    data = json.loads(Path(path).read_text())
    try:
        return ResponseDump(str(data["url"]), int(data["status"]),
                            {str(k): str(v) for k, v in dict(data["headers"]).items()},
                            [str(r) for r in data.get("redirects", [])])
    except (KeyError, TypeError, ValueError) as exc:
        raise TargetError(f"Malformed response fixture {path}: {exc}") from exc


def assert_allowed(url: str, allowlist_path: str | Path) -> str:
    """Live targets must appear in an explicit allowlist file. Anything else is
    refused — the tool never crawls or scans unrelated sites."""
    allowed = [line.strip() for line in Path(allowlist_path).read_text().splitlines()
               if line.strip() and not line.startswith("#")]
    host = (urlparse(url).hostname or "").lower()
    if not host:
        raise TargetError(f"Cannot parse target URL {url!r}.")
    for entry in allowed:
        entry_host = (urlparse(entry if "://" in entry else f"https://{entry}").hostname or entry).lower()
        if host == entry_host or host.endswith("." + entry_host):
            return host
    raise TargetError(f"Target {host!r} is not in the allowlist {allowlist_path}. "
                      "Scoped authorization is required before any live check.")
