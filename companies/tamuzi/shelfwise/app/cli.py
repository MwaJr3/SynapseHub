"""Thin CLI over the Library service."""
from __future__ import annotations

import argparse
import sys

from app.models import LibraryError
from app.services import Library


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="shelfwise", description="Manage a small library.")
    parser.add_argument("--db", default="library.db")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("hold"); p.add_argument("title_id"); p.add_argument("member")
    p = sub.add_parser("holds"); p.add_argument("title_id")
    p = sub.add_parser("overdue"); p.add_argument("loans_json"); p.add_argument("--today", required=True)
    p = sub.add_parser("extend"); p.add_argument("loan_json"); p.add_argument("--today", required=True)
    p.add_argument("--days", type=int, default=7)
    p = sub.add_parser("add-book"); p.add_argument("title"); p.add_argument("author"); p.add_argument("--isbn", default="")
    p = sub.add_parser("add-copy"); p.add_argument("book_id", type=int); p.add_argument("label")
    p = sub.add_parser("register"); p.add_argument("name"); p.add_argument("--contact", default="")
    p = sub.add_parser("search"); p.add_argument("query")
    p = sub.add_parser("borrow"); p.add_argument("copy_id", type=int); p.add_argument("borrower_id", type=int)
    p = sub.add_parser("return"); p.add_argument("copy_id", type=int)
    sub.add_parser("overdue")
    sub.add_parser("inventory")
    args = parser.parse_args(argv)
    try:
        lib = Library(args.db)
        if args.command == "hold":
            from .features import HoldQueue
            q = HoldQueue()
            q.place_hold(args.title_id, args.member)
            print(f"hold placed for {args.member} on {args.title_id}")
        elif args.command == "holds":
            from .features import HoldQueue
            print(HoldQueue().queues.get(args.title_id, []))
        elif args.command == "overdue":
            from .features import overdue_report
            loans = json.loads(args.loans_json)
            print(json.dumps(overdue_report(loans, args.today), indent=2))
        elif args.command == "extend":
            from .features import extend_loan
            print(json.dumps(extend_loan(json.loads(args.loan_json), args.today, args.days), indent=2))
 == "add-book":
            print(f"book #{lib.add_book(args.title, args.author, args.isbn)}")
        elif args.command == "add-copy":
            print(f"copy #{lib.add_copy(args.book_id, args.label)}")
        elif args.command == "register":
            print(f"borrower #{lib.register_borrower(args.name, args.contact)}")
        elif args.command == "search":
            for b in lib.search(args.query):
                print(f"#{b['id']} {b['title']} — {b['author']}")
        elif args.command == "borrow":
            print(f"loan #{lib.borrow(args.copy_id, args.borrower_id)}")
        elif args.command == "return":
            r = lib.return_copy(args.copy_id)
            print(f"returned (was_overdue={r['was_overdue']})")
        elif args.command == "overdue":
            for row in lib.overdue_loans():
                print(f"loan #{row['id']} copy {row['label']} to {row['name']} due {row['due_on']}")
        elif args.command == "inventory":
            for row in lib.inventory():
                print(f"{row['title']}: {row['available']}/{row['copies']} available")
        return 0
    except LibraryError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
