"""Deterministic demonstration provider. Clearly labelled demo data.

Never performs network access. Results are derived from the digest itself so
lookups are reproducible — and are DEMONSTRATION DATA, not real reputation.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from .base import ProviderError, ProviderResult


class DemoProvider:
    name = "demo-provider (simulated)"

    def __init__(self, fixtures: dict[str, dict] | None = None) -> None:
        # fixtures: digest -> {"verdict": ..., "detections": ...} for scripted demos
        self.fixtures = fixtures or {}

    def lookup(self, digest: str) -> ProviderResult:
        now = datetime.now(timezone.utc).isoformat()
        if digest in self.fixtures:
            fx = self.fixtures[digest]
            return ProviderResult(self.name, fx["verdict"], fx.get("detections"), fx.get("total"),
                                  now, f"fixture entry matched for {digest[:12]}… (DEMO DATA)")
        # Deterministic pseudo-result from the digest — simulation only.
        bucket = int(hashlib.sha256(digest.encode()).hexdigest()[:2], 16) % 10
        if bucket == 0:
            return ProviderResult(self.name, "KNOWN_MALICIOUS", 7, 62, now,
                                  "simulated detections (DEMO DATA — not real intelligence)")
        if bucket <= 3:
            return ProviderResult(self.name, "UNKNOWN", None, None, now,
                                  "simulated: hash not present in simulated corpus (DEMO DATA)")
        return ProviderResult(self.name, "NO_KNOWN_DETECTION", 0, 62, now,
                              "simulated clean report (DEMO DATA — 'no detection' is NOT 'safe')")
