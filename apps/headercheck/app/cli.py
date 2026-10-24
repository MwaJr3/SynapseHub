"""CLI: evaluate saved response dumps; live mode requires an allowlist."""
from __future__ import annotations

import argparse
import json
import sys

from app.rules import evaluate
from app.targets import TargetError, assert_allowed, load_fixture


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="headercheck",
                                     description="Evaluate HTTP security headers from saved response fixtures.")
    parser.add_argument("fixture", help="JSON response dump (url, status, headers, redirects).")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    try:
        dump = load_fixture(args.fixture)
        findings = evaluate(dump.headers)
        payload = {
            "url": dump.url, "status": dump.status, "redirects": dump.redirects,
            "findings": [f.__dict__ for f in findings],
            "note": "Severity depends on application architecture; missing headers are not equal-weight "
                    "vulnerabilities. Evaluations are guidance for review, not proof of insecurity.",
        }
        if args.json:
            print(json.dumps(payload, indent=2))
        else:
            print(f"{dump.url} (status {dump.status})")
            for r in dump.redirects:
                print(f"  redirect: {r}")
            for f in findings:
                print(f"[{f.severity.upper():13}] {f.title}")
                print(f"    why: {f.explanation}")
                print(f"    fix: {f.remediation}")
            print(payload["note"])
        return 0
    except (TargetError, OSError, json.JSONDecodeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
