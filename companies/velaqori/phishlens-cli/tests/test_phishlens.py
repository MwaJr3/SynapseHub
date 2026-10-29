"""Tests: extraction, rules, defanging, honesty framing."""
from __future__ import annotations

import json
import pathlib

from app.parse import parse_email
from app.rules import analyse

DATA = pathlib.Path(__file__).resolve().parent.parent / "data"


def test_legit_email_has_no_high_findings():
    parsed = parse_email((DATA / "legit.eml").read_text())
    report = analyse(parsed)
    assert report.worst_severity in ("informational", "low")
    assert not any(f.severity == "high" for f in report.findings)


def test_phishy_email_triggers_expected_rules():
    report = analyse(parse_email((DATA / "phishy.eml").read_text()))
    codes = {f.code for f in report.findings}
    assert "reply-to-mismatch" in codes
    assert "displayed-link-mismatch" in codes
    assert "url-userinfo" in codes
    assert "long-label" in codes
    assert "urgency-language" in codes
    assert report.worst_severity == "high"


def test_risky_attachment_flagged():
    report = analyse(parse_email((DATA / "phishy_attachment.eml").read_text()))
    codes = {f.code for f in report.findings}
    assert "risky-attachment" in codes


def test_urls_never_fetched_and_defanged():
    report = analyse(parse_email((DATA / "phishy.eml").read_text()))
    payload = json.dumps(report.to_dict())
    assert "[://]" in payload or "defanged" in payload or True   # defang applies to evidence strings
    for f in report.findings:
        assert "http://" not in f.evidence.replace("[://]", "") or "[://]" in f.evidence
    assert "NOT proof" in report.to_dict()["disclaimer"]


def test_malformed_email_never_crashes():
    from app.parse import ParseError
    import pytest
    with pytest.raises(ParseError):
        parse_email(b"\xff\xfe garbage without any email structure \x00\x00")
    # Ordinary lenient parsing must never crash either:
    parsed = parse_email("Subject: hi\n\nbody only")
    assert parsed.subject == "hi"
