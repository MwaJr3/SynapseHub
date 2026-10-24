"""Redaction of evidence + the AI consent gate.

- Evidence shown in reports is redacted by default (secret-shaped material masked).
- No source is sent to any AI service without: (a) AI enabled in configuration,
  and (b) explicit per-run consent from the user. The default is no AI at all.
  The consent decision is recorded with the run."""
from __future__ import annotations

import re

SECRETISH = re.compile(r"([\"'])([^\"']{8,})\1")


def redact_evidence(evidence: str) -> str:
    return SECRETISH.sub(lambda m: m.group(1) + "*" * 8 + m.group(2)[-4:] + m.group(1), evidence)


class AiConsentError(RuntimeError):
    pass


def ai_payload(files: list[tuple[str, str]], findings_summary: str,
               *, ai_enabled: bool, consent_given: bool, endpoint: str) -> dict:
    """Build an AI-review payload only when every gate passes.

    Raises AiConsentError otherwise. In this deployment no AI endpoint is
    configured, so the function documents the intended flow and always
    raises — no data leaves the process."""
    if not ai_enabled:
        raise AiConsentError("AI review is disabled in configuration")
    if not endpoint:
        raise AiConsentError("no AI endpoint configured — nothing is sent")
    if not consent_given:
        raise AiConsentError("explicit consent required before any source is sent to an AI service")
    raise AiConsentError("no AI provider is available in this deployment — source is never sent")
