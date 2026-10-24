"""Tests: mockable collectors, scoped observation, alert honesty."""
from __future__ import annotations

from app.collectors import CollectorReport, ProcessSnapshot
from app.files import scan_paths
from app.rules import evaluate


def test_file_observation_and_missing_marker(tmp_path):
    f = tmp_path / "a.txt"; f.write_text("hello")
    facts = scan_paths([str(tmp_path), str(tmp_path / "missing")])
    assert any(fx.path.endswith("a.txt") and fx.size == 5 for fx in facts)
    assert any(fx.size == -1 for fx in facts)          # explicit missing marker


def test_hashing_optional(tmp_path):
    f = tmp_path / "a.txt"; f.write_text("hello")
    assert scan_paths([str(f)], hash_files=True)[0].sha256
    assert scan_paths([str(f)], hash_files=False)[0].sha256 is None


def test_high_memory_alert_is_informational():
    report = CollectorReport("2026-10-24T00:00:00+00:00",
                             [ProcessSnapshot(1, "big", 50.0, 4096.0)])
    alerts = evaluate(report, high_memory_mb=2048.0)
    assert alerts.alerts and alerts.alerts[0].code == "high-memory"
    assert alerts.alerts[0].severity == "informational"


def test_file_change_detection(tmp_path):
    f = tmp_path / "watched.txt"; f.write_text("abc")
    prev_facts = scan_paths([str(f)])
    f.write_text("abcdef")
    report = CollectorReport("2026-10-24T00:01:00+00:00", [], scan_paths([str(f)]))
    alerts = evaluate(report, previous_files={str(f): prev_facts[0]})
    assert any(a.code == "file-changed" for a in alerts.alerts)


def test_unsupported_features_reported():
    report = CollectorReport("2026-10-24T00:00:00+00:00", [], [], ["psutil unavailable: process metadata not collected"])
    alerts = evaluate(report)
    assert any(a.code == "unsupported-feature" for a in alerts.alerts)


def test_disclaimer_honesty():
    payload = evaluate(CollectorReport("2026-10-24T00:00:00+00:00")).to_dict()
    assert "NOT proof of malicious activity" in payload["disclaimer"]
    assert "never terminates processes" in payload["disclaimer"]
