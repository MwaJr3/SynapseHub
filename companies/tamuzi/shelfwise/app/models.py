"""Domain models. A Book title is NOT the same entity as a physical Copy."""
from __future__ import annotations

from dataclasses import dataclass


class LibraryError(ValueError):
    pass


@dataclass
class Book:
    id: int
    title: str
    author: str
    isbn: str = ""


@dataclass
class Copy:
    id: int
    book_id: int
    label: str          # physical copy identifier (shelf label/barcode)
    condition: str = "good"


@dataclass
class Borrower:
    id: int
    name: str
    contact: str = ""


@dataclass
class Loan:
    id: int
    copy_id: int
    borrower_id: int
    borrowed_on: str     # ISO date
    due_on: str          # ISO date
    returned_on: str | None = None
