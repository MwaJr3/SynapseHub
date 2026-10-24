"""Deterministic simulated scanner. DEMO DATA ONLY — clearly labelled."""
from __future__ import annotations

import hashlib

from .base import ObservationInput, ScanResult, normalize

SIMULATED_NOTE = "SIMULATED scan data (deterministic demo) — not real network observations."


class SimulatedScanner:
    def scan(self, target: str, ports: list[int] | None = None) -> ScanResult:
        seed = int(hashlib.sha256(target.encode()).hexdigest()[:4], 16)
        rows = [
            {"port": 22, "service": "ssh", "version": "OpenSSH 9.0 (simulated)"},
            {"port": 80, "service": "http", "version": "nginx 1.24 (simulated)"},
        ]
        if seed % 2 == 0:
            rows.append({"port": 6379, "service": "redis", "version": "7.2 (simulated)"})
        obs = normalize(rows, target)
        return ScanResult(target=target, status="completed", observations=obs, limitations=SIMULATED_NOTE)
