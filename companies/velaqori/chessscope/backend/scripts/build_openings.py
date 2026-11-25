"""Build app/data/openings.json from a checkout of lichess-org/chess-openings (CC0-1.0).

Usage: python scripts/build_openings.py /path/to/chess-openings
Every line is replayed with python-chess; a record that does not replay legally aborts the build.
"""
from __future__ import annotations

import csv
import json
import subprocess
import sys
from pathlib import Path

import chess

SRC = Path(sys.argv[1])
OUT = Path(__file__).resolve().parent.parent / "app" / "data" / "openings.json"

commit = subprocess.run(["git", "-C", str(SRC), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
records = []
for letter in "abcde":
    with open(SRC / f"{letter}.tsv", encoding="utf-8") as fh:
        for row in csv.DictReader(fh, delimiter="\t"):
            board = chess.Board()
            ucis = []
            for token in row["pgn"].split():
                if token.endswith(".") or "." in token and token.split(".")[0].isdigit():
                    token = token.split(".")[-1]
                    if not token:
                        continue
                move = board.parse_san(token)
                ucis.append(move.uci())
                board.push(move)
            records.append({"eco": row["eco"], "name": row["name"], "uci": " ".join(ucis)})
meta = {
    "source": "lichess-org/chess-openings",
    "source_url": "https://github.com/lichess-org/chess-openings",
    "license": "CC0-1.0",
    "commit": commit,
    "count": len(records),
}
OUT.write_text(json.dumps({"meta": meta, "openings": records}, separators=(",", ":")), encoding="utf-8")
print(len(records), "openings ->", OUT, OUT.stat().st_size, "bytes")
