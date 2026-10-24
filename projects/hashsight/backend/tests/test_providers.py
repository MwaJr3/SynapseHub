"""Provider verdict mapping, consensus combination, failure handling."""
from __future__ import annotations

import pytest

from app.providers.base import ProviderError, ProviderResult, combine
from app.providers.demo import DemoProvider


def _result(verdict, available=True):
    return ProviderResult("p", verdict, None, None, "2026-01-01T00:00:00", "summary", available=available)


def test_verdict_validation():
    with pytest.raises(ProviderError):
        ProviderResult("p", "SAFE", None, None, "t", "s")     # "SAFE" is not a verdict — by design


def test_combine_conflicting():
    assert combine([_result("KNOWN_MALICIOUS"), _result("NO_KNOWN_DETECTION")]) == "CONFLICTING"
    assert combine([_result("KNOWN_MALICIOUS"), _result("UNKNOWN")]) == "CONFLICTING"
    assert combine([_result("KNOWN_MALICIOUS"), _result("KNOWN_MALICIOUS")]) == "KNOWN_MALICIOUS"
    assert combine([_result("NO_KNOWN_DETECTION")]) == "NO_KNOWN_DETECTION"
    assert combine([_result("UNKNOWN")]) == "UNKNOWN"


def test_combine_unavailable():
    assert combine([_result("UNAVAILABLE", available=False)]) == "UNAVAILABLE"
    assert combine([]) == "UNKNOWN"


def test_demo_provider_deterministic_and_labelled():
    p = DemoProvider()
    r1 = p.lookup("a" * 64)
    r2 = p.lookup("a" * 64)
    assert r1.verdict == r2.verdict                       # deterministic verdict
    assert "DEMO DATA" in r1.raw_summary
    assert "NOT 'safe'" in p.lookup("b" * 64).raw_summary or "DEMO DATA" in p.lookup("b" * 64).raw_summary


def test_demo_provider_fixtures():
    p = DemoProvider({"c" * 64: {"verdict": "KNOWN_MALICIOUS", "detections": 9, "total": 60}})
    r = p.lookup("c" * 64)
    assert r.verdict == "KNOWN_MALICIOUS" and r.detections == 9

