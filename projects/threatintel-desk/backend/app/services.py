"""Ingestion, canonicalization + dedup, and honest verdict presentation.

Framing (tested): appearance in ONE feed is NOT proof of maliciousness —
every indicator records its source list and count, and the UI/report language
says so. Provider verdicts are unverified third-party claims."""
from __future__ import annotations

import hashlib
import json
import re

from .engine.indicators import IndicatorError, parse_indicator

SIMULATED_NOTE = ("SIMULATED feed data (deterministic demo) — fictional indicators, "
                  "not real-world intelligence.")


def canonical(value: str, kind: str) -> str:
    if kind == "domain":
        return value.strip().lower().rstrip(".")
    if kind.startswith("hash"):
        return value.strip().lower()
    return value.strip()


def parse_lines(text: str, limit: int) -> tuple[list[tuple[str, str]], list[str]]:
    """Return ([(value, kind)], errors) — never raises on bad lines."""
    ok: list[tuple[str, str]] = []
    errors: list[str] = []
    for line in text.splitlines()[:limit]:
        raw = line.strip()
        if not raw or raw.startswith("#"):
            continue
        try:
            ind = parse_indicator(raw)
            ok.append((str(ind.value), str(ind.kind)))
        except IndicatorError as exc:
            errors.append(f"{raw[:60]}: {exc}")
    return ok, errors


def simulated_batch(feed_name: str) -> list[tuple[str, str]]:
    seed = int(hashlib.sha256(feed_name.encode()).hexdigest()[:4], 16)
    batch = [
        (f"sim-{seed % 97}-{seed % 13}.training.example", "domain"),
        (hashlib.sha256(f"{feed_name}-file".encode()).hexdigest(), "hash"),
    ]
    return batch


def source_summary(sources_json: str) -> dict:
    sources = json.loads(sources_json or "[]")
    return {"sources": sources, "source_count": len(sources),
            "framing": ("Appearing in feeds raises questions for review — it is not proof "
                        "that an indicator is malicious. Provider responses are unverified "
                        "third-party claims.")}
