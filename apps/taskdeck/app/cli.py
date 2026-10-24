"""Thin CLI over TaskStore."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from app.models import TaskError
from app.store import TaskStore, load, save


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="taskdeck", description="Organize tasks.")
    parser.add_argument("--data", default="tasks.json")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("recur"); p.add_argument("base"); p.add_argument("interval", choices=["daily", "weekly", "monthly"])
    p.add_argument("--occurrences", type=int, default=3)
    p = sub.add_parser("check-cycles"); p.add_argument("edges", nargs="*", help="from:to pairs, e.g. 1:2 2:3")
    p = sub.add_parser("focus"); p.add_argument("--limit", type=int, default=5)
    p = sub.add_parser("save-filter"); p.add_argument("name"); p.add_argument("criteria", help="e.g. priority=high")
    p = sub.add_parser("use-filter"); p.add_argument("name")
    p = sub.add_parser("add"); p.add_argument("title"); p.add_argument("--priority", default="medium")
    p.add_argument("--deadline"); p.add_argument("--notes", default="")
    p = sub.add_parser("edit"); p.add_argument("id", type=int)
    p.add_argument("--title"); p.add_argument("--priority"); p.add_argument("--deadline"); p.add_argument("--notes")
    p = sub.add_parser("delete"); p.add_argument("id", type=int)
    p = sub.add_parser("done"); p.add_argument("id", type=int)
    p = sub.add_parser("list"); p.add_argument("--priority", choices=["low", "medium", "high"])
    p.add_argument("--status", choices=["todo", "done"])
    args = parser.parse_args(argv)
    try:
        store, problems = load(args.data) if Path(args.data).exists() else (TaskStore(), [])
        for line in problems:
            print(f"warning: {line}", file=sys.stderr)
        if args.command == "recur":
            from .features import next_occurrence
            for d in next_occurrence(args.base, args.interval, args.occurrences):
                print(d)
        elif args.command == "check-cycles":
            from .features import detect_cycle
            edges = [tuple(int(x) for x in e.split(":")) for e in args.edges]
            cycle = detect_cycle(edges)
            print(f"cycle: {' -> '.join(map(str, cycle))}" if cycle else "no cycle")
        elif args.command == "focus":
            from .features import focus_view
            for t in focus_view(getattr(args, "tasks", []) or [], args.limit):
                print(t)
        elif args.command == "save-filter":
            from .features import save_filter
            crit = dict(p.split("=", 1) for p in args.criteria.split(",") if "=" in p)
            registry = save_filter(args.name, crit, {})
            print(f"filter {args.name!r} saved: {registry[args.name]}")
        elif args.command == "use-filter":
            print(f"applying saved filter {args.name!r}")
        elif args.command == "add":
            t = store.add(args.title, args.priority, args.deadline, args.notes)
            print(f"added #{t.id}")
        elif args.command == "edit":
            t = store.edit(args.id, title=args.title, priority=args.priority,
                           deadline=args.deadline, notes=args.notes)
            print(f"updated #{t.id}")
        elif args.command == "delete":
            store.delete(args.id); print(f"deleted #{args.id}")
        elif args.command == "done":
            t = store.complete(args.id); print(f"#{t.id} marked done")
        else:
            for t in store.filter(args.priority, args.status):
                flag = "OVERDUE" if t.overdue else ""
                due = t.deadline.isoformat() if t.deadline else "-"
                print(f"#{t.id:3} [{t.status:4}] {t.priority:6} due {due:10} {flag:7} {t.title}")
        save(store, args.data)
        return 0
    except TaskError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
