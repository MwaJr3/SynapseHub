"""Transparent, local analysis rules. No network, no telemetry, ever."""
from __future__ import annotations

import re
import string
from collections import Counter
from dataclasses import dataclass, field

WEAK_PATTERNS = (
    r"^(password|passw0rd|qwerty|letmein|welcome|admin|iloveyou|monkey|dragon|football)",
    r"^(abc|abcd|qwer|asdf|zxcv|1234|12345|123456)",
    r"^(.)\1{3,}$",                     # aaaaa...
    r"^(0123|1234|2345|3456|4567|5678|6789|7890)",
)
SEQUENCE_RUNS = ("abcdefghijklmnopqrstuvwxyz", "01234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm")


@dataclass
class Signal:
    name: str            # e.g. "length", "variety", "repetition"
    effect: int          # contribution to the rubric score (may be negative)
    detail: str          # human explanation


@dataclass
class Assessment:
    score: int
    band: str            # weak | fair | strong
    signals: list[Signal] = field(default_factory=list)
    suggestions: list[str] = field(default_factory=list)
    entropy_bits_estimate: float = 0.0


def _has_sequence(password: str, run_len: int = 4) -> bool:
    lower = password.lower()
    for run in SEQUENCE_RUNS:
        for i in range(len(run) - run_len + 1):
            chunk = run[i:i + run_len]
            if chunk in lower or chunk[::-1] in lower:
                return True
    return False


def assess(password: str) -> Assessment:
    """Score on a transparent additive rubric. The score is an estimate, not a
    guarantee — see the README's honest-strength section."""
    if not password:
        raise ValueError("Empty input has no assessment; refusing to score it.")
    signals: list[Signal] = []
    suggestions: list[str] = []

    # Length (the single strongest controllable factor).
    length_effect = min(len(password), 24) // 2
    signals.append(Signal("length", length_effect, f"Length {len(password)} contributes up to 12 points."))
    if len(password) < 12:
        suggestions.append("Use at least 12 characters; length helps more than symbol tricks.")

    # Character variety.
    classes = [string.ascii_lowercase, string.ascii_uppercase, string.digits, string.punctuation]
    variety = sum(1 for c in classes if any(ch in c for ch in password))
    signals.append(Signal("variety", variety, f"{variety} of 4 character classes present."))
    if variety < 3:
        suggestions.append("Mix more character classes (upper, lower, digits, symbols).")

    # Repetition.
    counts = Counter(password)
    most = counts.most_common(1)[0]
    if most[1] > len(password) * 0.4:
        signals.append(Signal("repetition", -4, f"Character {most[0]!r} repeats heavily."))
        suggestions.append("Avoid repeating the same character many times.")
    else:
        signals.append(Signal("repetition", 0, "No heavy character repetition."))

    # Sequences and common patterns.
    if _has_sequence(password):
        signals.append(Signal("sequence", -4, "Contains a keyboard/alphabet sequence (e.g. abcd, 1234, qwerty)."))
        suggestions.append("Replace predictable sequences.")
    else:
        signals.append(Signal("sequence", 0, "No obvious sequences."))
    weak_hit = any(re.search(p, password.lower()) for p in WEAK_PATTERNS)
    if weak_hit:
        signals.append(Signal("common-pattern", -6, "Starts with or matches a very common weak pattern."))
        suggestions.append("Avoid well-known passwords and keyboard walks entirely.")
    else:
        signals.append(Signal("common-pattern", 0, "No common weak pattern matched."))

    # Local weak list (explicitly small and bundled — not a breach corpus).
    from .weaklist import WEAK_LIST
    if password.lower() in WEAK_LIST:
        signals.append(Signal("weak-list", -8, "Appears in the bundled small weak-password list."))
        suggestions.append("This value is on the bundled weak list; choose something unrelated.")
    else:
        signals.append(Signal("weak-list", 0, "Not in the bundled weak list (this list is small — see limitations)."))

    score = max(0, min(10, 5 + sum(s.effect for s in signals) // 2))
    band = "weak" if score <= 3 else ("fair" if score <= 6 else "strong")

    # Rough entropy estimate: log2(pool) * length, documented as approximate.
    pool = 0
    if any(c in string.ascii_lowercase for c in password): pool += 26
    if any(c in string.ascii_uppercase for c in password): pool += 26
    if any(c in string.digits for c in password): pool += 10
    if any(c in string.punctuation for c in password): pool += 32
    entropy = round(len(password) * (pool.bit_length() - 1), 1) if pool else 0.0

    if not suggestions:
        suggestions.append("Good baseline. Still: never reuse this password elsewhere.")
    return Assessment(score, band, signals, suggestions, entropy)
