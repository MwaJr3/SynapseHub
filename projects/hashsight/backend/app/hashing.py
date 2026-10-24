"""Local file hashing. Files are NEVER executed and NEVER uploaded by default.

MD5 and SHA-1 are provided only for compatibility with existing indicator
sets — the UI and API responses state they must not be used where collision
resistance is required.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass

WEAK_ALGOS_NOTE = ("MD5 and SHA-1 are provided for indicator compatibility only; "
                   "they must NOT be used where collision resistance is required.")


@dataclass
class HashResult:
    sha256: str
    sha1: str
    md5: str
    size: int
    filename: str
    note: str = WEAK_ALGOS_NOTE


class HashingError(ValueError):
    pass


def hash_bytes(data: bytes, filename: str) -> HashResult:
    if len(data) > 50_000_000:
        raise HashingError("file exceeds hard hashing limit")
    return HashResult(
        sha256=hashlib.sha256(data).hexdigest(),
        sha1=hashlib.sha1(data).hexdigest(),
        md5=hashlib.md5(data).hexdigest(),
        size=len(data), filename=filename)


def hash_stream(path: str, filename: str, max_bytes: int) -> HashResult:
    """Stream-hash a temp file with a hard size cap; caller deletes the file."""
    h256, h1, hmd5 = hashlib.sha256(), hashlib.sha1(), hashlib.md5()
    size = 0
    with open(path, "rb") as fh:
        while True:
            chunk = fh.read(65536)
            if not chunk:
                break
            size += len(chunk)
            if size > max_bytes:
                raise HashingError(f"file exceeds the configured limit of {max_bytes} bytes")
            h256.update(chunk); h1.update(chunk); hmd5.update(chunk)
    return HashResult(sha256=h256.hexdigest(), sha1=h1.hexdigest(), md5=hmd5.hexdigest(),
                      size=size, filename=filename)
