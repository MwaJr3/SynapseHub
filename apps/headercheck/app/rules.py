"""Header evaluation rules with documented, context-aware severities.

Not every missing header is a vulnerability of equal weight: severity depends
on the application's architecture (e.g. an API returning JSON has different
browser-facing needs than a web app). The explanations say so.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class HeaderRule:
    code: str
    header: str
    severity: str          # when missing/weak
    why: str
    remediation: str


RULES: tuple[HeaderRule, ...] = (
    HeaderRule("hsts", "Strict-Transport-Security", "medium",
               "Without HSTS, browsers can be tricked into plain-HTTP requests on first visits.",
               "Serve 'Strict-Transport-Security: max-age=31536000; includeSubDomains' over HTTPS."),
    HeaderRule("csp", "Content-Security-Policy", "medium",
               "CSP limits which scripts/resources may run, reducing XSS impact. APIs may need only a minimal policy.",
               "Define a Content-Security-Policy appropriate to the application (start with report-only)."),
    HeaderRule("x-content-type-options", "X-Content-Type-Options", "low",
               "Stops browsers from MIME-sniffing responses into executable types.",
               "Send 'X-Content-Type-Options: nosniff'."),
    HeaderRule("frame-options", "X-Frame-Options", "low",
               "Legacy clickjacking defence; modern sites often rely on CSP frame-ancestors instead.",
               "Send 'X-Frame-Options: DENY' or use CSP frame-ancestors."),
    HeaderRule("referrer-policy", "Referrer-Policy", "low",
               "Controls how much URL information leaks in outbound navigations.",
               "Send 'Referrer-Policy: no-referrer' or 'strict-origin-when-cross-origin'."),
    HeaderRule("permissions-policy", "Permissions-Policy", "informational",
               "Restricts powerful browser features (camera, geolocation…) the site does not need.",
               "Send a Permissions-Policy listing only the features the site uses."),
)


@dataclass
class Finding:
    code: str
    severity: str
    title: str
    explanation: str
    remediation: str
    observed: str


def evaluate(headers: dict[str, str]) -> list[Finding]:
    lowered = {k.lower(): v for k, v in headers.items()}
    findings: list[Finding] = []
    for rule in RULES:
        value = lowered.get(rule.header.lower())
        if value is None:
            findings.append(Finding(rule.code, rule.severity, f"Missing {rule.header}",
                                    rule.why, rule.remediation, "(absent)"))
        elif rule.code == "hsts" and "max-age=" not in value.lower():
            findings.append(Finding(rule.code, "low", "HSTS present but max-age missing",
                                    "HSTS without max-age has little effect.", rule.remediation, value))
    if "server" in lowered and any(c.isdigit() for c in lowered["server"]):
        findings.append(Finding("server-version", "informational", "Server header discloses a version",
                                "Version disclosure helps fingerprinting; impact is informational.",
                                "Omit version details from the Server header.", lowered["server"]))
    return findings
