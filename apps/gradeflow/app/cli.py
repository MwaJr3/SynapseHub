"""Thin CLI over the Gradebook service."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .core import Gradebook, GradebookError
from .storage import load, save


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="gradeflow", description="Record marks and generate student results.")
    parser.add_argument("--data", default="gradebook.json", help="JSON data file (created on save).")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("add-student"); p.add_argument("student_id"); p.add_argument("name")
    p = sub.add_parser("add-mark"); p.add_argument("student_id"); p.add_argument("subject"); p.add_argument("score", type=float)
    p.add_argument("--update", action="store_true", help="Replace an existing mark explicitly.")
    p = sub.add_parser("result"); p.add_argument("student_id")
    sub.add_parser("top")
    sub.add_parser("list")
    args = parser.parse_args(argv)
    try:
        gb = load(args.data) if Path(args.data).exists() else Gradebook()
        if args.command == "add-student":
            gb.add_student(args.student_id, args.name)
        elif args.command == "add-mark":
            gb.add_mark(args.student_id, args.subject, args.score, update=args.update)
        elif args.command == "result":
            print(json.dumps(gb.result_for(args.student_id), indent=2))
        elif args.command == "top":
            print(json.dumps(gb.top_performers(), indent=2))
        elif args.command == "list":
            print(json.dumps(gb.all_results(), indent=2))
        save(gb, args.data)
        return 0
    except GradebookError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
