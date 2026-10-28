"""CLI: analyse saved email files or raw content."""
from __future__ import annotations

import argparse
import json
import sys

from app.parse import ParseError, parse_email
from app.rules import analyse
from app.report import to_text


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="phishlens",
                                     description="Defensively analyse saved email content (never visits URLs).")
    parser.add_argument("email_file", help="Saved email file (.eml / raw text).")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    try:
        raw = open(args.email_file, "rb").read()
        report = analyse(parse_email(raw))
        if args.json:
            print(json.dumps(report.to_dict(), indent=2))
        else:
            print(to_text(report))
        return 0
    except (ParseError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
