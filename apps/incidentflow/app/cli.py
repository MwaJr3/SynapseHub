"""Thin CLI over EvidenceStore."""
from __future__ import annotations

import argparse
import json
import sys

from app.intake import IntakeError
from app.services import EvidenceError, EvidenceStore


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="incidentflow", description="Record and analyse digital evidence (read-only sources).")
    parser.add_argument("--db", default="evidence.db")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("collect"); p.add_argument("path"); p.add_argument("--actor", required=True); p.add_argument("--notes", default="")
    p = sub.add_parser("verify"); p.add_argument("evidence_id", type=int); p.add_argument("--actor", required=True)
    p = sub.add_parser("note"); p.add_argument("evidence_id", type=int); p.add_argument("result"); p.add_argument("--actor", required=True)
    p = sub.add_parser("search"); p.add_argument("query")
    sub.add_parser("timeline")
    sub.add_parser("report")
    args = parser.parse_args(argv)
    try:
        store = EvidenceStore(args.db)
        if args.command == "collect":
            print(json.dumps(store.add_evidence(args.path, args.actor, args.notes), indent=2))
        elif args.command == "verify":
            print(json.dumps(store.verify_hash(args.evidence_id, args.actor), indent=2))
        elif args.command == "note":
            store.log_action(args.evidence_id, "analyst-note", args.actor, args.result)
            print("recorded")
        elif args.command == "search":
            for row in store.search(args.query):
                print(f"#{row['id']} {row['path']} ({row['sha256'][:12]}…)")
        elif args.command == "timeline":
            for row in store.timeline():
                print(f"{row['timestamp']}  [{row['source']}] {row['description']}")
        else:
            print(json.dumps(store.report(), indent=2))
        return 0
    except (IntakeError, EvidenceError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
