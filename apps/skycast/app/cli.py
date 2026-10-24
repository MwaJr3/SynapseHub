"""CLI: weather, forecast, favourites."""
from __future__ import annotations

import argparse
import sys

from app.config import build_provider
from app.favourites import add as fav_add, load as fav_load
from app.providers import ProviderError


def _print_reading(r) -> None:
    label = "SIMULATED DEMO DATA" if r.simulated else "live provider data"
    print(f"{r.city}, {r.country}  [{label} via {r.provider}]")
    print(f"  {r.temperature_c} °C, {r.conditions}  |  humidity {r.humidity_pct} %  |  wind {r.wind_kph} km/h")
    print(f"  timezone: {r.timezone}   observed at: {r.observed_at}")
    if r.forecast:
        print("  forecast:")
        for d in r.forecast:
            print(f"    {d.date}: {d.low_c}-{d.high_c} °C, {d.conditions}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="skycast", description="Look up weather.")
    parser.add_argument("--favourites", default="favourites.json")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("weather"); p.add_argument("city")
    p = sub.add_parser("forecast"); p.add_argument("city")
    p = sub.add_parser("fav"); p.add_argument("action", choices=["add", "list"]); p.add_argument("city", nargs="?")
    args = parser.parse_args(argv)
    try:
        provider = build_provider()
        if args.command in ("weather", "forecast"):
            _print_reading(provider.get(args.city))
        elif args.command == "fav":
            if args.action == "add":
                if not args.city:
                    raise ProviderError("fav add requires a city.")
                fav_add(args.favourites, args.city)
                print("saved")
            else:
                for city in fav_load(args.favourites):
                    print(city)
        return 0
    except (ProviderError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
