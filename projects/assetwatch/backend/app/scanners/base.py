"""Scanner adapter interface + result normalization.

Normalized observation: {port, service, version, banner?}. Adapters never
perform exploitation, credential attempts, or stealth techniques — scope is
service observation on allowlisted targets only.
"""
from __future__ import annotations

from dataclasses import dataclass, field


class ScannerError(Exception):
    pass


@dataclass
class ObservationInput:
    port: int
    service: str
    version: str = ""
    banner: str = ""


@dataclass
class ScanResult:
    target: str
    status: str                      # completed | partial | failed
    observations: list[ObservationInput] = field(default_factory=list)
    limitations: str = ""
    error: str = ""


KNOWN_SERVICES = {22: "ssh", 80: "http", 443: "https", 3306: "mysql", 5432: "postgresql",
                  6379: "redis", 8080: "http-alt"}


def normalize(raw: list[dict], target: str) -> list[ObservationInput]:
    """Normalize raw adapter rows; unknown service names fall back to
    'unknown' rather than being invented."""
    out = []
    for row in raw:
        try:
            port = int(row["port"])
        except (KeyError, TypeError, ValueError):
            continue
        if not 0 < port < 65536:
            continue
        service = str(row.get("service") or KNOWN_SERVICES.get(port, "unknown")).strip().lower() or "unknown"
        out.append(ObservationInput(port=port, service=service,
                                    version=str(row.get("version", ""))[:80],
                                    banner=str(row.get("banner", ""))[:200]))
    return out
