"""Rule engine. Findings are SUSPICIOUS PATTERNS for review — never proof."""
from __future__ import annotations

from dataclasses import dataclass, field
from urllib.parse import urlparse

from .parse import RISKY_EXTENSIONS, ParsedEmail


@dataclass
class Finding:
    code: str
    severity: str          # informational | low | medium | high
    title: str
    explanation: str
    evidence: str


@dataclass
class AnalysisReport:
    findings: list[Finding] = field(default_factory=list)

    @property
    def worst_severity(self) -> str:
        order = {"informational": 0, "low": 1, "medium": 2, "high": 3}
        return max((f.severity for f in self.findings), key=lambda s: order[s], default="informational")

    def to_dict(self) -> dict:
        return {
            "worst_severity": self.worst_severity,
            "findings": [f.__dict__ for f in self.findings],
            "disclaimer": (
                "These are suspicious-pattern warnings for human review. A suspicious pattern is NOT "
                "proof that a message is malicious, and the absence of warnings is NOT proof of safety. "
                "URLs are defanged in reports and were never visited."),
        }


def _defang(url: str) -> str:
    return url.replace("://", "[://]").replace(".", "[.]")


def analyse(parsed: ParsedEmail) -> AnalysisReport:
    report = AnalysisReport()
    f = report.findings

    sender = parsed.sender
    reply = parsed.reply_to
    if reply and reply.strip() and sender:
        sender_domain = sender.split("@")[-1].strip(">").lower()
        reply_domain = reply.split("@")[-1].strip(">").lower()
        if sender_domain and reply_domain and sender_domain != reply_domain:
            f.append(Finding("reply-to-mismatch", "medium", "Reply-To domain differs from sender domain",
                             "Replies would go to a different domain than the apparent sender. Common in "
                             "phishing, but also used by legitimate mailing tools — review context.",
                             f"From {sender} | Reply-To {reply}"))

    for displayed, actual in parsed.displayed_urls:
        d_host = urlparse(displayed if "://" in displayed else f"http://{displayed}").hostname or ""
        a_host = urlparse(actual).hostname or ""
        if d_host and a_host and d_host.lower() != a_host.lower():
            f.append(Finding("displayed-link-mismatch", "high", "Link text shows a different destination",
                             "The visible link text points at a different host than the real href. "
                             "This is a classic lure pattern (still: verify before judging).",
                             f"displayed {_defang(displayed)} -> actual {_defang(actual)}"))

    for url in parsed.urls:
        host = urlparse(url).hostname or ""
        if "@" in urlparse(url).netloc:
            f.append(Finding("url-userinfo", "medium", "URL embeds userinfo before the host",
                             "URLs with user@host can visually disguise the real destination.",
                             _defang(url)))
        labels = host.split(".")
        if len(labels) >= 2 and any(len(label) > 30 for label in labels):
            f.append(Finding("long-label", "low", "Unusually long domain label",
                             "Very long subdomain labels are used to hide the real registered domain.",
                             _defang(url)))
        if host.count(".") >= 4:
            f.append(Finding("deep-subdomains", "low", "Many subdomain levels",
                             "Deeply nested subdomains can disguise the true registered domain.",
                             _defang(url)))

    for att in parsed.attachments:
        name = att.filename.lower()
        risky = next((ext for ext in RISKY_EXTENSIONS if name.endswith(ext)), None)
        if risky:
            f.append(Finding("risky-attachment", "high", f"Attachment with risky extension {risky}",
                             "Executable/script/installer/archive attachments are a common malware "
                             "delivery pattern. Never open unexpected attachments.",
                             f"{att.filename} ({att.content_type}, {att.size} bytes)"))

    subject = parsed.subject.lower()
    for word, code in (("urgent", "urgency-language"), ("verify your", "verify-language"),
                       ("account suspended", "fear-language"), ("click here", "click-language")):
        if word in subject:
            f.append(Finding(code, "low", f"Subject uses pressure language ({word!r})",
                             "Urgency/fear wording pressures fast action. Legitimate senders use it too — "
                             "combine with other signals.", parsed.subject))
    return report
