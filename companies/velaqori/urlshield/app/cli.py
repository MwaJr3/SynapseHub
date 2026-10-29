"""CLI: train, evaluate, and score URLs locally."""
from __future__ import annotations

import argparse
import sys

import numpy as np

from app.dataset import generate
from app.features import extract
from app.model import ModelError, load, save, train


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="urlshield",
                                     description="Phishing-URL detection (offline; predictions are estimates).")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("train"); p.add_argument("--samples", type=int, default=400)
    p.add_argument("--threshold", type=float, default=0.5); p.add_argument("--model", default="urlshield.model")
    p = sub.add_parser("check"); p.add_argument("urls", nargs="+"); p.add_argument("--model", default="urlshield.model")
    args = parser.parse_args(argv)
    try:
        if args.command == "train":
            urls, labels = generate(args.samples)
            feats = np.array([extract(u).values for u in urls])
            model = train(feats, np.array(labels), threshold=args.threshold)
            save(args.model, model)
            print(f"trained on {len(urls)} SYNTHETIC samples; evaluation: {model.evaluation}")
            print("NOTE: fictional demo dataset — metrics are not real-world performance.")
        else:
            model = load(args.model)
            for url in args.urls:
                result = model.predict(url)
                print(f"{result['label']:18} p≈{result['phishing_probability_estimate']}  {url}")
            print(model.predict(args.urls[0])["disclaimer"])
        return 0
    except (ModelError, ValueError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
