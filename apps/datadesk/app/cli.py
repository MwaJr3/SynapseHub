"""CLI: analyse a CSV and write HTML/JSON reports."""
from __future__ import annotations

import argparse
import sys

from app.analysis import column_stats, group_totals
from app.ingest import IngestError, coerce_numeric, load_csv
from app.report import build_json, build_report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="datadesk", description="Analyse a CSV dataset.")
    parser.add_argument("csv_file")
    parser.add_argument("--require", action="append", default=[], help="Required column (repeatable).")
    parser.add_argument("--numeric", action="append", default=[], help="Numeric column to summarise (repeatable).")
    parser.add_argument("--group-by")
    parser.add_argument("--value")
    parser.add_argument("--html", help="Write an HTML report.")
    parser.add_argument("--json", dest="json_out", help="Write a JSON report.")
    args = parser.parse_args(argv)
    try:
        ds = coerce_numeric(load_csv(args.csv_file, args.require or None))
        numeric = args.numeric or ds.numeric_columns
        stats = [column_stats(ds, c) for c in numeric]
        groups = group_totals(ds, args.group_by, args.value) if args.group_by and args.value else []
        if args.html:
            open(args.html, "w").write(build_report(ds, stats, groups, args.group_by or "group"))
            print(f"wrote {args.html}")
        if args.json_out:
            open(args.json_out, "w").write(build_json(ds, stats, groups))
            print(f"wrote {args.json_out}")
        if not args.html and not args.json_out:
            for s in stats:
                print(f"{s.column}: n={s.count} missing={s.missing} mean={s.mean} median={s.median} "
                      f"std={s.std} min={s.min} max={s.max} slope/row={s.slope_per_row}")
            for g, v, n in groups:
                print(f"{g}: total={v} (n={n})")
            for warning in ds.warnings:
                print(f"note: {warning}")
        return 0
    except (IngestError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
