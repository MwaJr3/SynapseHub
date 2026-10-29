"""CLI: encrypt/decrypt with explicit paths; originals preserved by default."""
from __future__ import annotations

import argparse
import getpass
import sys

from .crypto import CryptoError
from .files import FileError, decrypt_file, encrypt_file


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="fileseal", description="Encrypt and decrypt files with AES-256-GCM.")
    parser.add_argument("--passphrase-env", default="FILESEAL_PASSPHRASE",
                        help="Environment variable holding the passphrase (never pass it as an argument).")
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("encrypt", "decrypt"):
        p = sub.add_parser(name)
        p.add_argument("source")
        p.add_argument("destination")
        p.add_argument("--overwrite", action="store_true")
    args = parser.parse_args(argv)
    import os
    passphrase = os.environ.get(args.passphrase_env) or getpass.getpass("passphrase (hidden): ")
    try:
        if args.command == "encrypt":
            out = encrypt_file(args.source, args.destination, passphrase, args.overwrite)
        else:
            out = decrypt_file(args.source, args.destination, passphrase, args.overwrite)
        print(f"{args.command}ed -> {out}")
        return 0
    except (CryptoError, FileError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
