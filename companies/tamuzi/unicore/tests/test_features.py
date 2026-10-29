"""Phase-B feature tests: prerequisites, clashes, transcript, audit."""
from __future__ import annotations

from app.features import audit_log, check_prerequisites, detect_clashes, transcript_rows


def test_prerequisites():
    problems = check_prerequisites("CS201", {"CS101"}, {"CS201": {"CS101", "MATH101"}})
    assert problems == ["missing prerequisite: MATH101"]
    assert check_prerequisites("CS201", {"CS101", "MATH101"}, {"CS201": {"CS101", "MATH101"}}) == []


def test_clash_detection():
    enrolments = [
        {"course": "CS101", "day": "Mon", "start": "09:00", "end": "10:30"},
        {"course": "MATH101", "day": "Mon", "start": "10:00", "end": "11:00"},
        {"course": "ENG101", "day": "Tue", "start": "10:00", "end": "11:00"},
    ]
    clashes = detect_clashes(enrolments)
    assert len(clashes) == 1 and clashes[0]["overlap_minutes"] == 30
    assert clashes[0]["courses"] == ["CS101", "MATH101"]
    assert "resolve before confirming" in clashes[0]["note"]
    assert detect_clashes([enrolments[0], enrolments[2]]) == []


def test_transcript_ordered_and_labelled():
    student = {"name": "Ada", "student_id": "S1"}
    results = [{"course": "B", "grade": "A", "credits": 3, "term": "2026-1"},
               {"course": "A", "grade": "C", "credits": 3, "term": "2026-1"},
               {"course": "C", "grade": "F", "credits": 3, "term": "2026-2"}]
    t = transcript_rows(student, results)
    assert [r["course"] for r in t["rows"]] == ["A", "B", "C"]
    assert t["credits_earned"] == 6                    # F excluded
    assert "not verified" in t["note"]


def test_audit_log_appends(tmp_path):
    path = str(tmp_path / "a.jsonl")
    audit_log(path, "registrar", "enrol", "CS101")
    audit_log(path, "registrar", "drop", "CS101")
    lines = open(path).read().strip().splitlines()
    assert len(lines) == 2 and '"action": "enrol"' in lines[0]
