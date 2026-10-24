"""Tests: matching, line numbers, exclusions, redaction, binary handling."""
from __future__ import annotations

import json

from app.rules import redact
from app.scanner import scan


def populate(root):
    (root / "src").mkdir()
    (root / "src" / "config.py").write_text(
        'API_KEY = "AIza' + "A" * 35 + '"\n'
        'password = "hunter2hunter2"\n')
    (root / "notes.md").write_text("token ghp_" + "a" * 36 + " leaked in docs\n")
    (root / ".env").write_text("DB_URL=postgres://user:pass@host/db\n")
    (root / "node_modules").mkdir()
    (root / "node_modules" / "junk.js").write_text('const k = "ghp_' + "b" * 36 + '"')
    (root / "blob.bin").write_bytes(b"\x00\x01binary")


def test_detection_and_line_numbers(tmp_path):
    populate(tmp_path)
    report = scan(tmp_path)
    codes = {(f.rule, f.file) for f in report.findings}
    assert ("google-api-key", "src/config.py") in codes
    assert ("password-assignment", "src/config.py") in codes
    assert ("github-token", "notes.md") in codes
    assert ("db-connection-string", ".env") in codes
    assert all(f.line >= 1 for f in report.findings)


def test_exclusions_and_binary_skip(tmp_path):
    populate(tmp_path)
    report = scan(tmp_path)
    assert not any("node_modules" in f.file for f in report.findings)
    # excluded directories are skipped entirely (not scanned, not listed per-file):
    assert report.files_scanned == 3          # src/config.py, notes.md, .env
    assert any("blob.bin (binary)" in s for s in report.skipped)


def test_redaction_never_leaks_full_secret(tmp_path):
    populate(tmp_path)
    payload = report_json = scan(tmp_path).to_json()
    assert "hunter2hunter2" not in payload
    assert "ghp_" + "a" * 36 not in payload
    assert "redacted" in payload
    assert "CANDIDATES" in payload


def test_redact_helper():
    assert redact("short") == "***"
    r = redact("ghp_abcdefghijklmnopqrstuvwxyz0123456789abcd")
    assert "ghp_" in r and "abcd" not in r.replace("(len", "")


def test_line_numbers_exact(tmp_path):
    (tmp_path / "a.py").write_text("line1\nTOKEN = " + '"ghp_' + "c" * 36 + '"' + "\nline3\n")
    report = scan(tmp_path)
    assert any(f.line == 2 for f in report.findings)


def test_scope_validation(tmp_path):
    import pytest
    with pytest.raises(ValueError):
        scan(tmp_path / "missing")
