"""CLI: analyse a log file and print incident summaries."""
from __future__ import annotations

import argparse
import json
import sys

from app.detect import detect, summarise_findings
from app.parse import parse_log


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="loginsense",
                                     description="Detect suspicious login patterns in auth logs (synthetic/anonymised data).")
    parser.add_argument("logfile")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    try:
        text = open(args.logfile, encoding="utf-8", errors="replace").read()
        events = parse_log(text)
        findings = detect(events)
        payload = summarise_findings(findings, events)
        if args.json:
            print(json.dumps(payload, indent=2))
        else:
            print(f"normalised events: {len(events)}")
            for f in findings:
                print(f"[risk {f.risk}] {f.title}")
                for s in f.signals:
                    print(f"  signal: {s}")
            print(payload["disclaimer"])
        return 0
    except OSError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
