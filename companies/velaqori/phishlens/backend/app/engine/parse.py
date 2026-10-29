# Engine module reused from apps/phishlens-cli (tested CLI engine) — behavior preserved.
"""Email parsing: headers, body, URLs (never fetched), attachments metadata."""
from __future__ import annotations

import email
import email.policy
from dataclasses import dataclass, field
from email.message import EmailMessage


class ParseError(ValueError):
    pass


@dataclass
class AttachmentInfo:
    filename: str
    content_type: str
    size: int


@dataclass
class ParsedEmail:
    headers: dict[str, str]
    sender: str
    reply_to: str
    subject: str
    body_text: str
    urls: list[str] = field(default_factory=list)
    displayed_urls: list[tuple[str, str]] = field(default_factory=list)  # (displayed, actual)
    attachments: list[AttachmentInfo] = field(default_factory=list)


RISKY_EXTENSIONS = {".exe", ".scr", ".js", ".vbs", ".bat", ".cmd", ".jar", ".ps1", ".hta", ".lnk", ".zip", ".iso"}


def parse_email(raw: str | bytes) -> ParsedEmail:
    try:
        msg: EmailMessage = email.message_from_string(raw if isinstance(raw, str) else raw.decode("utf-8", "replace"),
                                                      policy=email.policy.default)
    except Exception as exc:  # malformed messages must never crash the analyzer
        raise ParseError(f"Could not parse email content: {exc}") from exc
    headers = {k: str(msg.get(k, "")) for k in ("From", "To", "Reply-To", "Return-Path", "Subject", "Date")}
    if not any(headers.values()):
        raise ParseError("No recognisable email structure (missing all headers).")
    body = msg.get_body(preferencelist=("plain", "html"))
    body_text = body.get_content() if body else ""
    import re
    urls = re.findall(r"https?://[^\s\"'<>]+", body_text)
    displayed: list[tuple[str, str]] = []
    for m in re.finditer(r"<a\s+[^>]*href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>", body_text, re.I | re.S):
        displayed.append((re.sub(r"<[^>]+>", "", m.group(2)).strip(), m.group(1)))
    attachments = []
    for part in msg.iter_attachments() if hasattr(msg, "iter_attachments") else []:
        attachments.append(AttachmentInfo(str(part.get_filename() or "(unnamed)"),
                                          str(part.get_content_type()), len(part.get_payload(decode=True) or b"")))
    return ParsedEmail(headers, headers.get("From", ""), headers.get("Reply-To", ""),
                       headers.get("Subject", ""), body_text, urls, displayed, attachments)
