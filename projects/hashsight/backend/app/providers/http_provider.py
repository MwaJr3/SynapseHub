"""Opt-in external reputation adapter (hash lookups only).

Design rules:
- The file itself is NEVER uploaded — only the digest, and only when the user
  explicitly confirms the lookup AND an external provider is configured.
- Failures map to UNAVAILABLE with the error recorded; they never invent data.
"""
from __future__ import annotations

from datetime import datetime, timezone

from .base import ProviderError, ProviderResult


class ExternalProvider:
    name = "external-provider"

    def __init__(self, base_url: str, api_key: str, timeout: float = 8.0) -> None:
        if not base_url or not api_key:
            raise ProviderError("external provider requires base_url and api_key configuration")
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

    def lookup(self, digest: str) -> ProviderResult:
        import urllib.error
        import urllib.request
        now = datetime.now(timezone.utc).isoformat()
        req = urllib.request.Request(
            f"{self.base_url}/reports/{digest}",
            headers={"x-apikey": self.api_key, "User-Agent": "HashSight/0.1"})
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                import json
                payload = json.loads(resp.read(200_000).decode("utf-8", "replace"))
            positives = payload.get("last_analysis_stats", {}).get("malicious")
            total = sum(payload.get("last_analysis_stats", {}).values()) or None
            verdict = "KNOWN_MALICIOUS" if (positives or 0) > 0 else "NO_KNOWN_DETECTION"
            return ProviderResult(self.name, verdict, positives, total, now,
                                  f"provider response parsed at {now}")
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                return ProviderResult(self.name, "UNKNOWN", None, None, now,
                                      "provider has no record for this digest")
            return ProviderResult(self.name, "UNAVAILABLE", None, None, now,
                                  f"HTTP {exc.code}", available=False, error=f"HTTP {exc.code}")
        except (urllib.error.URLError, TimeoutError) as exc:
            return ProviderResult(self.name, "UNAVAILABLE", None, None, now,
                                  "provider unreachable", available=False, error=str(exc)[:200])
