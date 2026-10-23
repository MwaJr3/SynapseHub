"""Data models for the library management system."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta


@dataclass
class LibraryEntity:
    """Base entity that supports serialization of dataclasses."""

    def to_dict(self) -> dict:
        """Convert dataclass fields to dictionary format."""
        return self.__dict__.copy()


@dataclass
class Book(LibraryEntity):
    """Represents a book stored in the library inventory."""

    book_id: str
    title: str
    author: str
    quantity: int = 1
    available_copies: int = 1

    def __post_init__(self) -> None:
        """Normalize available copies if omitted."""
        if self.available_copies > self.quantity:
            self.available_copies = self.quantity


@dataclass
class Person(LibraryEntity):
    """Base class for people in the system, demonstrating inheritance."""

    person_id: str
    name: str
    email: str


@dataclass
class Member(Person):
    """Library member with borrowing and fine-tracking state."""

    borrowed_books: dict[str, str] = field(default_factory=dict)
    outstanding_fine: float = 0.0

    def borrow(self, book_id: str, due_date: datetime) -> None:
        """Record a borrowed book and due date."""
        self.borrowed_books[book_id] = due_date.isoformat()

    def return_book(self, book_id: str) -> datetime | None:
        """Remove a borrowed book and return its due date if present."""
        due_date = self.borrowed_books.pop(book_id, None)
        if due_date:
            return datetime.fromisoformat(due_date)
        return None

    def calculate_fine(self, due_date: datetime, daily_rate: float) -> float:
        """Calculate overdue fine from due date to now."""
        now = datetime.now()
        overdue_days = (now.date() - due_date.date()).days
        return max(0.0, overdue_days * daily_rate)

    @staticmethod
    def default_due_date(days: int = 14) -> datetime:
        """Return a default due date from current time."""
        return datetime.now() + timedelta(days=days)
