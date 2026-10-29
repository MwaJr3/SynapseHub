"""JSON persistence for the gradebook."""
from __future__ import annotations

import json
from pathlib import Path

from .core import Gradebook


def save(gradebook: Gradebook, path: str | Path) -> None:
    Path(path).write_text(json.dumps(gradebook.export_data(), indent=2))


def load(path: str | Path, gradebook: Gradebook | None = None) -> Gradebook:
    gb = gradebook or Gradebook()
    data = json.loads(Path(path).read_text())
    gb.import_data(data)
    return gb
