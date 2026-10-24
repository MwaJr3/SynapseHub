"""Cryptographically secure generation engine (independent of the CLI)."""
from __future__ import annotations

import secrets
from pathlib import Path

from .config import MAX_LENGTH, MIN_LENGTH, PasswordPolicy, PolicyError

WORDLIST_PATH = Path(__file__).resolve().parent / "wordlist.txt"


def load_wordlist() -> list[str]:
    words = [line.strip() for line in WORDLIST_PATH.read_text().splitlines() if line.strip()]
    if len(words) < 64:
        raise RuntimeError("wordlist is missing or too small")
    return words


def validate_policy(policy: PasswordPolicy) -> None:
    """Reject configurations that cannot produce a meaningful password."""
    if not policy.enabled_pools():
        raise PolicyError("At least one character group must be enabled.")
    if policy.use_symbols and not policy.symbols:
        raise PolicyError("Symbol list must not be empty when symbols are enabled.")
    if not MIN_LENGTH <= policy.length <= MAX_LENGTH:
        raise PolicyError(f"Length must be between {MIN_LENGTH} and {MAX_LENGTH}.")


def generate_password(policy: PasswordPolicy) -> str:
    """Generate one password using the ``secrets`` module only.

    Guarantees at least one character from every enabled group, then fills and
    shuffles with Fisher-Yates driven by ``secrets.randbelow``. Ordinary
    ``random`` is never used for security-sensitive selection.
    """
    validate_policy(policy)
    pools = policy.enabled_pools()
    chars = [secrets.choice(pool) for pool in pools]
    all_chars = "".join(pools)
    chars += [secrets.choice(all_chars) for _ in range(policy.length - len(chars))]
    for i in range(len(chars) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        chars[i], chars[j] = chars[j], chars[i]
    return "".join(chars)


def generate_passphrase(num_words: int = 6, separator: str = "-") -> str:
    """Generate a passphrase from the bundled documented word list.

    Each word is chosen with ``secrets.choice``. The list is a convenience, not
    a claim of compatibility with any particular standard.
    """
    if not 4 <= num_words <= 24:
        raise PolicyError("Passphrases must use between 4 and 24 words.")
    if not separator:
        raise PolicyError("Separator must not be empty.")
    words = load_wordlist()
    return separator.join(secrets.choice(words) for _ in range(num_words))
