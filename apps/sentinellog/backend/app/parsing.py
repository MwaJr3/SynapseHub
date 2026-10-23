"""Log ingestion: parse untrusted .log/.txt/.csv uploads into structured events.

Uploads are treated as hostile input: parsing never executes content, reports
malformed lines instead of failing, and every accepted record keeps its raw
line for traceability.
"""
from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone

# --- Line formats -----------------------------------------------------------

# RFC3164-ish syslog: "Oct 12 14:22:01 host sshd[1234]: message"
SYSLOG_RE = re.compile(
    r"^(?P<ts>[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+"
    r"(?P<host>\S+)\s+(?P<proc>[\w./-]+)(?:\[(?P<pid>\d+)\])?:\s*(?P<msg>.*)$"
)
# ISO-ish prefix: "2026-10-12T14:22:01 ..." or "2026-10-12 14:22:01 ..."
ISO_RE = re.compile(r"^(?P<ts>\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+(?P<msg>.*)$")

FAILED_PASSWORD_RE = re.compile(
    r"Failed (?:password|publickey) for (?:invalid user )?(?P<user>\S+) from (?P<ip>\S+)", re.I
)
ACCEPTED_LOGIN_RE = re.compile(r"Accepted (?:password|publickey) for (?P<user>\S+) from (?P<ip>\S+)", re.I)
INVALID_USER_RE = re.compile(r"Invalid user (?P<user>\S+) from (?P<ip>\S+)", re.I)
GENERIC_IP_RE = re.compile(r"from (?P<ip>\d{1,3}(?:\.\d{1,3}){3})")

CSV_ALIASES = {
    "timestamp": {"timestamp", "time", "ts", "datetime", "date"},
    "event_type": {"event_type", "event", "type", "status", "action"},
    "username": {"username", "user", "account", "login"},
    "source_ip": {"source_ip", "ip", "src", "src_ip", "source", "sourceip"},
    "source_system": {"source_system", "host", "system", "source_host"},
    "message": {"message", "msg", "detail", "description"},
}

EVENT_TYPE_ALIASES = {
    "auth_success": {"auth_success", "success", "login_success", "accepted", "login", "logon"},
    "auth_failure": {"auth_failure", "failure", "failed", "login_failed", "failed_password", "denied", "auth_failed"},
    "error": {"error", "err", "exception", "critical", "alert"},
    "info": {"info", "information", "notice", "warning", "warn", "debug"},
}


@dataclass
class ParsedRecord:
    line_no: int
    timestamp: datetime | None
    event_type: str
    username: str
    source_ip: str
    source_system: str
    message: str
    raw: str


@dataclass
class ParseResult:
    file_format: str
    records: list[ParsedRecord] = field(default_factory=list)
    errors: list[dict] = field(default_factory=list)


def classify_message(message: str) -> tuple[str, str, str]:
    """Return (event_type, username, source_ip) inferred from a message body."""
    if m := FAILED_PASSWORD_RE.search(message):
        return "auth_failure", m.group("user"), m.group("ip")
    if m := INVALID_USER_RE.search(message):
        return "auth_failure", m.group("user"), m.group("ip")
    if m := ACCEPTED_LOGIN_RE.search(message):
        return "auth_success", m.group("user"), m.group("ip")
    lowered = message.lower()
    if any(word in lowered for word in ("failed", "failure", "denied", "authentication error")):
        ip = GENERIC_IP_RE.search(message)
        return "auth_failure", "", (ip.group("ip") if ip else "")
    if any(word in lowered for word in ("error", "exception", "critical")):
        return "error", "", ""
    return "info", "", ""


def parse_timestamp(value: str) -> datetime | None:
    value = value.strip()
    if not value:
        return None
    # ISO 8601 first.
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        pass
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S", "%d/%b/%Y:%H:%M:%S"):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    # RFC3164 syslog timestamps carry no year — assume the current UTC year.
    try:
        parsed = datetime.strptime(value, "%b %d %H:%M:%S")
        return parsed.replace(year=datetime.now(timezone.utc).year, tzinfo=timezone.utc)
    except ValueError:
        return None


def _normalize_event_type(value: str) -> str:
    cleaned = value.strip().lower().replace("-", "_").replace(" ", "_")
    for canonical, aliases in EVENT_TYPE_ALIASES.items():
        if cleaned in aliases:
            return canonical
    if any(word in cleaned for word in ("fail", "denied")):
        return "auth_failure"
    if "success" in cleaned or "accept" in cleaned:
        return "auth_success"
    return "info"


def parse_text_log(text: str) -> ParseResult:
    """Parse free-form .log/.txt content (syslog or ISO-timestamped lines)."""
    result = ParseResult(file_format="syslog")
    for line_no, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        if not line:
            continue
        ts: datetime | None = None
        message = line
        source_system = ""
        if m := SYSLOG_RE.match(line):
            ts = parse_timestamp(m.group("ts"))
            source_system = m.group("host")
            message = m.group("msg")
        elif m := ISO_RE.match(line):
            ts = parse_timestamp(m.group("ts"))
            message = m.group("msg")
        event_type, username, source_ip = classify_message(message)
        if ts is None and not message.strip():
            result.errors.append({"line_no": line_no, "reason": "empty message", "raw": raw[:300]})
            continue
        result.records.append(
            ParsedRecord(
                line_no=line_no,
                timestamp=ts,
                event_type=event_type,
                username=username,
                source_ip=source_ip,
                source_system=source_system,
                message=message[:2000],
                raw=raw[:2000],
            )
        )
    return result


def parse_csv_log(text: str) -> ParseResult:
    """Parse CSV logs with flexible column names."""
    result = ParseResult(file_format="csv")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        result.errors.append({"line_no": 0, "reason": "CSV has no header row", "raw": ""})
        return result
    header_map: dict[str, str] = {}
    for name in reader.fieldnames:
        key = (name or "").strip().lower()
        for canonical, aliases in CSV_ALIASES.items():
            if key in aliases and canonical not in header_map:
                header_map[canonical] = name  # type: ignore[assignment]
    if "timestamp" not in header_map and "message" not in header_map:
        result.errors.append(
            {"line_no": 1, "reason": f"CSV header must include a timestamp or message column (got: {reader.fieldnames})", "raw": ""}
        )
        return result
    for line_no, row in enumerate(reader, start=2):
        get = lambda col: (row.get(header_map[col], "") or "").strip() if col in header_map else ""  # noqa: E731
        message = get("message")
        ts = parse_timestamp(get("timestamp"))
        event_type_raw = get("event_type")
        username = get("username")
        source_ip = get("source_ip")
        if event_type_raw:
            event_type = _normalize_event_type(event_type_raw)
        else:
            event_type, inferred_user, inferred_ip = classify_message(message)
            username = username or inferred_user
            source_ip = source_ip or inferred_ip
        if ts is None and not message and not event_type_raw:
            result.errors.append({"line_no": line_no, "reason": "row has neither timestamp nor message", "raw": str(row)[:300]})
            continue
        result.records.append(
            ParsedRecord(
                line_no=line_no,
                timestamp=ts,
                event_type=event_type,
                username=username[:120],
                source_ip=source_ip[:64],
                source_system=get("source_system")[:120],
                message=message[:2000],
                raw=str(row)[:2000],
            )
        )
    return result


def parse_upload(filename: str, text: str) -> ParseResult:
    """Dispatch on file type. `filename` must already be validated by the route."""
    lower = filename.lower()
    if lower.endswith(".csv"):
        return parse_csv_log(text)
    return parse_text_log(text)
