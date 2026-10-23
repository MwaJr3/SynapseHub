"""Entry-point script for the banking system software.

Run as:
- `python main.py --mode cli`
- `python main.py --mode gui`
"""
"""Entry point for running the Library Management System as one software."""

from __future__ import annotations

import argparse

from bank_system.cli import run_cli
from bank_system.gui import launch_gui
from bank_system.services import Bank


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Banking System")
    parser.add_argument("--mode", choices=["cli", "gui"], default="cli", help="Choose UI mode")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    bank = Bank()
    if args.mode == "gui":
        launch_gui(bank)
    else:
        run_cli(bank)
from library_management import JSONStorage, LibraryApp, LibraryManager
from library_management.exceptions import LibraryError


class LibraryCLI:
    """Simple CLI interface sharing the same service layer as the GUI."""

    def __init__(self, manager: LibraryManager) -> None:
        self.manager = manager

    def run(self) -> None:
        """Run basic command loop."""
        menu = (
            "\nLibrary Management CLI\n"
            "1. Add Book\n"
            "2. Register Member\n"
            "3. Borrow Book\n"
            "4. Return Book\n"
            "5. Search Books\n"
            "6. List Inventory\n"
            "0. Exit\n"
        )
        while True:
            print(menu)
            choice = input("Select option: ").strip()
            if choice == "0":
                break
            try:
                self._dispatch(choice)
            except (LibraryError, ValueError) as exc:
                print(f"Error: {exc}")

    def _dispatch(self, choice: str) -> None:
        if choice == "1":
            self.manager.add_book(
                input("Book ID: ").strip(),
                input("Title: ").strip(),
                input("Author: ").strip(),
                int(input("Quantity: ").strip()),
            )
            print("Book added.")
        elif choice == "2":
            self.manager.register_member(
                input("Member ID: ").strip(),
                input("Name: ").strip(),
                input("Email: ").strip(),
            )
            print("Member registered.")
        elif choice == "3":
            self.manager.borrow_book(
                input("Member ID: ").strip(),
                input("Book ID: ").strip(),
            )
            print("Book borrowed.")
        elif choice == "4":
            fine = self.manager.return_book(
                input("Member ID: ").strip(),
                input("Book ID: ").strip(),
            )
            print(f"Book returned. Fine: ${fine:.2f}")
        elif choice == "5":
            term = input("Search term: ").strip()
            for book in self.manager.search_books(term):
                print(f"{book.book_id} | {book.title} | {book.author}")
        elif choice == "6":
            for book in self.manager.list_books():
                print(
                    f"{book.book_id} | {book.title} | {book.author} | "
                    f"{book.available_copies}/{book.quantity}"
                )
        else:
            print("Unknown option")


def build_parser() -> argparse.ArgumentParser:
    """CLI parser to choose app mode."""
    parser = argparse.ArgumentParser(description="Library Management System")
    parser.add_argument(
        "--mode",
        default="gui",
        choices=["gui", "cli"],
        help="Run as GUI desktop app or terminal CLI.",
    )
    parser.add_argument(
        "--data-file",
        default="data/library_data.json",
        help="Path to the JSON persistence file.",
    )
    return parser


def main() -> None:
    """Initialize application components and launch requested mode."""
    args = build_parser().parse_args()
    manager = LibraryManager(JSONStorage(args.data_file))

    if args.mode == "cli":
        LibraryCLI(manager).run()
        return

    app = LibraryApp(manager)
    app.mainloop()


if __name__ == "__main__":
    main()
