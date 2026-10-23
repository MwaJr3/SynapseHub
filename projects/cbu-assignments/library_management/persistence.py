"""File persistence helpers for loading and saving JSON data."""

from __future__ import annotations

import json
from pathlib import Path


class JSONStorage:
    """Persistence adapter that stores library state in JSON."""

    def __init__(self, file_path: str) -> None:
        self._path = Path(file_path)
        self._path.parent.mkdir(parents=True, exist_ok=True)

    @property
    def file_path(self) -> Path:
        """Read-only access to storage file path (encapsulation)."""
        return self._path

    def load(self) -> dict:
        """Load persisted data from disk or return empty state."""
        if not self._path.exists():
            return {"books": [], "members": [], "settings": {"daily_fine_rate": 1.0}}

        with self._path.open("r", encoding="utf-8") as file:
            return json.load(file)

    def save(self, payload: dict) -> None:
        """Save payload to disk in pretty JSON format."""
        with self._path.open("w", encoding="utf-8") as file:
            json.dump(payload, file, indent=2)
