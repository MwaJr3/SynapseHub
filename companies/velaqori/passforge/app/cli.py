"""Command-line interface — a thin wrapper around the generation engine."""
from __future__ import annotations

import argparse
import sys

from .config import DEFAULT_SYMBOLS, PasswordPolicy, PolicyError
from .export import ExportError, save_passwords
from .generator import generate_passphrase, generate_password

HONEST_NOTE = (
    "Strength notes: length and genuine randomness matter more than arbitrary "
    "complexity rules. A password is only as safe as how it is used and stored - "
    "this tool generates values but never stores, logs or scores them. Use a "
    "password manager or an offline secret store; generation is not storage."
)


def build_policy(args: argparse.Namespace) -> PasswordPolicy:
    return PasswordPolicy(
        length=args.length,
        use_upper=not args.no_upper,
        use_lower=not args.no_lower,
        use_digits=not args.no_digits,
        use_symbols=not args.no_symbols,
        symbols=args.symbols,
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="passforge", description="Generate strong passwords and passphrases.")
    sub = parser.add_subparsers(dest="command", required=True)

    pres = sub.add_parser("presets", help="List generation presets (explicit rules).")
    pres = sub.add_parser("properties", help="Explain what each generation property does and does not prove.")
    pres.add_argument("--preset", default="web")
    gen = sub.add_parser("generate", help="Generate one or more passwords.")
    gen.add_argument("--preset", default="", help="Apply a named preset (see 'presets').")
    gen.add_argument("--length", type=int, default=20)
    gen.add_argument("--count", type=int, default=1)
    gen.add_argument("--no-upper", action="store_true")
    gen.add_argument("--no-lower", action="store_true")
    gen.add_argument("--no-digits", action="store_true")
    gen.add_argument("--no-symbols", action="store_true")
    gen.add_argument("--symbols", default=DEFAULT_SYMBOLS)
    gen.add_argument("--out", help="Optional file to save results to (0600 permissions).")

    pp = sub.add_parser("passphrase", help="Generate a passphrase from the bundled word list.")
    pp.add_argument("--words", type=int, default=6)
    pp.add_argument("--sep", default="-")
    pp.add_argument("--count", type=int, default=1)
    pp.add_argument("--out", help="Optional file to save results to (0600 permissions).")

    exp = sub.add_parser("explain", help="Explain the configured generation rules honestly.")
    exp.add_argument("--length", type=int, default=20)
    exp.add_argument("--no-upper", action="store_true")
    exp.add_argument("--no-lower", action="store_true")
    exp.add_argument("--no-digits", action="store_true")
    exp.add_argument("--no-symbols", action="store_true")
    exp.add_argument("--symbols", default=DEFAULT_SYMBOLS)

    args = parser.parse_args(argv)
    try:
        if args.command == "explain":
            policy = build_policy(args)
            groups = [name for name, on in [
                ("lowercase", policy.use_lower), ("uppercase", policy.use_upper),
                ("digits", policy.use_digits), ("symbols", policy.use_symbols)] if on]
            print(f"Rules: length {policy.length}; character groups: {', '.join(groups) or 'NONE'}.")
            print(HONEST_NOTE)
            return 0
        if getattr(args, "count", None) is not None and not 1 <= args.count <= 100:
            raise PolicyError("Count must be between 1 and 100.")
        if args.command == "presets":
            from .features import PRESETS
            for name, cfg in PRESETS.items():
                print(f"{name}: {cfg['notes']}")
            return 0
        elif args.command == "properties":
            from .features import apply_preset, explain_properties
            for item in explain_properties(apply_preset(args.preset)):
                print(f"- {item['property']} = {item['value']}\n  {item['explanation']}")
            return 0
        elif args.command == "generate":
            policy = build_policy(args)
            results = [generate_password(policy) for _ in range(args.count)]
        else:
            results = [generate_passphrase(args.words, args.sep) for _ in range(args.count)]
        if args.out:
            save_passwords(args.out, results)
            print(f"Saved {len(results)} value(s) to {args.out} (not displayed).")
        else:
            for value in results:
                print(value)
        return 0
    except (PolicyError, ExportError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
