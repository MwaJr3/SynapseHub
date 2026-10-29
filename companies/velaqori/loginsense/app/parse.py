"""Event normalisation from supported auth-log formats (untrusted input)."""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime


class ParseError(ValueError):
    pass


@dataclass
class AuthEvent:
    timestamp: datetime
    user: str
    src_ip: str
    outcome: str          # success | failure
    raw: str


LINE = re.compile(
    r"^(?P<ts>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\S*\s+\S+\s+sshd\[\d+\]:\s+"
    r"(?P<body>.*)$")
FAIL = re.compile(r"Failed (?:password|publickey) for (?:invalid user )?(?P<user>\S+) from (?P<ip>\S+)")
SUCCESS = re.compile(r"Accepted (?:password|publickey) for (?P<user>\S+) from (?P<ip>\S+)")


def parse_line(line: str) -> AuthEvent | None:
    m = LINE.match(line.strip())
    if not m:
        return None
    ts = datetime.fromisoformat(m.group("ts"))
    fail = FAIL.search(m.group("body"))
    if fail:
        return AuthEvent(ts, fail.group("user"), fail.group("ip"), "failure", line.strip())
    ok = SUCCESS.search(m.group("body"))
    if ok:
        return AuthEvent(ts, ok.group("user"), ok.group("ip"), "success", line.strip())
    return None


def parse_log(text: str) -> list[AuthEvent]:
    events = []
    for i, line in enumerate(text.splitlines(), start=1):
        if not line.strip():
            continue
        ev = parse_line(line)
        if ev is not None:
            events.append(ev)
        # Lines that do not match supported formats are ignored (not fatal):
        # imported logs are untrusted input and malformed lines never crash parsing.
    return events
