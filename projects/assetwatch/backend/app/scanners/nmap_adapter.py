"""Opt-in nmap integration (documented; requires nmap installed + explicit mode).

Safety: the command is constructed from validated ports only (no free-form
flags), limited to allowlisted targets passed in by the caller, uses a
conservative timing template, and enforces a hard subprocess timeout.
Service/version detection only (-sV); no scripts, no evasion, no exploitation.
"""
from __future__ import annotations

import shutil
import subprocess

from .base import ScannerError, ScanResult, normalize


class NmapScanner:
    def __init__(self, timeout_seconds: int = 120) -> None:
        if shutil.which("nmap") is None:
            raise ScannerError("nmap binary not available; configure SCAN_MODE=import or simulated")
        self.timeout = timeout_seconds

    def scan(self, target: str, ports: list[int]) -> ScanResult:
        if not ports:
            raise ScannerError("explicit port list required (no default full-range scans)")
        port_spec = ",".join(str(p) for p in ports)
        cmd = ["nmap", "-Pn", "-sV", "-T2", "--host-timeout", "60s", "-p", port_spec, target]
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=self.timeout)
        except subprocess.TimeoutExpired:
            return ScanResult(target=target, status="failed", error="scan timed out",
                              limitations="hard subprocess timeout enforced")
        if proc.returncode != 0:
            return ScanResult(target=target, status="failed", error=proc.stderr[:200],
                              limitations="nmap exited non-zero")
        rows = []
        for line in proc.stdout.splitlines():
            parts = line.split()
            if len(parts) >= 3 and parts[0].isdigit() and "/" in parts[0]:
                port = int(parts[0].split("/")[0])
                rows.append({"port": port, "service": parts[2], "version": " ".join(parts[3:])[:80]})
        return ScanResult(target=target, status="completed" if rows else "partial",
                          observations=normalize(rows, target),
                          limitations="service/version detection only; results limited to the requested ports")
