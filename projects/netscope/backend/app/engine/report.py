# Engine module reused from apps/netscope (tested CLI engine) — behavior preserved.
"""JSON and human-readable reporting (metadata only; payloads never included)."""
from __future__ import annotations

import json

from .analysis import Summary, anonymise, protocol_chart


def to_dict(summary: Summary, redact: bool = False) -> dict:
    def maybe(ip: str) -> str:
        return anonymise(ip) if redact else ip
    return {
        "packets": summary.packets,
        "bytes_total": summary.bytes_total,
        "malformed_packets": summary.malformed_packets,
        "by_protocol": summary.by_protocol,
        "top_sources": [[maybe(ip), n] for ip, n in summary.top_sources],
        "top_destinations": [[maybe(ip), n] for ip, n in summary.top_destinations],
        "per_minute": summary.per_minute,
        "anomalies": summary.anomalies,
        "disclaimer": "Metadata analysis only — packet payloads are never inspected or exported. "
                      "Unusual-volume flags are configurable heuristics for review, not proof of an attack.",
    }


def to_text(summary: Summary) -> str:
    lines = [f"packets: {summary.packets}  bytes: {summary.bytes_total}  malformed: {summary.malformed_packets}",
             "protocol distribution:", protocol_chart(summary.by_protocol),
             "top sources: " + ", ".join(f"{ip} ({n})" for ip, n in summary.top_sources),
             "top destinations: " + ", ".join(f"{ip} ({n})" for ip, n in summary.top_destinations)]
    lines += [f"anomaly: {a}" for a in summary.anomalies]
    lines.append("Heuristic flags are for review — not proof of an attack. Payloads are never inspected.")
    return "\n".join(lines)
