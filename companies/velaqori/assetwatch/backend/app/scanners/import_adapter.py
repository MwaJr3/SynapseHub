"""Manual/imported scan results (the primary offline path).

Operators export results from their own approved tooling and import them here.
Rows carry the same normalization; import source and time are recorded.
"""
from __future__ import annotations

from .base import ScanResult, normalize

IMPORT_NOTE = "Imported manually supplied scan results; provenance recorded at import time."


class ImportScanner:
    def ingest(self, target: str, rows: list[dict]) -> ScanResult:
        obs = normalize(rows, target)
        status = "completed" if obs else "partial"
        return ScanResult(target=target, status=status, observations=obs, limitations=IMPORT_NOTE)
