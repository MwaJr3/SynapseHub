"""Secret-detection rules (generic patterns). Findings mark *potential* secrets —
pasted samples and documentation examples can match; triage is human."""
from __future__ import annotations

import re
from .base import Rule, RuleSet

SECRET_RULES = [
    Rule("SEC-AWS-KEY", "Potential AWS access key id", "high", "CWE-798",
         "Committed cloud keys are a common breach path.",
         "Revoke the key and load credentials from a secret manager.",
         re.compile(r"AKIA[0-9A-Z]{16}"),
         applies_to=(".py", ".js", ".ts", ".env", ".json", ".yml", ".yaml", ".txt", ".sh", ".cfg", ".ini")),
    Rule("SEC-PRIVATE-KEY", "Private key material in source", "critical", "CWE-321",
         "Private keys in repositories grant long-lived access to attackers.",
         "Remove the key, rotate it, and load keys from a secret store.",
         re.compile(r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----"),
         applies_to=(".py", ".js", ".ts", ".env", ".json", ".yml", ".yaml", ".txt", ".sh", ".cfg", ".ini")),
    Rule("SEC-GENERIC", "Generic credential assignment", "medium", "CWE-798",
         "Hardcoded credentials cannot be rotated and leak with the source.",
         "Move to environment configuration.",
         re.compile(r"(secret|token|password)\s*[:=]\s*[\"'][A-Za-z0-9/+_-]{12,}[\"']", re.I),
         applies_to=(".py", ".js", ".ts", ".env", ".json", ".yml", ".yaml", ".txt", ".sh", ".cfg", ".ini")),
]

secret_ruleset = RuleSet(rules=SECRET_RULES)
