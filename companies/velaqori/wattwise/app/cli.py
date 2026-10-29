"""Thin CLI over Store."""
from __future__ import annotations

import argparse
import sys

from app.analysis import EnergyError
from app.services import Store


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="wattwise", description="Track and analyse home energy use.")
    parser.add_argument("--db", default="wattwise.db")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("add"); p.add_argument("meter"); p.add_argument("ts"); p.add_argument("kwh", type=float)
    p.add_argument("--kind", choices=["interval", "meter_total"], default="interval")
    p = sub.add_parser("import-csv"); p.add_argument("meter"); p.add_argument("csv_file")
    p.add_argument("--kind", choices=["interval", "meter_total"], default="interval")
    p = sub.add_parser("tariff"); p.add_argument("name"); p.add_argument("rate", type=float)
    p.add_argument("--standing", type=float, default=0.0); p.add_argument("--from", dest="valid_from", required=True)
    p = sub.add_parser("usage"); p.add_argument("meter"); p.add_argument("--from", dest="start"); p.add_argument("--to", dest="end")
    p = sub.add_parser("anomalies"); p.add_argument("meter"); p.add_argument("--multiplier", type=float, default=2.0)
    p = sub.add_parser("forecast"); p.add_argument("meter"); p.add_argument("--periods", type=int, default=7)
    p = sub.add_parser("scenario"); p.add_argument("meter"); p.add_argument("reduction_pct", type=float)
    args = parser.parse_args(argv)
    try:
        store = Store(args.db)
        if args.command == "add":
            store.add_reading(args.meter, args.ts, args.kwh, args.kind); print("recorded")
        elif args.command == "import-csv":
            print(store.import_csv(args.meter, open(args.csv_file).read(), args.kind))
        elif args.command == "tariff":
            print(f"tariff #{store.add_tariff(args.name, args.rate, args.standing, args.valid_from)}")
        elif args.command == "usage":
            print(store.usage(args.meter, args.start, args.end))
        elif args.command == "anomalies":
            for a in store.anomalies(args.meter, args.multiplier):
                print(a)
        elif args.command == "forecast":
            print(store.forecast(args.meter, args.periods))
        else:
            print(store.scenario(args.meter, args.reduction_pct))
        return 0
    except EnergyError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
