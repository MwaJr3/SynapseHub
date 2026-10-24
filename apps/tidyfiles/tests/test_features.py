"""Phase-B feature tests: profiles, undo manifest (never deletes), duplicates."""
from __future__ import annotations

import json

import pytest

from app.features import FeatureError, UndoManifest, apply_profile, find_duplicates


def test_profiles_and_classification():
    assert apply_profile("student", "notes.pdf") == "docs"
    assert apply_profile("developer", "main.py") == "code"
    assert apply_profile("minimal", "weird.xyz") == "other"
    with pytest.raises(FeatureError):
        apply_profile("military", "x.pdf")


def test_undo_manifest_round_trip(tmp_path):
    src = tmp_path / "a.pdf"
    src.write_text("x")
    dst = tmp_path / "docs" / "a.pdf"
    dst.parent.mkdir()
    src.rename(dst)                              # simulated organize move
    manifest = UndoManifest(str(tmp_path / "m.json"))
    manifest.record(str(src), str(dst))
    manifest.save()
    loaded = UndoManifest.load(str(tmp_path / "m.json"))
    results = loaded.undo()
    assert src.exists() and not dst.exists()
    assert any("reversed" in r for r in results)


def test_undo_refuses_overwrite(tmp_path):
    src = tmp_path / "a.pdf"; src.write_text("original")
    dst = tmp_path / "b.pdf"; dst.write_text("moved")
    manifest = UndoManifest(str(tmp_path / "m.json"))
    manifest.record(str(src), str(dst))
    results = manifest.undo()
    assert any("refused" in r for r in results)     # never overwrites/deletes
    assert src.read_text() == "original"


def test_duplicates_size_first_then_hash(tmp_path):
    f1 = tmp_path / "x.txt"; f1.write_text("same")
    f2 = tmp_path / "y.txt"; f2.write_text("same")
    f3 = tmp_path / "z.txt"; f3.write_text("different-size")
    groups = find_duplicates([str(f1), str(f2), str(f3)])
    assert groups == [[str(f1), str(f2)]]
