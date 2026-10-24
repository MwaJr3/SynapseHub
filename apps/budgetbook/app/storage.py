"""JSON persistence with Decimal-safe serialization."""
from __future__ import annotations

import json
from pathlib import Path

from .core import Ledger


def save(ledger: Ledger, path: str | Path) -> None:
    Path(path).write_text(json.dumps(ledger.export_data(), indent=2))


def load(path: str | Path) -> Ledger:
    ledger = Ledger()
    ledger.import_data(json.loads(Path(path).read_text()))
    return ledger
