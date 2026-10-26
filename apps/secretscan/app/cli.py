"""CLI: scoped scanning with redacted, machine-readable output."""
from __future__ import annotations

import argparse
import sys

from app.scanner import scan


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="secretscan",
                                     description="Scan an explicitly selected directory for secret candidates.")
    parser.add_argument("root", help="Directory to scan (explicit scope; excluded dirs are skipped).")
    parser.add_argument("--json", help="Write a redacted JSON report to this path.")
    parser.add_argument("--fail-on-findings", action="store_true",
                        help="Exit 1 when candidates are found (for pre-commit hooks).")
    args = parser.parse_args(argv)
    try:
        report = scan(args.root)
        for f in report.findings:
            print(f"[{f.severity}] {f.file}:{f.line} {f.title}: {f.redacted}")
        for s in report.skipped:
            print(f"skipped: {s}")
        print(f"scanned {report.files_scanned} file(s); {len(report.findings)} candidate(s).")
        print("Candidates are not confirmed credentials; values are redacted.")
        if args.json:
            open(args.json, "w").write(report.to_json())
        return 1 if (args.fail_on_findings and report.findings) else 0
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
