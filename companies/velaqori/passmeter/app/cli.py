"""CLI: single or batch analysis; inputs are never stored or transmitted."""
from __future__ import annotations

import argparse
import getpass
import json
import sys

from .report import to_json, to_text
from .rules import assess


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="passmeter", description="Locally assess password strength (heuristic).")
    parser.add_argument("--batch-file", help="File with one candidate per line (synthetic test inputs).")
    parser.add_argument("--json", action="store_true", help="Machine-readable output (passwords never included).")
    parser.add_argument("--show-input", action="store_true",
                        help="Echo the assessed value (off by default; values are never logged).")
    args = parser.parse_args(argv)
    try:
        if args.batch_file:
            candidates = [line.rstrip("\n") for line in open(args.batch_file) if line.strip()]
        else:
            candidates = [getpass.getpass("password to assess (hidden input): ")]
        results = []
        for candidate in candidates:
            results.append(assess(candidate))
        if args.json:
            payload = [to_json(r) for r in results]
            print(json.dumps(payload[0] if len(payload) == 1 else payload, indent=2))
        else:
            for candidate, result in zip(candidates, results):
                if args.show_input:
                    print(f"input: {candidate!r}")
                print(to_text(result))
        return 0
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
