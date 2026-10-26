"""Scenario safety validation. Every simulation must pass these checks before
it can be saved or assigned. Rules (all tested):

1. Simulations must carry the visible training banner (enforced server-side).
2. Simulations must never collect passwords — any password-style field rejects
   the template.
3. Content must not impersonate real organizations (banned real-brand tokens).
4. All links/domains must be fictional (reserved TLDs: .example/.invalid/.test,
   or relative paths). No real domains, ever.
"""
from __future__ import annotations

import re

BANNER_TEXT = ("TRAINING SIMULATION — this is a fictional exercise created for learning. "
               "It is not a real message, website, or organization.")

RESERVED_TLD = (".example", ".invalid", ".test")


class ScenarioRejected(ValueError):
    pass


# Well-known real organizations/brands that must never appear in scenarios.
BANNED_REAL_TOKENS = [
    "microsoft", "google", "apple", "amazon", "paypal", "netflix", "facebook",
    "instagram", "whatsapp", "bank of america", "chase bank", "hsbc", "barclays",
    "dhl", "fedex", "ups ", "verizon", "at&t", "telkom", "vodafone", "zamtel",
    "standard chartered", "stanbic", "first national bank", "fnb",
]

PASSWORD_FIELD = re.compile(
    r"type\s*=\s*[\"']password[\"']"          # password input field
    r"|name\s*=\s*[\"'][^\"']*passw"          # named password field
    r"|passw(or)?d\s*[:=]\s*[\"']", re.I)      # password collected as data
URL_RE = re.compile(r"https?://([a-z0-9.-]+)", re.I)
EMAILISH_DOMAIN = re.compile(r"[\w.-]+@([a-z0-9.-]+)", re.I)
HTML_TAG_RE = re.compile(r"<[^>]+>")


def validate_scenario(*, title: str, kind: str, content: str) -> None:
    if kind not in ("phishing_email", "incident_briefing", "quiz"):
        raise ScenarioRejected("kind must be phishing_email|incident_briefing|quiz")
    if not title.strip():
        raise ScenarioRejected("title required")
    if len(content) > 20_000:
        raise ScenarioRejected("refused: scenario content too large")

    lowered = content.lower()
    for token in BANNED_REAL_TOKENS:
        if token in lowered:
            raise ScenarioRejected(
                f"refused: scenario must stay fictional — remove real organization reference {token!r}")

    if PASSWORD_FIELD.search(content):
        raise ScenarioRejected(
            "refused: simulations must never collect passwords (password field detected)")

    for match in list(URL_RE.finditer(content)) + list(EMAILISH_DOMAIN.finditer(content)):
        domain = match.group(1).lower()
        if not any(domain.endswith(tld) for tld in RESERVED_TLD) and domain != "localhost":
            raise ScenarioRejected(
                f"refused: {domain!r} is not a fictional domain — use .example/.invalid/.test")


def banner_html() -> str:
    return (f'<div data-testid="training-banner" role="alert" '
            f'style="background:#ffe8a3;border:2px dashed #8a6d00;padding:0.75rem;'
            f'border-radius:8px;font-weight:600">{BANNER_TEXT}</div>')
