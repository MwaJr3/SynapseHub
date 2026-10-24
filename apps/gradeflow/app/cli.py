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
    p = sub.add_parser("weighted"); p.add_argument("pairs", nargs="+", help="subject=score ...")
    p.add_argument("--weights", nargs="+", required=True, help="subject=weight ...")
    p = sub.add_parser("what-if"); p.add_argument("current_score", type=float); p.add_argument("current_weight", type=float)
    p.add_argument("target", type=float); p.add_argument("remaining_weight", type=float)
    p = sub.add_parser("check-boundaries"); p.add_argument("cutoffs", nargs="+", help="A=70 B=60 ...")
    sub.add_parser("top")
    sub.add_parser("list")
    args = parser.parse_args(argv)
    try:
        gb = load(args.data) if Path(args.data).exists() else Gradebook()
        if args.command == "weighted":
            from .features import apply_weights
            scores = {k: float(v) for k, v in (p.split("=", 1) for p in args.pairs)}
            weights = {k: float(v) for k, v in (p.split("=", 1) for p in args.weights)}
            print(json.dumps(apply_weights(scores, weights), indent=2))
        elif args.command == "what-if":
            from .features import what_if
            print(json.dumps(what_if(args.current_score, args.current_weight, args.target, args.remaining_weight), indent=2))
        elif args.command == "check-boundaries":
            from .features import validate_boundaries
            cutoffs = {k: float(v) for k, v in (p.split("=", 1) for p in args.cutoffs)}
            problems = validate_boundaries(cutoffs)
            print("boundaries OK" if not problems else "\n".join(problems))
        elif args.command == "add-student":
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
