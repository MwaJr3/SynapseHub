"""Consolidated JSON reports; inconclusive results are explicit."""
from __future__ import annotations

import json

from .providers import Verdict


def consolidate(indicator: str, verdicts: list[Verdict]) -> dict:
    return {
        "indicator": indicator,
        "results": [v.__dict__ for v in verdicts],
        "consensus": _consensus(verdicts),
        "disclaimer": (
            "A provider response is unverified third-party information, not conclusive proof that "
            "anything is malicious. 'no-data' is NOT a clearance. Provenance and retrieval times are "
            "recorded for every result; unavailable providers are shown as unavailable, never as clean."),
    }


def _consensus(verdicts: list[Verdict]) -> str:
    results = {v.result for v in verdicts if v.result != "unavailable"}
    if not results:
        return "inconclusive (no provider answered)"
    if "known-malicious" in results:
        return "reported-malicious by at least one source (unverified)"
    if "suspicious" in results:
        return "reported-suspicious by at least one source (unverified)"
    if results == {"no-data"}:
        return "inconclusive (no data — not a clearance)"
    return "mixed or benign-looking responses (unverified)"


def to_json(payload: dict) -> str:
    return json.dumps(payload, indent=2)
