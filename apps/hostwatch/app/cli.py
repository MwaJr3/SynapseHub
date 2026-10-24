"""CLI: observe explicitly scoped paths and process metadata."""
from __future__ import annotations

import argparse
import json
import sys

from app.collectors import SystemCollector
from app.rules import evaluate


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="hostwatch",
                                     description="Observe file locations and process metadata (read-only).")
    parser.add_argument("--watch", action="append", default=[], help="Explicit path to observe (repeatable).")
    parser.add_argument("--hash", action="store_true", help="Also compute SHA-256 for watched files.")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    try:
        report = SystemCollector().collect(args.watch)
        if args.hash:
            from app.files import scan_paths
            report.file_facts = scan_paths(args.watch, hash_files=True)
        alerts = evaluate(report)
        payload = {"collected_at": report.collected_at,
                   "processes": len(report.processes), "file_facts": len(report.file_facts),
                   **alerts.to_dict()}
        if args.json:
            print(json.dumps(payload, indent=2))
        else:
            print(f"collected {len(report.processes)} process(es), {len(report.file_facts)} file fact(s)")
            for a in alerts.alerts:
                print(f"[{a.severity}] {a.title}: {a.explanation}")
            print(payload["disclaimer"])
        return 0
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
