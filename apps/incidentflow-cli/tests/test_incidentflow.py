"""Tests: intake, custody, duplicates, verification honesty, timelines."""
from __future__ import annotations

import pytest

from app.intake import IntakeError, hash_file
from app.services import EvidenceError, EvidenceStore


@pytest.fixture()
def store(tmp_path):
    return EvidenceStore(str(tmp_path / "e.db"))


def test_collect_and_custody_log(store, tmp_path):
    f = tmp_path / "doc.txt"; f.write_text("important")
    r = store.add_evidence(str(f), "analyst-a")
    assert r["duplicate_of"] is None
    rows = store.conn.execute("SELECT * FROM custody_log").fetchall()
    assert rows[0]["action"] == "collected" and rows[0]["actor"] == "analyst-a"


def test_duplicate_detection_by_content(store, tmp_path):
    a = tmp_path / "a.bin"; a.write_bytes(b"same content")
    b = tmp_path / "copy.bin"; b.write_bytes(b"same content")
    r1 = store.add_evidence(str(a), "analyst")
    r2 = store.add_evidence(str(b), "analyst")
    assert r2["duplicate_of"] == r1["id"]


def test_hash_verification_match_and_mismatch(store, tmp_path):
    f = tmp_path / "doc.txt"; f.write_text("original")
    r = store.add_evidence(str(f), "analyst")
    ok = store.verify_hash(r["id"], "analyst")
    assert ok["match"] is True and "NOT prove" in ok["note"]
    f.write_text("tampered!")
    bad = store.verify_hash(r["id"], "analyst")
    assert bad["match"] is False
    actions = [a["result"] for a in store.report()["actions"]]
    assert any("MISMATCH" in a for a in actions)


def test_source_evidence_read_only(store, tmp_path):
    f = tmp_path / "doc.txt"; f.write_text("original")
    store.add_evidence(str(f), "analyst")
    assert f.read_text() == "original"          # intake never modifies the source


def test_timeline_is_metadata_labelled(store, tmp_path):
    f = tmp_path / "doc.txt"; f.write_text("x")
    r = store.add_evidence(str(f), "analyst")
    store.log_action(r["id"], "review", "analyst", "opened in viewer")
    report = store.report()
    assert len(report["timeline"]) == 2
    assert any("not proof of chronology" in lim for lim in report["limitations"])


def test_errors(store, tmp_path):
    with pytest.raises(IntakeError):
        store.add_evidence(str(tmp_path / "missing"), "x")
    with pytest.raises(EvidenceError):
        store.verify_hash(999, "x")
    with pytest.raises(EvidenceError):
        store.log_action(999, "x", "y")
    f = tmp_path / "d.txt"; f.write_text("x")
    r = store.add_evidence(str(f), "x")
    assert store.search("d.txt")[0]["id"] == r["id"]
    assert hash_file(f) == r["sha256"]
