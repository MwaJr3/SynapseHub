"""Configurable password-generation policy (kept out of the generator)."""
from __future__ import annotations

from dataclasses import dataclass

import string

MIN_LENGTH = 8
MAX_LENGTH = 128
DEFAULT_SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?"


@dataclass(frozen=True)
class PasswordPolicy:
    """Generation rules. Explicit over implicit — every knob is visible."""

    length: int = 20
    use_upper: bool = True
    use_lower: bool = True
    use_digits: bool = True
    use_symbols: bool = True
    symbols: str = DEFAULT_SYMBOLS

    def enabled_pools(self) -> list[str]:
        pools: list[str] = []
        if self.use_lower:
            pools.append(string.ascii_lowercase)
        if self.use_upper:
            pools.append(string.ascii_uppercase)
        if self.use_digits:
            pools.append(string.digits)
        if self.use_symbols:
            pools.append(self.symbols)
        return pools


class PolicyError(ValueError):
    """Raised when a generation configuration is unsafe or invalid."""
