"""CLI: import indicators, look up, cache, export consolidated reports."""
from __future__ import annotations

import argparse
import json
import os
import sys

from app.cache import cached_lookup, save as cache_save
from app.indicators import IndicatorError, parse_indicator
from app.providers import HttpReputationProvider, LocalDatasetProvider, ProviderError
from app.report import consolidate, to_json


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="threatintel-desk",
                                     description="Look up indicators (local dataset by default; external lookups are opt-in).")
    parser.add_argument("indicator", nargs="+", help="IP, domain, URL or file hash values.")
    parser.add_argument("--dataset", default="data/synthetic_intel.json")
    parser.add_argument("--cache", default="cache.json")
    parser.add_argument("--external", action="store_true",
                        help="Explicitly allow configured external lookups (off by default).")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    try:
        providers = [LocalDatasetProvider(args.dataset)]
        if args.external:
            base = os.environ.get("TI_PROVIDER_URL", "").strip()
            if not base:
                raise ProviderError("--external requires TI_PROVIDER_URL to be configured.")
            providers.insert(0, HttpReputationProvider(base, os.environ.get("TI_PROVIDER_KEY", "")))
        for raw in args.indicator:
            indicator = parse_indicator(raw)
            verdicts = []
            for provider in providers:
                cached = cached_lookup(args.cache, provider.name, indicator.value)
                if cached:
                    verdicts.append(cached)
                    continue
                verdict = provider.lookup(indicator)
                cache_save(args.cache, verdict)
                verdicts.append(verdict)
            payload = consolidate(indicator.value, verdicts)
            if args.json:
                print(to_json(payload))
            else:
                print(f"indicator: {payload['indicator']}  consensus: {payload['consensus']}")
                for v in payload["results"]:
                    tag = " (cached)" if v["cached"] else ""
                    print(f"  [{v['provider']}] {v['result']}{tag} @ {v['retrieved_at']}")
                    if v["detail"]:
                        print(f"    {v['detail']}")
                print(payload["disclaimer"])
        return 0
    except (IndicatorError, ProviderError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
