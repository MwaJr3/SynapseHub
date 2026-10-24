"""Password policy: length, character classes, blocklist, user-info reuse."""
from __future__ import annotations

import re

# Small bundled common-password sample (offline; not exhaustive).
COMMON = {"password", "password1", "12345678", "qwerty123", "letmein123",
          "admin12345", "welcome123", "iloveyou1", "passw0rd!", "sunshine12"}

MIN_LENGTH = 12


def check_password(password: str, username: str = "") -> list[str]:
    problems = []
    if len(password) < MIN_LENGTH:
        problems.append(f"must be at least {MIN_LENGTH} characters")
    if not re.search(r"[a-z]", password):
        problems.append("must contain a lowercase letter")
    if not re.search(r"[A-Z]", password):
        problems.append("must contain an uppercase letter")
    if not re.search(r"\d", password):
        problems.append("must contain a digit")
    if not re.search(r"[^A-Za-z0-9]", password):
        problems.append("must contain a symbol")
    if password.lower() in COMMON:
        problems.append("is on the bundled common-password list")
    if username and len(username) >= 3 and username.lower() in password.lower():
        problems.append("must not contain the username")
    return problems
