"""Grading rules are configuration, never hard-coded through the logic."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GradeBand:
    minimum: float   # inclusive lower bound for this letter
    letter: str


DEFAULT_BANDS: tuple[GradeBand, ...] = (
    GradeBand(75.0, "A"),
    GradeBand(65.0, "B"),
    GradeBand(55.0, "C"),
    GradeBand(45.0, "D"),
    GradeBand(0.0, "F"),
)

MARK_MIN = 0.0
MARK_MAX = 100.0
