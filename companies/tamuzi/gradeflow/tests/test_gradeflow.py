"""Tests: grade boundaries, averages, validation, incomplete handling."""
from __future__ import annotations

import pytest

from app.config import DEFAULT_BANDS
from app.core import (
    DuplicateStudentError,
    Gradebook,
    GradebookError,
    InvalidMarkError,
    MarkExistsError,
    UnknownStudentError,
    letter_for,
)
from app.storage import load, save


def test_letter_boundaries_exact_edges():
    assert letter_for(100.0) == "A"
    assert letter_for(75.0) == "A"   # boundary falls in the higher band
    assert letter_for(74.99) == "B"
    assert letter_for(65.0) == "B"
    assert letter_for(55.0) == "C"
    assert letter_for(45.0) == "D"
    assert letter_for(44.99) == "F"
    assert letter_for(0.0) == "F"


def test_duplicate_student_id_rejected():
    gb = Gradebook()
    gb.add_student("S1", "Ada")
    with pytest.raises(DuplicateStudentError):
        gb.add_student("S1", "Impostor")


def test_invalid_marks_rejected():
    gb = Gradebook(); gb.add_student("S1", "Ada")
    for bad in (-1, 101, float("nan"), "x"):
        with pytest.raises(InvalidMarkError):
            gb.add_mark("S1", "Maths", bad)


def test_unknown_student_rejected():
    gb = Gradebook()
    with pytest.raises(UnknownStudentError):
        gb.add_mark("NOPE", "Maths", 50)


def test_total_and_average():
    gb = Gradebook(); gb.add_student("S1", "Ada")
    gb.add_mark("S1", "Maths", 70)
    gb.add_mark("S1", "Physics", 80)
    r = gb.result_for("S1")
    assert r["total"] == 150.0
    assert r["average"] == 75.0
    assert r["letter"] == "A"
    assert r["status"] == "complete"


def test_duplicate_mark_requires_explicit_update():
    gb = Gradebook(); gb.add_student("S1", "Ada")
    gb.add_mark("S1", "Maths", 70)
    with pytest.raises(MarkExistsError):
        gb.add_mark("S1", "Maths", 90)
    gb.add_mark("S1", "Maths", 90, update=True)
    assert gb.result_for("S1")["marks"] == {"Maths": 90.0}


def test_incomplete_results_flagged_and_excluded_from_top():
    gb = Gradebook()
    gb.add_student("S1", "Ada"); gb.add_student("S2", "Bob")
    gb.add_mark("S1", "Maths", 80)
    assert gb.result_for("S2")["status"].startswith("incomplete")
    tops = gb.top_performers()
    assert [t["student_id"] for t in tops] == ["S1"]


def test_top_performers_includes_ties():
    gb = Gradebook()
    for sid, name in [("S1", "Ada"), ("S2", "Bob"), ("S3", "Cid")]:
        gb.add_student(sid, name)
    gb.add_mark("S1", "Maths", 90); gb.add_mark("S2", "Maths", 90); gb.add_mark("S3", "Maths", 50)
    assert sorted(t["student_id"] for t in gb.top_performers()) == ["S1", "S2"]


def test_empty_ids_and_names_rejected():
    gb = Gradebook()
    with pytest.raises(GradebookError):
        gb.add_student("  ", "Ada")
    with pytest.raises(GradebookError):
        gb.add_student("S1", "")
    gb.add_student("S1", "Ada")
    with pytest.raises(GradebookError):
        gb.add_mark("S1", "  ", 50)


def test_storage_roundtrip(tmp_path):
    gb = Gradebook(); gb.add_student("S1", "Ada"); gb.add_mark("S1", "Maths", 66.5)
    save(gb, tmp_path / "g.json")
    restored = load(tmp_path / "g.json")
    assert restored.result_for("S1") == gb.result_for("S1")


def test_bands_are_configurable():
    from app.config import GradeBand
    custom = (GradeBand(50, "PASS"), GradeBand(0, "FAIL"))
    assert letter_for(50.0, custom) == "PASS"
    assert letter_for(49.9, custom) == "FAIL"
    assert DEFAULT_BANDS is not custom
