"""CLI: scan lab samples and emit findings with evidence and fixes."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.extract import scan_markup, scan_python
from app.findings import SEVERITY_NOTE


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="secweblab",
                                     description="Security code-review lab (in-repo samples only; passive analysis).")
    parser.add_argument("path", help="Lab sample file or directory (in-repo).")
    parser.add_argument("--json", action="store_true", help="Emit JSON findings.")
    args = parser.parse_args(argv)
    try:
        root = Path(args.path)
        files = sorted(root.rglob("*")) if root.is_dir() else [root]
        all_findings = []
        for f in files:
            if not f.is_file() or f.suffix not in (".html", ".py", ".md", ".txt"):
                continue
            text = f.read_text()
            fs = scan_markup(text, str(f)) + scan_python(text, str(f))
            all_findings.extend(fs)
        if args.json:
            print(json.dumps({"findings": [f.to_dict() for f in all_findings],
                              "count": len(all_findings),
                              "limitations": ("Passive analysis only; no execution/exploitation. "
                                              "Findings are discussion starting points, NOT proof. " + SEVERITY_NOTE)}, indent=2))
        else:
            for f in all_findings:
                print(f"[{f.severity}] {f.vulnerability_class}\n  location: {f.location}\n  evidence: {f.evidence[:120]}...\n  fix: {f.candidate_fix}\n")
            print(f"{len(all_findings)} finding(s).")
            print("Passive analysis only — findings are starting points, NOT proof of exploitability.")
            print("Absence of findings is NOT proof of safety.")
        return 0
    except OSError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
