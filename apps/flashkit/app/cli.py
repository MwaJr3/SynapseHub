"""Thin CLI over Flashcards."""
from __future__ import annotations

import argparse
import sys
from datetime import date

from app.services import FlashcardError, Flashcards


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="flashkit", description="Study with flashcards.")
    parser.add_argument("--db", default="flashkit.db")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("add-deck"); p.add_argument("name"); p.add_argument("--subject", default="")
    p = sub.add_parser("add-card"); p.add_argument("deck_id", type=int); p.add_argument("front"); p.add_argument("back")
    p = sub.add_parser("due"); p.add_argument("deck_id", type=int)
    p = sub.add_parser("review"); p.add_argument("card_id", type=int)
    p.add_argument("--correct", action="store_true"); p.add_argument("--confidence", type=int, default=3)
    p = sub.add_parser("progress"); p.add_argument("deck_id", type=int)
    args = parser.parse_args(argv)
    try:
        fc = Flashcards(args.db)
        if args.command == "add-deck":
            print(f"deck #{fc.add_deck(args.name, args.subject)}")
        elif args.command == "add-card":
            print(f"card #{fc.add_card(args.deck_id, args.front, args.back)}")
        elif args.command == "due":
            for c in fc.due_cards(args.deck_id):
                print(f"#{c['id']} due {c['due_on']}  {c['front']}")
        elif args.command == "review":
            r = fc.review(args.card_id, args.correct, args.confidence)
            print(f"recorded: next due {r['due_on']} (interval {r['interval_days']}d)")
        else:
            print(fc.progress(args.deck_id))
        return 0
    except FlashcardError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
