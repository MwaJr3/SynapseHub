"""Tkinter GUI interface for the library management system."""

from __future__ import annotations

import tkinter as tk
from tkinter import messagebox, ttk

from .exceptions import LibraryError
from .service import LibraryManager


class LibraryApp(tk.Tk):
    """Main desktop UI for managing books and members."""

    def __init__(self, manager: LibraryManager) -> None:
        super().__init__()
        self.title("Library Management System")
        self.geometry("940x620")
        self.manager = manager
        self._build_ui()

    def _build_ui(self) -> None:
        notebook = ttk.Notebook(self)
        notebook.pack(fill="both", expand=True)

        inventory_frame = ttk.Frame(notebook, padding=12)
        members_frame = ttk.Frame(notebook, padding=12)
        transaction_frame = ttk.Frame(notebook, padding=12)
        search_frame = ttk.Frame(notebook, padding=12)

        notebook.add(inventory_frame, text="Inventory")
        notebook.add(members_frame, text="Members")
        notebook.add(transaction_frame, text="Borrow/Return")
        notebook.add(search_frame, text="Search")

        self._build_inventory_tab(inventory_frame)
        self._build_members_tab(members_frame)
        self._build_transaction_tab(transaction_frame)
        self._build_search_tab(search_frame)

    def _build_inventory_tab(self, parent: ttk.Frame) -> None:
        ttk.Label(parent, text="Book ID").grid(row=0, column=0, sticky="w")
        ttk.Label(parent, text="Title").grid(row=1, column=0, sticky="w")
        ttk.Label(parent, text="Author").grid(row=2, column=0, sticky="w")
        ttk.Label(parent, text="Quantity").grid(row=3, column=0, sticky="w")

        self.book_id_entry = ttk.Entry(parent)
        self.book_title_entry = ttk.Entry(parent)
        self.book_author_entry = ttk.Entry(parent)
        self.book_qty_entry = ttk.Entry(parent)

        self.book_id_entry.grid(row=0, column=1, sticky="ew")
        self.book_title_entry.grid(row=1, column=1, sticky="ew")
        self.book_author_entry.grid(row=2, column=1, sticky="ew")
        self.book_qty_entry.grid(row=3, column=1, sticky="ew")

        ttk.Button(parent, text="Add/Restock Book", command=self._on_add_book).grid(
            row=4, column=0, columnspan=2, pady=10
        )

        self.inventory_text = tk.Text(parent, height=18)
        self.inventory_text.grid(row=5, column=0, columnspan=2, sticky="nsew")

        ttk.Button(parent, text="Refresh Inventory", command=self._refresh_inventory).grid(
            row=6, column=0, columnspan=2, pady=8
        )

        parent.columnconfigure(1, weight=1)
        parent.rowconfigure(5, weight=1)
        self._refresh_inventory()

    def _build_members_tab(self, parent: ttk.Frame) -> None:
        ttk.Label(parent, text="Member ID").grid(row=0, column=0, sticky="w")
        ttk.Label(parent, text="Name").grid(row=1, column=0, sticky="w")
        ttk.Label(parent, text="Email").grid(row=2, column=0, sticky="w")

        self.member_id_entry = ttk.Entry(parent)
        self.member_name_entry = ttk.Entry(parent)
        self.member_email_entry = ttk.Entry(parent)

        self.member_id_entry.grid(row=0, column=1, sticky="ew")
        self.member_name_entry.grid(row=1, column=1, sticky="ew")
        self.member_email_entry.grid(row=2, column=1, sticky="ew")

        ttk.Button(parent, text="Register Member", command=self._on_register_member).grid(
            row=3, column=0, columnspan=2, pady=10
        )

        self.members_text = tk.Text(parent, height=20)
        self.members_text.grid(row=4, column=0, columnspan=2, sticky="nsew")

        ttk.Button(parent, text="Refresh Members", command=self._refresh_members).grid(
            row=5, column=0, columnspan=2, pady=8
        )

        parent.columnconfigure(1, weight=1)
        parent.rowconfigure(4, weight=1)
        self._refresh_members()

    def _build_transaction_tab(self, parent: ttk.Frame) -> None:
        ttk.Label(parent, text="Member ID").grid(row=0, column=0, sticky="w")
        ttk.Label(parent, text="Book ID").grid(row=1, column=0, sticky="w")

        self.tx_member_id_entry = ttk.Entry(parent)
        self.tx_book_id_entry = ttk.Entry(parent)
        self.tx_member_id_entry.grid(row=0, column=1, sticky="ew")
        self.tx_book_id_entry.grid(row=1, column=1, sticky="ew")

        ttk.Button(parent, text="Borrow Book", command=self._on_borrow_book).grid(row=2, column=0, pady=8)
        ttk.Button(parent, text="Return Book", command=self._on_return_book).grid(row=2, column=1, pady=8)

        self.transaction_output = tk.Text(parent, height=22)
        self.transaction_output.grid(row=3, column=0, columnspan=2, sticky="nsew")

        parent.columnconfigure(1, weight=1)
        parent.rowconfigure(3, weight=1)

    def _build_search_tab(self, parent: ttk.Frame) -> None:
        ttk.Label(parent, text="Search by ID/title/author").grid(row=0, column=0, sticky="w")
        self.search_entry = ttk.Entry(parent)
        self.search_entry.grid(row=0, column=1, sticky="ew")

        ttk.Button(parent, text="Search", command=self._on_search).grid(row=1, column=0, columnspan=2, pady=8)

        self.search_output = tk.Text(parent, height=24)
        self.search_output.grid(row=2, column=0, columnspan=2, sticky="nsew")

        parent.columnconfigure(1, weight=1)
        parent.rowconfigure(2, weight=1)

    def _on_add_book(self) -> None:
        try:
            self.manager.add_book(
                book_id=self.book_id_entry.get().strip(),
                title=self.book_title_entry.get().strip(),
                author=self.book_author_entry.get().strip(),
                quantity=int(self.book_qty_entry.get().strip()),
            )
            self._refresh_inventory()
            messagebox.showinfo("Success", "Book added successfully.")
        except (ValueError, LibraryError) as exc:
            messagebox.showerror("Error", str(exc))

    def _on_register_member(self) -> None:
        try:
            self.manager.register_member(
                member_id=self.member_id_entry.get().strip(),
                name=self.member_name_entry.get().strip(),
                email=self.member_email_entry.get().strip(),
            )
            self._refresh_members()
            messagebox.showinfo("Success", "Member registered successfully.")
        except LibraryError as exc:
            messagebox.showerror("Error", str(exc))

    def _on_borrow_book(self) -> None:
        try:
            self.manager.borrow_book(
                member_id=self.tx_member_id_entry.get().strip(),
                book_id=self.tx_book_id_entry.get().strip(),
            )
            self.transaction_output.insert("end", "Borrowed successfully.\n")
            self._refresh_inventory()
            self._refresh_members()
        except LibraryError as exc:
            messagebox.showerror("Borrow Error", str(exc))

    def _on_return_book(self) -> None:
        try:
            fine = self.manager.return_book(
                member_id=self.tx_member_id_entry.get().strip(),
                book_id=self.tx_book_id_entry.get().strip(),
            )
            self.transaction_output.insert("end", f"Returned successfully. Fine: ${fine:.2f}\n")
            self._refresh_inventory()
            self._refresh_members()
        except LibraryError as exc:
            messagebox.showerror("Return Error", str(exc))

    def _on_search(self) -> None:
        keyword = self.search_entry.get().strip()
        books = self.manager.search_books(keyword)
        self.search_output.delete("1.0", "end")
        if not books:
            self.search_output.insert("end", "No matching books found.\n")
            return

        for book in books:
            self.search_output.insert(
                "end",
                f"{book.book_id} | {book.title} | {book.author} | "
                f"{book.available_copies}/{book.quantity} available\n",
            )

    def _refresh_inventory(self) -> None:
        self.inventory_text.delete("1.0", "end")
        for book in self.manager.list_books():
            self.inventory_text.insert(
                "end",
                f"{book.book_id} | {book.title} | {book.author} | "
                f"{book.available_copies}/{book.quantity} available\n",
            )

    def _refresh_members(self) -> None:
        self.members_text.delete("1.0", "end")
        for member in self.manager.list_members():
            self.members_text.insert(
                "end",
                f"{member.person_id} | {member.name} | {member.email} | "
                f"Borrowed: {len(member.borrowed_books)} | Fine: ${member.outstanding_fine:.2f}\n",
            )
