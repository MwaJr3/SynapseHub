"""Core service layer containing business logic for the library application."""

from __future__ import annotations

from datetime import datetime

from .exceptions import (
    BookNotFoundError,
    BookUnavailableError,
    MemberNotFoundError,
    ValidationError,
)
from .models import Book, Member
from .persistence import JSONStorage


class LibraryManager:
    """Coordinates inventory, members, borrowing and fine workflows."""

    def __init__(self, storage: JSONStorage) -> None:
        self._storage = storage
        self._books: dict[str, Book] = {}
        self._members: dict[str, Member] = {}
        self._daily_fine_rate: float = 1.0
        self._load_state()

    @property
    def daily_fine_rate(self) -> float:
        """Expose current fine rate as read-only property."""
        return self._daily_fine_rate

    def set_daily_fine_rate(self, rate: float) -> None:
        """Update fine rate with validation."""
        if rate < 0:
            raise ValidationError("Fine rate cannot be negative.")
        self._daily_fine_rate = rate
        self._persist()

    def add_book(self, book_id: str, title: str, author: str, quantity: int = 1) -> None:
        """Add a new book or increment existing quantity."""
        if quantity <= 0:
            raise ValidationError("Book quantity must be greater than zero.")

        existing = self._books.get(book_id)
        if existing:
            existing.quantity += quantity
            existing.available_copies += quantity
        else:
            self._books[book_id] = Book(
                book_id=book_id,
                title=title,
                author=author,
                quantity=quantity,
                available_copies=quantity,
            )
        self._persist()

    def register_member(self, member_id: str, name: str, email: str) -> None:
        """Create or update member profile."""
        if "@" not in email:
            raise ValidationError("Member email must contain '@'.")

        self._members[member_id] = Member(person_id=member_id, name=name, email=email)
        self._persist()

    def borrow_book(self, member_id: str, book_id: str, due_date: datetime | None = None) -> None:
        """Borrow a book for a member and reserve an available copy."""
        member = self._members.get(member_id)
        if not member:
            raise MemberNotFoundError(f"Member '{member_id}' does not exist.")

        book = self._books.get(book_id)
        if not book:
            raise BookNotFoundError(f"Book '{book_id}' does not exist.")

        if book.available_copies <= 0:
            raise BookUnavailableError(f"Book '{book_id}' is out of stock.")

        target_due_date = due_date or Member.default_due_date()
        member.borrow(book_id, target_due_date)
        book.available_copies -= 1
        self._persist()

    def return_book(self, member_id: str, book_id: str) -> float:
        """Return borrowed book and apply overdue fine if required."""
        member = self._members.get(member_id)
        if not member:
            raise MemberNotFoundError(f"Member '{member_id}' does not exist.")

        book = self._books.get(book_id)
        if not book:
            raise BookNotFoundError(f"Book '{book_id}' does not exist.")

        due_date = member.return_book(book_id)
        if due_date is None:
            raise ValidationError(f"Book '{book_id}' was not borrowed by '{member_id}'.")

        book.available_copies += 1
        fine = member.calculate_fine(due_date, self._daily_fine_rate)
        member.outstanding_fine += fine
        self._persist()
        return fine

    def pay_fine(self, member_id: str, amount: float) -> float:
        """Pay part or all of outstanding fine and return remaining balance."""
        member = self._members.get(member_id)
        if not member:
            raise MemberNotFoundError(f"Member '{member_id}' does not exist.")

        if amount <= 0:
            raise ValidationError("Fine payment must be greater than zero.")

        member.outstanding_fine = max(0.0, member.outstanding_fine - amount)
        self._persist()
        return member.outstanding_fine

    def search_books(self, keyword: str) -> list[Book]:
        """Search books by ID, title, or author using case-insensitive match."""
        text = keyword.lower().strip()
        return [
            book
            for book in self._books.values()
            if text in book.book_id.lower()
            or text in book.title.lower()
            or text in book.author.lower()
        ]

    def list_books(self) -> list[Book]:
        """Return all books sorted by book ID."""
        return sorted(self._books.values(), key=lambda item: item.book_id)

    def list_members(self) -> list[Member]:
        """Return all members sorted by member ID."""
        return sorted(self._members.values(), key=lambda item: item.person_id)

    def _load_state(self) -> None:
        raw_data = self._storage.load()
        self._daily_fine_rate = float(raw_data.get("settings", {}).get("daily_fine_rate", 1.0))

        self._books = {
            row["book_id"]: Book(**row)
            for row in raw_data.get("books", [])
        }
        self._members = {
            row["person_id"]: Member(**row)
            for row in raw_data.get("members", [])
        }

    def _persist(self) -> None:
        payload = {
            "books": [book.to_dict() for book in self._books.values()],
            "members": [member.to_dict() for member in self._members.values()],
            "settings": {"daily_fine_rate": self._daily_fine_rate},
        }
        self._storage.save(payload)
