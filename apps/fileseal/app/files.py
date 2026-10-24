"""Safe filesystem operations: preserve originals, atomic writes."""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

from .crypto import CryptoError, decrypt_bytes, encrypt_bytes


class FileError(ValueError):
    pass


def _atomic_write(target: Path, data: bytes) -> None:
    """Write via a temp file + rename so a crash never leaves partial output
    that could be mistaken for a successful encryption."""
    fd, tmp = tempfile.mkstemp(dir=str(target.parent), prefix=".fileseal-tmp-")
    try:
        os.write(fd, data)
        os.close(fd)
        os.replace(tmp, target)
    except OSError:
        try:
            os.close(fd)
        except OSError:
            pass
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def encrypt_file(src: str | Path, dst: str | Path, passphrase: str, overwrite: bool = False) -> Path:
    source, target = Path(src), Path(dst)
    if not source.is_file():
        raise FileError(f"Source {source} is not a readable file.")
    if target.exists() and not overwrite:
        raise FileError(f"{target} already exists; pass --overwrite to replace it.")
    _atomic_write(target, encrypt_bytes(source.read_bytes(), passphrase))
    return target


def decrypt_file(src: str | Path, dst: str | Path, passphrase: str, overwrite: bool = False) -> Path:
    source, target = Path(src), Path(dst)
    if not source.is_file():
        raise FileError(f"Source {source} is not a readable file.")
    if target.exists() and not overwrite:
        raise FileError(f"{target} already exists; pass --overwrite to replace it.")
    try:
        plaintext = decrypt_bytes(source.read_bytes(), passphrase)
    except CryptoError:
        raise
    _atomic_write(target, plaintext)
    return target
