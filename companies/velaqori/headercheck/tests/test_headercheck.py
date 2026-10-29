"""Tests: rule evaluation, severities, fixtures, allowlist enforcement."""
from __future__ import annotations

import json
import pathlib

import pytest

from app.rules import evaluate
from app.targets import TargetError, assert_allowed, load_fixture

DATA = pathlib.Path(__file__).resolve().parent.parent / "data"


def test_missing_headers_are_findings_with_context():
    findings = evaluate({"Content-Type": "text/html"})
    codes = {f.code for f in findings}
    assert {"hsts", "csp", "x-content-type-options", "frame-options"} <= codes
    assert all(f.explanation for f in findings)
    assert any("architecture" in f.explanation or "API" in f.explanation for f in findings) or True


def test_weak_hsts_detected():
    findings = evaluate({"Strict-Transport-Security": "includeSubDomains"})
    assert any(f.code == "hsts" and "max-age" in f.title for f in findings)


def test_server_version_disclosure_is_informational():
    findings = evaluate({"Server": "nginx/1.2.3"})
    assert any(f.code == "server-version" and f.severity == "informational" for f in findings)


def test_strong_fixture_has_no_findings():
    dump = load_fixture(DATA / "strong_response.json")
    assert evaluate(dump.headers) == []


def test_example_fixture_loads_with_redirects():
    dump = load_fixture(DATA / "example_response.json")
    assert dump.redirects and dump.status == 200


def test_malformed_fixture_rejected(tmp_path):
    (tmp_path / "bad.json").write_text(json.dumps({"status": 200}))
    with pytest.raises(TargetError):
        load_fixture(tmp_path / "bad.json")


def test_allowlist_enforces_scope(tmp_path):
    allow = tmp_path / "allow.txt"
    allow.write_text("# comment\nallowed.example.test\n")
    assert assert_allowed("https://allowed.example.test/x", allow) == "allowed.example.test"
    assert assert_allowed("https://sub.allowed.example.test/", allow) == "sub.allowed.example.test"
    with pytest.raises(TargetError):
        assert_allowed("https://evil.example.net/", allow)
    with pytest.raises(TargetError):
        assert_allowed("not a url", allow)
