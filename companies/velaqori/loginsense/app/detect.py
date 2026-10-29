"""Detection rules and documented risk scoring.

IMPORTANT: an unusual pattern is a SIGNAL FOR REVIEW. Unsuccessful logins
alone are never proof of malicious activity; scores are transparent sums of
named contributions, not verdicts.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta

from .parse import AuthEvent


@dataclass
class Finding:
    code: str
    risk: int
    title: str
    signals: list[str]
    events: list[str] = field(default_factory=list)


# Documented weights (configurable here, never scattered):
W_REPEATED_FAILURES = 3        # >= FAIL_THRESHOLD failures for one user within WINDOW
W_FAIL_THEN_SUCCESS = 4        # failures followed by success on the same account
W_MULTI_ACCOUNT_SOURCE = 4     # one source hitting several accounts
W_OFF_HOURS = 2                # success/failure outside working hours
FAIL_THRESHOLD = 5
WINDOW = timedelta(minutes=10)
WORKING_HOURS = (time(6, 0), time(20, 0))
MIN_FINDING_RISK = 3


def _within_working_hours(ts: datetime) -> bool:
    return WORKING_HOURS[0] <= ts.time() <= WORKING_HOURS[1]


def detect(events: list[AuthEvent]) -> list[Finding]:
    findings: list[Finding] = []

    by_user: dict[str, list[AuthEvent]] = defaultdict(list)
    by_ip: dict[str, list[AuthEvent]] = defaultdict(list)
    for ev in events:
        by_user[ev.user].append(ev)
        by_ip[ev.src_ip].append(ev)

    for user, evs in by_user.items():
        evs.sort(key=lambda e: e.timestamp)
        failures = [e for e in evs if e.outcome == "failure"]
        # sliding window over failures
        for i, start in enumerate(failures):
            window = [e for e in failures[i:] if e.timestamp - start.timestamp <= WINDOW]
            if len(window) >= FAIL_THRESHOLD:
                signals = [f"{len(window)} failed logins for {user!r} within {WINDOW.total_seconds()/60:.0f} minutes"]
                risk = W_REPEATED_FAILURES
                if any(not _within_working_hours(e.timestamp) for e in window):
                    signals.append("some attempts outside configured working hours")
                    risk += W_OFF_HOURS
                findings.append(Finding("repeated-failures", risk,
                                        f"Repeated failed logins for {user!r}", signals,
                                        [e.raw for e in window[:6]]))
                break
        # failure -> success sequence
        successes = [e for e in evs if e.outcome == "success"]
        for s in successes:
            prior_failures = [e for e in failures if e.timestamp < s.timestamp
                              and s.timestamp - e.timestamp <= timedelta(minutes=30)]
            if len(prior_failures) >= 3:
                signals = [f"{len(prior_failures)} failures within 30 minutes before a successful login"]
                risk = W_FAIL_THEN_SUCCESS
                if not _within_working_hours(s.timestamp):
                    signals.append("the successful login was outside working hours")
                    risk += W_OFF_HOURS
                findings.append(Finding("fail-then-success", risk,
                                        f"Failures followed by success for {user!r}", signals,
                                        [e.raw for e in prior_failures[:4]] + [s.raw]))
                break

    for ip, evs in by_ip.items():
        users_failed = {e.user for e in evs if e.outcome == "failure"}
        if len(users_failed) >= 3:
            findings.append(Finding("multi-account-source", W_MULTI_ACCOUNT_SOURCE,
                                    f"Single source {ip} failed against multiple accounts",
                                    [f"source {ip} failed for accounts: {', '.join(sorted(users_failed))}"],
                                    [e.raw for e in evs[:6]]))

    return sorted((f for f in findings if f.risk >= MIN_FINDING_RISK), key=lambda f: -f.risk)


def summarise_findings(findings: list[Finding], events: list[AuthEvent]) -> dict:
    return {
        "events": len(events),
        "findings": [f.__dict__ for f in findings],
        "scoring": {
            "repeated_failures": W_REPEATED_FAILURES,
            "fail_then_success": W_FAIL_THEN_SUCCESS,
            "multi_account_source": W_MULTI_ACCOUNT_SOURCE,
            "off_hours_bonus": W_OFF_HOURS,
            "window_minutes": int(WINDOW.total_seconds() // 60),
            "working_hours": [WORKING_HOURS[0].isoformat(), WORKING_HOURS[1].isoformat()],
        },
        "disclaimer": "These are risk-scored signals for analyst review. Unsuccessful logins alone are "
                      "NOT proof of malicious activity, and location is not inferred beyond the source "
                      "address present in the logs. Scores are transparent sums of named contributions.",
    }
