"""CLI: explicit source/target selection, dry-run default."""
from __future__ import annotations

import argparse
import sys

from app.organizer import OrganizeError, organize


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="tidyfiles",
                                     description="Organize files into category folders. Dry-run by default.")
    parser.add_argument("source", help="Directory whose files will be organized (never scanned beyond it).")
    parser.add_argument("target", help="Target directory (must already exist; files are moved into category folders).")
    parser.add_argument("--apply", action="store_true", help="Actually move files (default is a preview).")
    parser.add_argument("--report", help="Write a JSON report to this path.")
    args = parser.parse_args(argv)
    try:
        report = organize(args.source, args.target, dry_run=not args.apply)
        for r in report.records:
            line = f"[{r.status:10}] {r.source} -> {r.destination} ({r.category} via {r.signal})"
            if r.detail:
                line += f"  # {r.detail}"
            print(line)
        print(f"{report.moved} file(s) {'would be ' if not args.apply else ''}moved; "
              f"{len(report.records)} inspected.")
        if args.report:
            open(args.report, "w").write(report.to_json())
        return 0
    except OrganizeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())        if args.command == "profiles":
            from .features import PROFILES
            for name, cfg in PROFILES.items():
                print(f"{name}: {cfg['notes']} buckets={sorted(set(cfg['ext_buckets'].values()))}")
        elif args.command == "classify-file":
            from .features import apply_profile
            print(f"{args.filename} -> {apply_profile(args.profile, args.filename)}")
        elif args.command == "duplicates":
            from .features import find_duplicates
            for group in find_duplicates(args.paths):
                print("duplicate group:", group)
        elif args.command == "undo":
            from .features import UndoManifest
            for line in UndoManifest.load(args.manifest).undo():
                print(line)
e/target selection, dry-run default."""
from __future__ import annotations

import argparse
import sys

from app.organizer import OrganizeError, organize


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="tidyfiles",
                                     description="Organize files into category folders. Dry-run by default.")
    parser.add_argument("source", help="Directory whose files will be organized (never scanned beyond it).")
    parser.add_argument("target", help="Target directory (must already exist; files are moved into category folders).")
    parser.add_argument("--apply", action="store_true", help="Actually move files (default is a preview).")
    parser.add_argument("--report", help="Write a JSON report to this path.")
    args = parser.parse_args(argv)
    try:
        report = organize(args.source, args.target, dry_run=not args.apply)
        for r in report.records:
            line = f"[{r.status:10}] {r.source} -> {r.destination} ({r.category} via {r.signal})"
            if r.detail:
                line += f"  # {r.detail}"
            print(line)
        print(f"{report.moved} file(s) {'would be ' if not args.apply else ''}moved; "
              f"{len(report.records)} inspected.")
        if args.report:
            open(args.report, "w").write(report.to_json())
        return 0
    except OrganizeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
