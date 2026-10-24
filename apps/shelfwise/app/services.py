"""Library services: catalogue, circulation, overdue rules, inventory."""
from __future__ import annotations

from datetime import date, timedelta

from .db import connect
from .models import LibraryError

LOAN_DAYS = 14          # configurable overdue rule (documented default)


class Library:
    def __init__(self, db_path: str, loan_days: int = LOAN_DAYS) -> None:
        self.conn = connect(db_path)
        self.loan_days = loan_days

    # -- catalogue ------------------------------------------------------
    def add_book(self, title: str, author: str, isbn: str = "") -> int:
        if not title.strip() or not author.strip():
            raise LibraryError("Title and author are required.")
        cur = self.conn.execute("INSERT INTO books(title, author, isbn) VALUES (?,?,?)",
                                (title.strip(), author.strip(), isbn.strip()))
        self.conn.commit()
        return cur.lastrowid

    def add_copy(self, book_id: int, label: str, condition: str = "good") -> int:
        if not label.strip():
            raise LibraryError("Copy label is required.")
        if not self.conn.execute("SELECT 1 FROM books WHERE id=?", (book_id,)).fetchone():
            raise LibraryError(f"No book {book_id}.")
        try:
            cur = self.conn.execute("INSERT INTO copies(book_id, label, condition) VALUES (?,?,?)",
                                    (book_id, label.strip(), condition))
        except Exception as exc:  # unique constraint
            raise LibraryError(f"Copy label {label!r} already exists.") from exc
        self.conn.commit()
        return cur.lastrowid

    def register_borrower(self, name: str, contact: str = "") -> int:
        if not name.strip():
            raise LibraryError("Borrower name is required.")
        cur = self.conn.execute("INSERT INTO borrowers(name, contact) VALUES (?,?)",
                                (name.strip(), contact.strip()))
        self.conn.commit()
        return cur.lastrowid

    def search(self, query: str) -> list[dict]:
        like = f"%{query.strip()}%"
        rows = self.conn.execute(
            "SELECT * FROM books WHERE title LIKE ? COLLATE NOCASE OR author LIKE ? COLLATE NOCASE "
            "ORDER BY title", (like, like)).fetchall()
        return [dict(r) for r in rows]

    # -- circulation ----------------------------------------------------
    def borrow(self, copy_id: int, borrower_id: int, today: date | None = None) -> int:
        today = today or date.today()
        copy = self.conn.execute("SELECT * FROM copies WHERE id=?", (copy_id,)).fetchone()
        if not copy:
            raise LibraryError(f"No copy {copy_id}.")
        if not self.conn.execute("SELECT 1 FROM borrowers WHERE id=?", (borrower_id,)).fetchone():
            raise LibraryError(f"No borrower {borrower_id}.")
        open_loan = self.conn.execute(
            "SELECT 1 FROM loans WHERE copy_id=? AND returned_on IS NULL", (copy_id,)).fetchone()
        if open_loan:
            raise LibraryError(f"Copy {copy_id} is already on loan; a copy can only be borrowed once at a time.")
        due = today + timedelta(days=self.loan_days)
        cur = self.conn.execute(
            "INSERT INTO loans(copy_id, borrower_id, borrowed_on, due_on) VALUES (?,?,?,?)",
            (copy_id, borrower_id, today.isoformat(), due.isoformat()))
        self.conn.commit()
        return cur.lastrowid

    def return_copy(self, copy_id: int, today: date | None = None) -> dict:
        today = today or date.today()
        loan = self.conn.execute(
            "SELECT * FROM loans WHERE copy_id=? AND returned_on IS NULL", (copy_id,)).fetchone()
        if not loan:
            raise LibraryError(f"Copy {copy_id} is not on loan.")
        self.conn.execute("UPDATE loans SET returned_on=? WHERE id=?", (today.isoformat(), loan["id"]))
        self.conn.commit()
        overdue = date.fromisoformat(loan["due_on"]) < today
        return {"loan_id": loan["id"], "returned_on": today.isoformat(), "was_overdue": overdue}

    def overdue_loans(self, today: date | None = None) -> list[dict]:
        today = today or date.today()
        rows = self.conn.execute(
            "SELECT loans.*, copies.label, borrowers.name FROM loans "
            "JOIN copies ON copies.id = loans.copy_id "
            "JOIN borrowers ON borrowers.id = loans.borrower_id "
            "WHERE loans.returned_on IS NULL AND loans.due_on < ? ORDER BY loans.due_on",
            (today.isoformat(),)).fetchall()
        return [dict(r) for r in rows]

    def inventory(self) -> list[dict]:
        rows = self.conn.execute(
            "SELECT b.id, b.title, b.author, COUNT(c.id) AS copies, "
            "SUM(CASE WHEN EXISTS (SELECT 1 FROM loans l WHERE l.copy_id=c.id AND l.returned_on IS NULL) "
            "THEN 0 ELSE 1 END) AS available "
            "FROM books b LEFT JOIN copies c ON c.book_id=b.id GROUP BY b.id ORDER BY b.title").fetchall()
        return [dict(r) for r in rows]
