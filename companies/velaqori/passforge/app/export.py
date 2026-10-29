"""Optional export — never automatic, restrictive permissions where supported."""
from __future__ import annotations

import os
from pathlib import Path


class ExportError(ValueError):
    pass


def save_passwords(path: str | Path, passwords: list[str], overwrite: bool = False) -> Path:
    """Write passwords to a new file with 0600 permissions. Never logs content."""
    target = Path(path)
    if target.exists() and not overwrite:
        raise ExportError(f"{target} already exists; pass overwrite=True to replace it.")
    if not passwords:
        raise ExportError("Nothing to save.")
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    try:
        payload = chr(10).join(passwords) + chr(10)
        os.write(fd, payload.encode())
    finally:
        os.close(fd)
    try:
        os.chmod(target, 0o600)
    except OSError:  # pragma: no cover - platform dependent
        pass
    return target
