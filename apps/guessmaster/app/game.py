"""Game state machine, separated from user interaction."""
from __future__ import annotations

import random

from .config import Difficulty


class GameError(ValueError):
    pass


class GuessGame:
    """States: in_progress -> won | lost. Illegal guesses never change state."""

    def __init__(self, difficulty: Difficulty, rng: random.Random | None = None) -> None:
        self.difficulty = difficulty
        self._rng = rng or random.Random()
        self.target = self._rng.randint(difficulty.low, difficulty.high)
        self.attempts = 0
        self.state = "in_progress"
        self.history: list[int] = []

    def guess(self, value: int) -> str:
        if self.state != "in_progress":
            raise GameError("The game is already finished.")
        if not isinstance(value, int) or isinstance(value, bool):
            raise GameError("Guess must be a whole number.")
        if not self.difficulty.low <= value <= self.difficulty.high:
            raise GameError(f"Guess must be between {self.difficulty.low} and {self.difficulty.high}.")
        self.attempts += 1
        self.history.append(value)
        if value == self.target:
            self.state = "won"
            return "correct"
        if self.attempts >= self.difficulty.max_attempts:
            self.state = "lost"
        return "high" if value > self.target else "low"

    @property
    def attempts_left(self) -> int:
        return max(0, self.difficulty.max_attempts - self.attempts)
