# Engine module reused from apps/threatintel-desk (tested CLI engine) — behavior preserved.
"""Provider adapters with an explicit interface; external lookups are opt-in.

Rules (documented + tested):
- External lookups only run when explicitly configured AND the user passes
  --external. Everything defaults to the local dataset.
- Internal addresses and private URL hosts are REFUSED for external submission.
- API keys come from environment variables; never logged.
- Provider responses are recorded with provenance and retrieval time; an
  unavailable provider is represented explicitly as "unavailable", never as a
  clean result.
"""
from __future__ import annotations

import ipaddress
import json
import urllib.error
import urllib.request
from datetime import datetime, timezone
from dataclasses import dataclass, field
from urllib.parse import urlparse

from .indicators import Indicator


class ProviderError(ValueError):
    pass


@dataclass
class Verdict:
    provider: str
    indicator: str
    result: str            # known-malicious | suspicious | benign-lookups | no-data | unavailable
    detail: str
    retrieved_at: str
    cached: bool = False


class Provider:
    name = "base"

    def lookup(self, indicator: Indicator) -> Verdict:  # pragma: no cover - interface
        raise NotImplementedError


class LocalDatasetProvider(Provider):
    """Bundled, documented synthetic intelligence dataset (demo data)."""
    name = "local-synthetic"

    def __init__(self, path: str) -> None:
        self.data = json.loads(open(path, encoding="utf-8").read())

    def lookup(self, indicator: Indicator) -> Verdict:
        row = self.data.get(indicator.value)
        now = datetime.now(timezone.utc).isoformat()
        if not row:
            return Verdict(self.name, indicator.value, "no-data",
                           "Not present in the synthetic local dataset (this is not a clearance).", now)
        return Verdict(self.name, indicator.value, row["result"], row["detail"], now)


def _is_private(indicator: Indicator) -> bool:
    if indicator.kind == "ip":
        return ipaddress.ip_address(indicator.value).is_private
    if indicator.kind == "url":
        host = urlparse(indicator.value).hostname or ""
        try:
            return ipaddress.ip_address(host).is_private
        except ValueError:
            return host in {"localhost", "intranet", "internal"}
    return False


class HttpReputationProvider(Provider):
    """Generic HTTP JSON reputation adapter (opt-in; keyed via environment)."""
    name = "http-reputation"

    def __init__(self, base_url: str, api_key: str = "", timeout: float = 8.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

    def lookup(self, indicator: Indicator) -> Verdict:
        if _is_private(indicator):
            raise ProviderError(
                "Refusing to submit internal/private indicators to an external service.")
        now = datetime.now(timezone.utc).isoformat()
        url = f"{self.base_url}/lookup/{indicator.kind}/{indicator.value}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {self.api_key}"} if self.api_key else {})
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode())
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            return Verdict(self.name, indicator.value, "unavailable",
                           f"Provider could not be consulted: {type(exc).__name__}", now)
        result = str(data.get("result", "no-data"))
        return Verdict(self.name, indicator.value, result, str(data.get("detail", "")), now)
