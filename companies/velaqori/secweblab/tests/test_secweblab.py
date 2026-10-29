"""Tests: extraction of each pattern class, evidence/fix presence, safe sample clean."""
from __future__ import annotations

from app.extract import scan_markup, scan_python


def test_xss_sample_yields_dom_finding():
    src = open("data/sample_xss.html").read()
    findings = scan_markup(src)
    assert len(findings) == 1
    f = findings[0]
    assert "XSS" in f.vulnerability_class or "Injection" in f.vulnerability_class
    assert f.evidence and f.reproduction_steps and f.candidate_fix
    assert "NOT proof" in f.limitations or "NOT proof of exploitability" in f.limitations


def test_unsafe_python_sample_three_classes():
    src = open("data/sample_unsafe.py").read()
    findings = scan_python(src)
    classes = [f.vulnerability_class for f in findings]
    assert len(findings) == 3
    assert any("eval" in c for c in classes)
    assert any("deserialization" in c.lower() for c in classes)
    assert any("command" in c.lower() for c in classes)


def test_safe_sample_no_findings():
    assert scan_python(open("data/sample_safe.py").read()) == []
    assert scan_markup("<html><body><p>hello</p></body></html>") == []


def test_findings_have_repro_and_fix():
    for f in scan_python(open("data/sample_unsafe.py").read()):
        assert len(f.reproduction_steps) >= 1
        assert f.candidate_fix
        assert "indicative" in f.severity        # severity is estimated, not proven
