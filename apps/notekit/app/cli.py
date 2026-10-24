"""Thin CLI over Notes."""
from __future__ import annotations

import argparse
import sys

from app.services import NoteError, Notes


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="notekit", description="Record, organise and search knowledge.")
    parser.add_argument("--db", default="notekit.db")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("add"); p.add_argument("title"); p.add_argument("body"); p.add_argument("--topic", default="")
    p = sub.add_parser("edit"); p.add_argument("id", type=int); p.add_argument("--title"); p.add_argument("--body")
    p = sub.add_parser("tag"); p.add_argument("id", type=int); p.add_argument("tag")
    p = sub.add_parser("link"); p.add_argument("from_id", type=int); p.add_argument("to_id", type=int)
    p.add_argument("--relation", default="related")
    p = sub.add_parser("source"); p.add_argument("title"); p.add_argument("--note", type=int)
    p.add_argument("--kind", default="book"); p.add_argument("--ref", default="")
    p = sub.add_parser("lesson"); p.add_argument("note_id", type=int); p.add_argument("summary")
    p = sub.add_parser("search"); p.add_argument("query")
    p = sub.add_parser("related"); p.add_argument("id", type=int)
    p = sub.add_parser("versions"); p.add_argument("id", type=int)
    args = parser.parse_args(argv)
    try:
        n = Notes(args.db)
        if args.command == "add":
            print(f"note #{n.add_note(args.title, args.body, args.topic)}")
        elif args.command == "edit":
            r = n.edit_note(args.id, args.title, args.body)
            print(f"updated note #{r['note_id']} (previous version saved)")
        elif args.command == "tag":
            n.add_tag(args.id, args.tag); print("tagged")
        elif args.command == "link":
            n.link(args.from_id, args.to_id, args.relation); print("linked")
        elif args.command == "source":
            print(f"source #{n.add_source(args.note, args.title, args.kind, args.ref)}")
        elif args.command == "lesson":
            print(f"lesson #{n.add_lesson(args.note_id, args.summary)}")
        elif args.command == "search":
            for r in n.search(args.query):
                print(f"#{r['id']} [{r['topic']}] {r['title']}")
        elif args.command == "related":
            for r in n.related(args.id):
                print(f"#{r['id']} ({r['relation']}) {r['title']}")
        else:
            for v in n.versions(args.id):
                print(f"version #{v['id']} saved {v['saved_at']}: {v['title']}")
        return 0
    except NoteError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
