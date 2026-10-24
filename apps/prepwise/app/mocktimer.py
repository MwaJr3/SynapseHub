"""Mock-interview timer: bounded countdown with question pacing."""
from __future__ import annotations

import time
from dataclasses import dataclass, field


@dataclass
class MockTimer:
    total_seconds: int
    question_count: int
    _start: float = field(default_factory=time.monotonic, repr=False)

    def per_question_seconds(self) -> int:
        if self.question_count <= 0:
            raise ValueError("question_count must be positive")
        return max(30, self.total_seconds // self.question_count)

    def remaining(self) -> int:
        return max(0, self.total_seconds - int(time.monotonic() - self._start))

    def is_over(self) -> bool:
        return self.remaining() == 0


def format_mmss(seconds: int) -> str:
    return f"{seconds // 60:02d}:{seconds % 60:02d}"
