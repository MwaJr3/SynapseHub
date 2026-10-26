"""Heuristic Python security rules (Bandit-style, rule-driven, not compiler-level).

These are heuristic indicators — an absence of findings is not proof of
security, and a finding is not proof of a vulnerability. Both are stated in
every report."""
from __future__ import annotations

import re
from .base import Rule, RuleSet

RULES = [
    Rule("PY-EXEC", "Dynamic code execution (eval/exec)", "high", "CWE-95",
         "eval/exec on untrusted input enables arbitrary code execution.",
         "Replace with an explicit allowlist of permitted operations.",
         re.compile(r"\b(eval|exec)\s*\(")),
    Rule("PY-SHELL", "subprocess with shell=True", "high", "CWE-78",
         "shell=True can allow command injection when arguments are attacker-influenced.",
         "Pass a list of arguments and shell=False.",
         re.compile(r"subprocess\.(run|call|Popen|check_output)\([^)]*shell\s*=\s*True")),
    Rule("PY-PICKLE", "Unsafe deserialization (pickle)", "high", "CWE-502",
         "pickle can execute arbitrary code while loading untrusted data.",
         "Use a safe serialization format (JSON) or validate signatures before loading.",
         re.compile(r"pickle\.loads?\s*\(")),
    Rule("PY-YAML", "yaml.load without SafeLoader", "medium", "CWE-502",
         "yaml.load can instantiate arbitrary Python objects.",
         "Use yaml.safe_load().",
         re.compile(r"yaml\.load\s*\((?!.*Loader\s*=\s*yaml\.SafeLoader)")),
    Rule("PY-ASSERT", "assert used for security checks", "medium", "CWE-617",
         "Assertions are stripped under -O; never use them for authorization decisions.",
         "Raise an explicit exception instead of asserting.",
         re.compile(r"^\s*assert\b")),
    Rule("PY-WEAKHASH", "Weak hash for security use (MD5/SHA-1)", "medium", "CWE-327",
         "MD5/SHA-1 are collision-broken and unsuitable for security purposes.",
         "Use SHA-256+ for integrity and a password KDF for credentials.",
         re.compile(r"hashlib\.(md5|sha1)\s*\(")),
    Rule("PY-HARDCODED-PW", "Hardcoded password/secret assignment", "high", "CWE-798",
         "Credentials in source leak with the code and cannot be rotated.",
         "Load secrets from environment or a secret manager.",
         re.compile(r"(password|passwd|secret|api_key|token)\s*=\s*[\"'][^\"']{4,}[\"']", re.I)),
    Rule("PY-REQUESTS-VERIFY", "TLS verification disabled (verify=False)", "medium", "CWE-295",
         "Disabling TLS verification enables man-in-the-middle attacks.",
         "Use verify=True and fix the trust chain instead.",
         re.compile(r"verify\s*=\s*False")),
]

python_ruleset = RuleSet(rules=RULES)
