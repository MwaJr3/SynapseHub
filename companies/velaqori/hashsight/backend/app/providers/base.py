"""Provider adapter interface + verdict normalization.

Verdict states (where source data permits): KNOWN_MALICIOUS, NO_KNOWN_DETECTION,
UNKNOWN, UNAVAILABLE, CONFLICTING. "No known detection" is never described as
"safe" anywhere in this application.
"""
from __future__ import annotations

from dataclasses import dataclass, field


class ProviderError(Exception):
    pass


VERDICTS = ("KNOWN_MALICIOUS", "NO_KNOWN_DETECTION", "UNKNOWN", "UNAVAILABLE", "CONFLICTING")

DISCLAIMER = ("No known detection does NOT prove a file is safe. A provider "
              "result is a point-in-time report about a hash, not a safety determination.")


@dataclass
class ProviderResult:
    provider: str
    verdict: str
    detections: int | None          # None when the provider reports no count
    total_engines: int | None
    looked_up_at: str
    raw_summary: str
    available: bool = True
    error: str = ""

    def __post_init__(self):
        if self.verdict not in VERDICTS:
            raise ProviderError(f"verdict must be one of {VERDICTS}")


def combine(results: list[ProviderResult]) -> str:
    """Cross-provider consensus with explicit conflict detection."""
    live = [r for r in results if r.available and r.verdict in ("KNOWN_MALICIOUS", "NO_KNOWN_DETECTION", "UNKNOWN")]
    verdicts = {r.verdict for r in live}
    if not results:
        return "UNKNOWN"
    if not live:
        return "UNAVAILABLE"
    if "KNOWN_MALICIOUS" in verdicts and ("NO_KNOWN_DETECTION" in verdicts or "UNKNOWN" in verdicts):
        return "CONFLICTING"
    if "KNOWN_MALICIOUS" in verdicts:
        return "KNOWN_MALICIOUS"
    if "NO_KNOWN_DETECTION" in verdicts:
        return "NO_KNOWN_DETECTION"
    return "UNKNOWN"
