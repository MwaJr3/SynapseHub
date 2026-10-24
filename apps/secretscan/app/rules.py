"""Detection rules. Matches are CANDIDATES for review, never confirmed credentials."""
from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Rule:
    code: str
    title: str
    pattern: re.Pattern
    remediation: str


DEFAULT_RULES: tuple[Rule, ...] = (
    Rule("aws-access-key", "AWS access key ID candidate", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"),
         "Revoke the key in the cloud console and issue a replacement via a secrets manager."),
    Rule("github-token", "GitHub token candidate", re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{22,}\b"),
         "Revoke the token in GitHub settings and use short-lived or environment-scoped tokens."),
    Rule("private-key", "PEM private key block", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----"),
         "Remove the key from the repository history and generate a new keypair."),
    Rule("slack-token", "Slack token candidate", re.compile(r"\bxox[baprs]-[0-9A-Za-z-]{10,}\b"),
         "Revoke the token in the Slack app settings."),
    Rule("google-api-key", "Google API key candidate", re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"),
         "Restrict or rotate the key in the Google Cloud console."),
    Rule("jwt", "JWT-shaped string", re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"),
         "Confirm whether this token is live; prefer short-lived tokens."),
    Rule("password-assignment", "Password/secret assignment in code", re.compile(
        r"(?i)\b(?:password|passwd|secret|api[_-]?key|access[_-]?token)\b\s*[:=]\s*[\"'][^\"']{8,}[\"']"),
         "Move the value to environment configuration or a secrets manager."),
    Rule("db-connection-string", "Database URL with embedded credentials", re.compile(
        r"\b(?:postgres(?:ql)?|mysql|mongodb|redis)://[^\s\"':]{1,}:[^\s\"']{1,}@"),
         "Use environment variables or IAM-based auth instead of embedded credentials."),
)


def redact(match_text: str) -> str:
    """Reports never contain complete suspected secrets (tested)."""
    if len(match_text) <= 8:
        return "***"
    return f"{match_text[:4]}…{match_text[-2:]} (len {len(match_text)}, redacted)"
