"""Shared types for Level-1 separation engines (kept dependency-free so every engine can import them)."""
from __future__ import annotations
from dataclasses import dataclass, field
import numpy as np


@dataclass
class SeparationResult:
    stems: dict[str, np.ndarray] = field(default_factory=dict)   # name -> (ch, n) float32
    sample_rate: int = 44100
    model_name: str = ""
    model_version: str = ""
    engine: str = ""
    warnings: list[str] = field(default_factory=list)


class SeparationModel:
    name = "base"; version = "0"; sources: list[str] = []
    def available(self) -> tuple[bool, str]:
        return False, "not implemented"
    def separate(self, audio: np.ndarray, sr: int, requested: list[str], quality: str,
                 progress=lambda f, m: None) -> SeparationResult:
        raise NotImplementedError
