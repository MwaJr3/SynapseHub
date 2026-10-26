"""Tests: normalisation, each rule, combined scenarios, false positives."""
from __future__ import annotations

import pathlib

from app.detect import detect, summarise_findings
from app.parse import parse_log

DATA = pathlib.Path(__file__).resolve().parent.parent / "data"


def events(*lines):
    return parse_log("\n".join(lines))


def test_normalisation_handles_malformed_lines():
    evs = parse_log("garbage line\n2026-10-23T08:15:00Z host sshd[1]: Accepted password for a from 1.2.3.4 port 1\n")
    assert len(evs) == 1 and evs[0].outcome == "success"


def test_repeated_failures_rule():
    lines = [f"2026-10-23T08:{10+i:02d}:00Z host sshd[{i}]: Failed password for bob from 203.0.113.9 port {40000+i}"
             for i in range(5)]
    findings = detect(events(*lines))
    assert any(f.code == "repeated-failures" for f in findings)


def test_fail_then_success_rule():
    lines = [f"2026-10-23T08:{10+i:02d}:00Z host sshd[{i}]: Failed password for bob from 203.0.113.9 port {40000+i}"
             for i in range(3)]
    lines.append("2026-10-23T08:20:00Z host sshd[9]: Accepted password for bob from 203.0.113.9 port 40009")
    findings = detect(events(*lines))
    assert any(f.code == "fail-then-success" for f in findings)


def test_multi_account_source_rule():
    lines = [f"2026-10-23T09:{10+i:02d}:00Z host sshd[{i}]: Failed password for user{i} from 198.51.100.7 port {39000+i}"
             for i in range(3)]
    findings = detect(events(*lines))
    assert any(f.code == "multi-account-source" for f in findings)


def test_off_hours_adds_risk():
    night = [f"2026-10-23T23:{10+i:02d}:00Z host sshd[{i}]: Failed password for bob from 203.0.113.9 port {40000+i}"
             for i in range(5)]
    day = [f"2026-10-23T08:{10+i:02d}:00Z host sshd[{i}]: Failed password for bob from 203.0.113.9 port {40000+i}"
           for i in range(5)]
    f_night = next(f for f in detect(events(*night)) if f.code == "repeated-failures")
    f_day = next(f for f in detect(events(*day)) if f.code == "repeated-failures")
    assert f_night.risk > f_day.risk
    assert any("outside" in s for s in f_night.signals)


def test_legitimate_looking_activity_not_flagged():
    lines = [
        "2026-10-23T08:15:00Z host sshd[1]: Accepted password for alice from 10.0.0.5 port 51000",
        "2026-10-23T09:15:00Z host sshd[2]: Accepted password for alice from 10.0.0.5 port 51001",
        "2026-10-23T10:15:00Z host sshd[3]: Failed password for alice from 10.0.0.5 port 51002",
    ]
    assert detect(events(*lines)) == []


def test_sample_log_and_disclaimer():
    evs = parse_log((DATA / "sample_auth.log").read_text())
    assert len(evs) == 11
    payload = summarise_findings(detect(evs), evs)
    assert "NOT proof of malicious activity" in payload["disclaimer"]
    assert payload["scoring"]["window_minutes"] == 10
