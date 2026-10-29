"""Tests: book-vs-copy modelling, loans, overdue rules, inventory integrity."""
from __future__ import annotations

from datetime import date

import pytest

from app.models import LibraryError
from app.services import Library


@pytest.fixture()
def lib(tmp_path):
    lg = Library(str(tmp_path / "lib.db"))
    lg.add_book("Things Fall Apart", "Chinua Achebe", "978-0-435-90525-1")
    lg.add_copy(1, "A-001")
    lg.add_copy(1, "A-002")
    lg.register_borrower("Ada")
    return lg


def test_book_and_copy_are_distinct(lib):
    inv = lib.inventory()
    assert inv[0]["copies"] == 2 and inv[0]["available"] == 2


def test_borrow_and_return(lib):
    loan_id = lib.borrow(1, 1, today=date(2026, 10, 1))
    assert loan_id == 1
    inv = lib.inventory()
    assert inv[0]["available"] == 1
    result = lib.return_copy(1, today=date(2026, 10, 10))
    assert result["was_overdue"] is False
    assert lib.inventory()[0]["available"] == 2


def test_double_borrow_prevented(lib):
    lib.borrow(1, 1, today=date(2026, 10, 1))
    with pytest.raises(LibraryError):
        lib.borrow(1, 1, today=date(2026, 10, 2))


def test_overdue_rules(lib):
    lib.borrow(1, 1, today=date(2026, 10, 1))     # due 2026-10-15
    assert lib.overdue_loans(today=date(2026, 10, 14)) == []
    rows = lib.overdue_loans(today=date(2026, 10, 16))
    assert len(rows) == 1 and rows[0]["label"] == "A-001"
    result = lib.return_copy(1, today=date(2026, 10, 20))
    assert result["was_overdue"] is True


def test_unknown_ids_rejected(lib):
    with pytest.raises(LibraryError):
        lib.borrow(99, 1)
    with pytest.raises(LibraryError):
        lib.borrow(1, 99)
    with pytest.raises(LibraryError):
        lib.return_copy(2)      # not on loan


def test_search_case_insensitive(lib):
    assert len(lib.search("achebe")) == 1
    assert len(lib.search("THINGS")) == 1
    assert lib.search("missing") == []


def test_duplicate_copy_label_rejected(lib):
    with pytest.raises(LibraryError):
        lib.add_copy(1, "A-001")


def test_validation(lib):
    with pytest.raises(LibraryError):
        lib.add_book("", "x")
    with pytest.raises(LibraryError):
        lib.register_borrower("  ")
    with pytest.raises(LibraryError):
        lib.add_copy(1, "  ")
    with pytest.raises(LibraryError):
        lib.add_copy(99, "B-001")
