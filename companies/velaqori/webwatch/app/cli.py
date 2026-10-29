"""CLI: collect from configured sources (fixture transport by default)."""
from __future__ import annotations

import argparse
import json
import sys

from app.collectors import CollectError, FixtureTransport, HttpTransport, extract_records
from app.policy import PolicyError, SourcePolicy, check_allowed
from app.store import Store


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="webwatch",
                                     description="Collect data from explicitly permitted sources.")
    parser.add_argument("--db", default="webwatch.db")
    parser.add_argument("--config", default="data/sources.json", help="Source configuration (allowlist + limits).")
    parser.add_argument("--transport", choices=["fixture", "http"], default="fixture")
    parser.add_argument("--fixtures", default="data/fixtures", help="Fixture directory for offline collection.")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("collect"); p.add_argument("source")
    p = sub.add_parser("history"); p.add_argument("source")
    p = sub.add_parser("records"); p.add_argument("source")
    args = parser.parse_args(argv)
    try:
        sources = {s["name"]: SourcePolicy(**s) for s in json.loads(open(args.config).read())["sources"]}
        store = Store(args.db)
        if args.command == "collect":
            source = sources[args.source]
            transport = FixtureTransport(args.fixtures) if args.transport == "fixture" else HttpTransport()
            run_id = store.start_run(source.name)
            fetched = 0
            summary = {"new": 0, "changed": 0, "unchanged": 0}
            for url in json.loads(open(args.config).read())["pages"].get(source.name, []):
                if fetched >= source.max_pages_per_run:
                    break
                check_allowed(source, url)
                page = transport.fetch(url)
                if page.from_cache:
                    continue
                records = extract_records(page.body, url)
                if not records:
                    store.finish_run(run_id, "partial", fetched,
                                     f"schema drift: no records extracted from {url}")
                    print(f"schema drift: no records extracted from {url} (reported, not treated as 'no change')")
                    return 0
                result = store.upsert_records(source.name, url, records)
                for k in ("new", "changed", "unchanged"):
                    summary[k] += result[k]
                fetched += 1
            store.finish_run(run_id, "completed", fetched, json.dumps(summary))
            print(f"run #{run_id}: {summary} (pages: {fetched})")
        elif args.command == "history":
            for row in store.history(args.source):
                print(row)
        else:
            for row in store.records(args.source):
                print(f"{row['title']}  (changes: {row['change_count']}, last seen {row['last_seen']})")
        return 0
    except (PolicyError, CollectError, OSError, KeyError, json.JSONDecodeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
