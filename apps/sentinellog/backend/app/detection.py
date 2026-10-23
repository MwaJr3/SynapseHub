"""Detection engine: transparent, configurable rules over parsed events.

Every match is reported as a **suspicious pattern**, never as a confirmed
attack. Each finding explains which events produced it and which comparison
was used, so an analyst can verify the logic instead of trusting a black box.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta

RULE_TYPES = ("repeated_failures", "multi_account_spray", "success_after_failures", "error_spike")


@dataclass
class EventView:
    id: int
    timestamp: datetime | None
    event_type: str
    username: str
    source_ip: str
    message: str


@dataclass
class RuleConfig:
    id: int | None
    name: str
    rule_type: str
    threshold: int
    window_minutes: int
    severity: str
    description: str
    runbook: str


def _sorted_events(events: list[EventView]) -> list[EventView]:
    return sorted(events, key=lambda e: (e.timestamp or datetime.min.replace(tzinfo=None), e.id))


def _within_window(a: datetime | None, b: datetime | None, minutes: int) -> bool:
    if a is None or b is None:
        return False
    if a.tzinfo is None or b.tzinfo is None:
        return abs((a.replace(tzinfo=None) - b.replace(tzinfo=None)).total_seconds()) <= minutes * 60
    return abs((a - b).total_seconds()) <= minutes * 60


def _evidence(events: list[EventView], limit: int = 20) -> dict:
    return {
        "event_ids": [e.id for e in events[:limit]],
        "event_count": len(events),
        "first_seen": events[0].timestamp.isoformat() if events and events[0].timestamp else None,
        "last_seen": events[-1].timestamp.isoformat() if events and events[-1].timestamp else None,
        "sample_messages": [e.message[:200] for e in events[:5]],
    }


def run_rule(events: list[EventView], rule: RuleConfig) -> list[dict]:
    """Run one rule across a dataset and return finding dicts."""
    ordered = _sorted_events(events)
    if rule.rule_type == "repeated_failures":
        return _repeated_failures(ordered, rule)
    if rule.rule_type == "multi_account_spray":
        return _multi_account_spray(ordered, rule)
    if rule.rule_type == "success_after_failures":
        return _success_after_failures(ordered, rule)
    if rule.rule_type == "error_spike":
        return _error_spike(ordered, rule)
    return []


def _repeated_failures(events: list[EventView], rule: RuleConfig) -> list[dict]:
    """Threshold+ failures for the same username or IP within the window."""
    findings: list[dict] = []
    groups: dict[tuple[str, str], list[EventView]] = defaultdict(list)
    for e in events:
        if e.event_type == "auth_failure":
            groups[(e.username, e.source_ip)].append(e)
    for (username, ip), failures in groups.items():
        cluster: list[EventView] = []
        for failure in failures:
            cluster = [c for c in cluster if _within_window(c.timestamp, failure.timestamp, rule.window_minutes)]
            cluster.append(failure)
            if len(cluster) >= rule.threshold:
                subject = f"user '{username}'" if username else f"source {ip}"
                findings.append(
                    {
                        "rule_id": rule.id,
                        "rule_name": rule.name,
                        "severity": rule.severity,
                        "classification": "suspicious-pattern",
                        "title": f"{len(cluster)}+ failed logins for {subject} within {rule.window_minutes} minutes",
                        "explanation": (
                            f"Rule '{rule.name}' compared authentication-failure events grouped by "
                            f"(username, source IP) over a sliding {rule.window_minutes}-minute window. "
                            f"{len(cluster)} failures matched the configured threshold of {rule.threshold}. "
                            "This is a suspicious pattern, not proof of an attack."
                        ),
                        "evidence": _evidence(cluster),
                    }
                )
                break  # one finding per group per run keeps the list readable
    return findings


def _multi_account_spray(events: list[EventView], rule: RuleConfig) -> list[dict]:
    """One source IP failing against many distinct accounts in the window."""
    findings: list[dict] = []
    by_ip: dict[str, list[EventView]] = defaultdict(list)
    for e in events:
        if e.event_type == "auth_failure" and e.source_ip:
            by_ip[e.source_ip].append(e)
    for ip, failures in by_ip.items():
        cluster: list[EventView] = []
        for failure in failures:
            cluster = [c for c in cluster if _within_window(c.timestamp, failure.timestamp, rule.window_minutes)]
            cluster.append(failure)
            accounts = {e.username for e in cluster if e.username}
            if len(accounts) >= rule.threshold:
                findings.append(
                    {
                        "rule_id": rule.id,
                        "rule_name": rule.name,
                        "severity": rule.severity,
                        "classification": "suspicious-pattern",
                        "title": f"Source {ip} failed against {len(accounts)} distinct accounts within {rule.window_minutes} minutes",
                        "explanation": (
                            f"Rule '{rule.name}' grouped authentication failures by source IP and counted "
                            f"distinct usernames over a sliding {rule.window_minutes}-minute window "
                            f"({len(accounts)} accounts, threshold {rule.threshold}). This pattern can also be "
                            "produced by shared infrastructure (NAT, VPN, proxies). It is not proof of an attack."
                        ),
                        "evidence": {**_evidence(cluster), "usernames": sorted(accounts)[:20]},
                    }
                )
                break
    return findings


def _success_after_failures(events: list[EventView], rule: RuleConfig) -> list[dict]:
    """A successful login shortly after repeated failures for the same account."""
    findings: list[dict] = []
    failures_by_user: dict[str, list[EventView]] = defaultdict(list)
    for e in events:
        if e.event_type == "auth_failure" and e.username:
            failures_by_user[e.username].append(e)
    for e in events:
        if e.event_type != "auth_success" or not e.username:
            continue
        recent = [
            f
            for f in failures_by_user.get(e.username, [])
            if f.timestamp and e.timestamp and f.timestamp <= e.timestamp and _within_window(f.timestamp, e.timestamp, rule.window_minutes)
        ]
        if len(recent) >= rule.threshold:
            findings.append(
                {
                    "rule_id": rule.id,
                    "rule_name": rule.name,
                    "severity": rule.severity,
                    "classification": "suspicious-pattern",
                    "title": f"Successful login for '{e.username}' after {len(recent)} failures within {rule.window_minutes} minutes",
                    "explanation": (
                        f"Rule '{rule.name}' matched {len(recent)} authentication failures followed by a success "
                        f"for the same account inside {rule.window_minutes} minutes (threshold {rule.threshold}). "
                        "This pattern is consistent with a user recovering a forgotten password as well as with "
                        "an attacker succeeding after guessing. It is not proof of an attack."
                    ),
                    "evidence": _evidence(recent + [e]),
                }
            )
    return findings


def _error_spike(events: list[EventView], rule: RuleConfig) -> list[dict]:
    """Unusual concentration of error events in the window."""
    errors = [e for e in events if e.event_type == "error"]
    if len(errors) < rule.threshold:
        return []
    cluster: list[EventView] = []
    for error in errors:
        cluster = [c for c in cluster if _within_window(c.timestamp, error.timestamp, rule.window_minutes)]
        cluster.append(error)
        if len(cluster) >= rule.threshold:
            return [
                {
                    "rule_id": rule.id,
                    "rule_name": rule.name,
                    "severity": rule.severity,
                    "classification": "suspicious-pattern",
                    "title": f"{len(cluster)}+ error events within {rule.window_minutes} minutes",
                    "explanation": (
                        f"Rule '{rule.name}' counted error-type events over a sliding {rule.window_minutes}-minute "
                        f"window and matched the configured threshold of {rule.threshold}. Error spikes can come "
                        "from faults as well as from security-relevant activity. This is not proof of an attack."
                    ),
                    "evidence": _evidence(cluster),
                }
            ]
    return []


def event_frequency(events: list[EventView], bucket_minutes: int = 60) -> list[dict]:
    """Aggregate event counts per time bucket for the activity chart."""
    buckets: dict[str, dict[str, int]] = defaultdict(lambda: {"auth_success": 0, "auth_failure": 0, "error": 0, "info": 0, "total": 0})
    for e in events:
        if e.timestamp is None:
            key = "unknown-time"
        else:
            key = e.timestamp.strftime("%Y-%m-%d %H:00")
        bucket = buckets[key]
        bucket[e.event_type] = bucket.get(e.event_type, 0) + 1
        bucket["total"] += 1
    return [{"bucket": key, **buckets[key]} for key in sorted(buckets)]
