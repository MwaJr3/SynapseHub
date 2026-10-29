"""CLI: analyse saved captures offline."""
from __future__ import annotations

import argparse
import json
import sys

from app.analysis import summarise
from app.pcap import PcapError, read_pcap
from app.report import to_dict, to_text


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="netscope",
                                     description="Analyse a saved packet capture (offline; metadata only).")
    parser.add_argument("capture", help="Path to a libpcap-format capture file.")
    parser.add_argument("--threshold", type=int, default=120, help="Packets-per-minute anomaly threshold.")
    parser.add_argument("--json", help="Write a JSON report (use --redact for shareable examples).")
    parser.add_argument("--redact", action="store_true", help="Pseudonymise IP addresses in the report.")
    args = parser.parse_args(argv)
    try:
        summary = summarise(read_pcap(args.capture), args.threshold)
        print(to_text(summary))
        if args.json:
            open(args.json, "w").write(json.dumps(to_dict(summary, args.redact), indent=2))
        return 0
    except (PcapError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
