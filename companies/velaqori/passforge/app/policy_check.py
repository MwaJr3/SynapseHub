"""Validate a generated (or candidate) password against the configured policy."""
from __future__ import annotations

import string

from .config import PasswordPolicy


def policy_problems(policy: PasswordPolicy, password: str) -> list[str]:
    problems: list[str] = []
    if len(password) != policy.length:
        problems.append(f"length is {len(password)}, expected {policy.length}")
    if policy.use_lower and not any(c in string.ascii_lowercase for c in password):
        problems.append("missing a lowercase letter")
    if policy.use_upper and not any(c in string.ascii_uppercase for c in password):
        problems.append("missing an uppercase letter")
    if policy.use_digits and not any(c in string.digits for c in password):
        problems.append("missing a digit")
    if policy.use_symbols and not any(c in policy.symbols for c in password):
        problems.append("missing a configured symbol")
    return problems
