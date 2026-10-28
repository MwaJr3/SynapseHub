"""Engine tests ported from apps/phishlens-cli (behavior preserved)."""
import json
import pathlib

import pytest

from app.engine.parse import ParseError, parse_email
from app.engine.rules import analyse

FIX = pathlib.Path(__file__).resolve().parent / "fixtures"


def test_legit_email_has_no_high_findings():
    report = analyse(parse_email((FIX / "legit.eml").read_text()))
    assert report.worst_severity in ("informational", "low")
    assert not any(f.severity == "high" for f in report.findings)


def test_phishy_email_triggers_expected_rules():
    report = analyse(parse_email((FIX / "phishy.eml").read_text()))
    codes = {f.code for f in report.findings}
    assert {"reply-to-mismatch", "displayed-link-mismatch", "url-userinfo",
            "long-label", "urgency-language"} <= codes
    assert report.worst_severity == "high"


def test_risky_attachment_flagged():
    report = analyse(parse_email((FIX / "phishy_attachment.eml").read_text()))
    assert "risky-attachment" in {f.code for f in report.findings}


def test_urls_defanged_in_evidence_and_disclaimer_present():
    report = analyse(parse_email((FIX / "phishy.eml").read_text()))
    for f in report.findings:
        assert "http://" not in f.evidence.replace("[://]", "") or "[://]" in f.evidence
    assert "NOT proof" in report.to_dict()["disclaimer"]


def test_malformed_email_raises_parse_error():
    with pytest.raises(ParseError):
        parse_email(b"\xff\xfe garbage without any email structure \x00\x00")
