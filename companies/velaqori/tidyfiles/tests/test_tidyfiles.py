"""Tests: classification honesty, dry-run, conflicts, failures."""
from __future__ import annotations

import os

from app.classify import classify
from app.organizer import organize


def test_magic_beats_extension_and_flags_mismatch(tmp_path):
    fake = tmp_path / "notreally.txt"
    fake.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 8)   # PNG content, .txt name
    cls = classify(fake)
    assert cls.category == "images" and cls.signal == "magic" and cls.mismatch


def test_extension_fallback(tmp_path):
    doc = tmp_path / "notes.md"
    doc.write_text("hello")
    cls = classify(doc)
    assert (cls.category, cls.signal, cls.mismatch) == ("documents", "extension", False)


def test_unknown_goes_to_other(tmp_path):
    blob = tmp_path / "data.xyz"
    blob.write_bytes(b"\x01\x02\x03")
    cls = classify(blob)
    assert (cls.category, cls.signal) == ("other", "fallback")


def test_dry_run_makes_no_changes(tmp_path):
    src, tgt = tmp_path / "in", tmp_path / "out"
    src.mkdir(); tgt.mkdir()
    (src / "a.png").write_bytes(b"\x89PNG\r\n\x1a\nxxxx")
    report = organize(src, tgt, dry_run=True)
    assert report.moved == 1
    assert (src / "a.png").exists() and not (tgt / "images").exists()


def test_apply_moves_files(tmp_path):
    src, tgt = tmp_path / "in", tmp_path / "out"
    src.mkdir(); tgt.mkdir()
    (src / "a.png").write_bytes(b"\x89PNG\r\n\x1a\nxxxx")
    (src / "b.pdf").write_bytes(b"%PDF-1.4 fake")
    organize(src, tgt, dry_run=False)
    assert (tgt / "images" / "a.png").exists()
    assert (tgt / "documents" / "b.pdf").exists()
    assert list(src.iterdir()) == []


def test_conflicts_resolve_deterministically(tmp_path):
    src, tgt = tmp_path / "in", tmp_path / "out"
    src.mkdir(); tgt.mkdir()
    (tgt / "documents").mkdir()
    (tgt / "documents" / "a.txt").write_text("old")
    (src / "a.txt").write_text("new")
    report = organize(src, tgt, dry_run=False)
    assert (tgt / "documents" / "a (1).txt").read_text() == "new"
    assert (tgt / "documents" / "a.txt").read_text() == "old"   # never overwritten
    assert report.records[0].status == "moved"


def test_missing_directories_rejected(tmp_path):
    from app.organizer import OrganizeError
    import pytest
    src = tmp_path / "in"; src.mkdir()
    with pytest.raises(OrganizeError):
        organize(src, tmp_path / "missing-target")
    with pytest.raises(OrganizeError):
        organize(tmp_path / "missing-src", src)
    with pytest.raises(OrganizeError):
        organize(src, src)


def test_report_serialises(tmp_path):
    src, tgt = tmp_path / "in", tmp_path / "out"
    src.mkdir(); tgt.mkdir()
    (src / "a.txt").write_text("x")
    json_text = organize(src, tgt, dry_run=True).to_json()
    assert '"would-move"' in json_text
