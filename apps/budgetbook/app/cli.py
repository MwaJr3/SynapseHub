"""Thin CLI over the Ledger."""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

from .core import BudgetError, Ledger
from .storage import load, save


def _money(v):
    return float(v)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="budgetbook", description="Track income and expenses honestly.")
    parser.add_argument("--data", default="budget.json")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("add"); p.add_argument("kind", choices=["income", "expense", "refund"])
    p.add_argument("category"); p.add_argument("description"); p.add_argument("amount"); p.add_argument("date")
    p = sub.add_parser("edit"); p.add_argument("id", type=int)
    p.add_argument("--amount"); p.add_argument("--description"); p.add_argument("--category")
    p.add_argument("--reason", required=True)
    p = sub.add_parser("summary"); p.add_argument("--from", dest="start", required=True); p.add_argument("--to", dest="end", required=True)
    p = sub.add_parser("categories"); p.add_argument("--from", dest="start", required=True); p.add_argument("--to", dest="end", required=True)
    p = sub.add_parser("import-csv"); p.add_argument("path")
    p = sub.add_parser("add-template"); p.add_argument("name"); p.add_argument("kind", choices=["income", "expense", "refund"])
    p.add_argument("amount", type=float); p.add_argument("interval", choices=["daily", "weekly", "monthly"])
    p.add_argument("start"); p.add_argument("--description", default="")
    p = sub.add_parser("materialize"); p.add_argument("upto")
    sub.add_parser("list")
    sub.add_parser("monthly")
    args = parser.parse_args(argv)
    try:
        ledger = load(args.data) if Path(args.data).exists() else Ledger()
        if args.command == "import-csv":
            from .features import import_csv
            result = import_csv(open(args.path).read())
            print(json.dumps({"imported": len(result["imported"]),
                              "rejected": result["rejected"], "duplicates": result["duplicates"],
                              "note": result["note"]}, indent=2))
        elif args.command == "add-template":
            from .features import RecurringTemplate
            tpl = RecurringTemplate(args.name, args.kind, args.amount, args.interval, args.start, args.description)
            globals()["_TEMPLATES"] = globals().get("_TEMPLATES", []) + [tpl]
            print(f"template {args.name!r} added ({len(globals()['_TEMPLATES'])} total this run)")
        elif args.command == "materialize":
            from .features import RecurringTemplate
            templates = globals().get("_TEMPLATES", [])
            if not templates:
                print("no templates defined in this run (add-template first)")
            for tpl in templates:
                for row in tpl.materialize(args.upto):
                    print(row)
        elif args.command == "add":
            t = ledger.add(args.kind, args.category, args.description, args.amount, args.date)
            print(f"recorded #{t.id} {t.kind} {t.amount}")
        elif args.command == "edit":
            txn = ledger.edit(args.id, amount=args.amount, description=args.description,
                              category=args.category, reason=args.reason)
            print(f"corrected #{txn.id} with audit note")
        elif args.command == "summary":
            s = ledger.summary(date.fromisoformat(args.start), date.fromisoformat(args.end))
            print(json.dumps({k: (_money(v) if hasattr(v, "quantize") else v) for k, v in s.items()}, indent=2))
        elif args.command == "categories":
            for c, v in ledger.top_categories(date.fromisoformat(args.start), date.fromisoformat(args.end)):
                print(f"{c}: {v}")
        elif args.command == "list":
            for t in ledger.transactions():
                print(f"#{t.id} {t.date} {t.kind:7} {t.category:12} {t.amount}  {t.description}")
        elif args.command == "monthly":
            for month, row in ledger.monthly_breakdown().items():
                print(f"{month}  income {_money(row['income'])}  expenditure {_money(row['expenditure'])}")
        save(ledger, args.data)
        return 0
    except BudgetError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
