"""Run repeatable checks from any directory. Add --e2e for Chromium workflows."""

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(command, directory):
    print("\n> " + " ".join(command), flush=True)
    subprocess.run(
        command,
        cwd=ROOT / directory,
        check=True,
        shell=os.name == "nt" and command[0].endswith(".cmd"),
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--e2e", action="store_true")
    args = parser.parse_args()
    npm = shutil.which("npm")
    if not npm:
        raise SystemExit("Node/npm is required; see README.md.")
    run([sys.executable, "-m", "pytest", "-q"], "backend")
    run([sys.executable, "-m", "ruff", "check", "app", "tests"], "backend")
    run(
        [sys.executable, "-m", "ruff", "format", "--check", "app", "tests", "alembic"],
        "backend",
    )
    for command in ("format:check", "test", "build"):
        run([npm, "run", command], "frontend")
    if args.e2e:
        run([npm, "run", "e2e"], "frontend")


if __name__ == "__main__":
    main()
