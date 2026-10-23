"""Pytest coverage for LibraryManager workflows."""

from datetime import datetime, timedelta

import pytest

from library_management.exceptions import BookUnavailableError, ValidationError
from library_management.persistence import JSONStorage
from library_management.service import LibraryManager


@pytest.fixture()
def manager(tmp_path):
    storage = JSONStorage(str(tmp_path / "library.json"))
    return LibraryManager(storage)


def test_add_and_search_book(manager):
    manager.add_book("B1", "Python Tricks", "Dan", 3)
    results = manager.search_books("python")
    assert len(results) == 1
    assert results[0].available_copies == 3


def test_borrow_and_return_with_fine(manager):
    manager.add_book("B2", "Deep Work", "Cal", 1)
    manager.register_member("M1", "Alice", "alice@example.com")

    overdue_due_date = datetime.now() - timedelta(days=2)
    manager.borrow_book("M1", "B2", due_date=overdue_due_date)
    fine = manager.return_book("M1", "B2")

    assert fine >= 2.0
    member = manager.list_members()[0]
    assert member.outstanding_fine >= fine


def test_borrow_unavailable_book_raises(manager):
    manager.add_book("B3", "Domain Driven Design", "Evans", 1)
    manager.register_member("M2", "Bob", "bob@example.com")
    manager.borrow_book("M2", "B3")

    with pytest.raises(BookUnavailableError):
        manager.borrow_book("M2", "B3")


def test_invalid_email_raises(manager):
    with pytest.raises(ValidationError):
        manager.register_member("M3", "NoEmail", "invalid-email")
