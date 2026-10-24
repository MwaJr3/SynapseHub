"""Tests: registration, enrolment rules, grades, transcripts, search."""
from __future__ import annotations

import pytest

from app.exceptions import (
    DuplicateIdentifierError,
    EnrolmentRuleError,
    InvalidGradeError,
    NotFoundError,
    UnicoreError,
)
from app.repositories.course_repository import CourseRepository
from app.repositories.enrolment_repository import EnrolmentRepository
from app.repositories.student_repository import StudentRepository
from app.services.course_service import CourseService
from app.services.grade_service import GradeService
from app.services.student_service import StudentService
from app.storage.database import connect


@pytest.fixture()
def svc(tmp_path):
    conn = connect(str(tmp_path / "u.db"))
    students, courses, enrolments = StudentRepository(conn), CourseRepository(conn), EnrolmentRepository(conn)
    return (StudentService(students), CourseService(courses, students, enrolments),
            GradeService(students, courses, enrolments), courses)


def test_register_and_duplicate_id(svc):
    s_svc, _, _, _ = svc
    s_svc.register("S-001", "Ada", "ada@test.example", "CS")
    with pytest.raises(DuplicateIdentifierError):
        s_svc.register("S-001", "Impostor")
    with pytest.raises(UnicoreError):
        s_svc.register("", "X")
    with pytest.raises(UnicoreError):
        s_svc.register("S-002", "Y", email="not-an-email")


def test_course_creation_rules(svc):
    _, c_svc, _, courses = svc
    courses.add_lecturer("L1", "Dr B")
    c_svc.create_course("CS101", "Intro", 3, 1)
    with pytest.raises(DuplicateIdentifierError):
        c_svc.create_course("CS101", "Duplicate")
    with pytest.raises(NotFoundError):
        c_svc.create_course("CS102", "X", 3, 99)
    with pytest.raises(NotFoundError):
        c_svc.create_course("  ", "X")


def test_enrolment_rules(svc):
    s_svc, c_svc, _, _ = svc
    s_svc.register("S-001", "Ada")
    c_svc.create_course("CS101", "Intro")
    c_svc.enrol("S-001", "CS101")
    with pytest.raises(EnrolmentRuleError):
        c_svc.enrol("S-001", "CS101")           # duplicate enrolment
    with pytest.raises(NotFoundError):
        c_svc.enrol("NOPE", "CS101")
    with pytest.raises(NotFoundError):
        c_svc.enrol("S-001", "NOPE")


def test_grade_validation_and_rules(svc):
    s_svc, c_svc, g_svc, _ = svc
    s_svc.register("S-001", "Ada")
    c_svc.create_course("CS101", "Intro")
    for bad in (-1, 101, "x"):
        with pytest.raises(InvalidGradeError):
            g_svc.record_grade("S-001", "CS101", bad)
    with pytest.raises(EnrolmentRuleError):
        g_svc.record_grade("S-001", "CS101", 50)     # not enrolled yet
    c_svc.enrol("S-001", "CS101")
    e = g_svc.record_grade("S-001", "CS101", 78.5)
    assert e.grade == 78.5


def test_transcript(svc):
    s_svc, c_svc, g_svc, _ = svc
    s_svc.register("S-001", "Ada", programme="CS")
    c_svc.create_course("CS101", "Intro")
    c_svc.create_course("CS102", "Data")
    c_svc.enrol("S-001", "CS101"); c_svc.enrol("S-001", "CS102")
    g_svc.record_grade("S-001", "CS101", 70)
    g_svc.record_grade("S-001", "CS102", 80)
    t = g_svc.transcript("S-001")
    assert t["recorded"] == 2 and t["in_progress"] == 0
    assert t["mean_grade_unweighted"] == 75.0
    assert "unweighted" in t["note"]
    g_svc.record_grade  # service still usable
    c_svc.create_course("CS103", "X"); c_svc.enrol("S-001", "CS103")
    t = g_svc.transcript("S-001")
    assert t["in_progress"] == 1 and t["mean_grade_unweighted"] == 75.0


def test_search(svc):
    s_svc, _, _, _ = svc
    s_svc.register("S-001", "Ada Lovelace", programme="CS")
    s_svc.register("S-002", "Grace Hopper", programme="Maths")
    assert len(s_svc.search("lovelace")) == 1
    assert len(s_svc.search("S-002")) == 1
    assert len(s_svc.search("maths")) == 1
    assert s_svc.search("nobody") == []
