"""Game rules are configuration: ranges and attempt limits per difficulty."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Difficulty:
    name: str
    low: int
    high: int
    max_attempts: int


DIFFICULTIES: dict[str, Difficulty] = {
    "easy": Difficulty("easy", 1, 50, 10),
    "medium": Difficulty("medium", 1, 100, 7),
    "hard": Difficulty("hard", 1, 500, 9),
}
