"""Versioned encrypted-file container format (documented, explicit)."""
from __future__ import annotations

import struct

MAGIC = b"FSEAL1"
# Layout: MAGIC(6) | version(1) | salt_len(1) | salt | nonce(12) | ciphertext+tag
VERSION = 1
SALT_LEN = 16
NONCE_LEN = 12


class FormatError(ValueError):
    """The file is not a valid fileseal container."""


def pack(salt: bytes, nonce: bytes, ciphertext: bytes) -> bytes:
    return MAGIC + struct.pack("BB", VERSION, len(salt)) + salt + nonce + ciphertext


def unpack(blob: bytes) -> tuple[int, bytes, bytes, bytes]:
    if len(blob) < len(MAGIC) + 2 + SALT_LEN + NONCE_LEN + 16:
        raise FormatError("File is too short to be a fileseal container (truncated?).")
    if not blob.startswith(MAGIC):
        raise FormatError("Not a fileseal container (bad magic).")
    version, salt_len = struct.unpack("BB", blob[len(MAGIC):len(MAGIC) + 2])
    if version != VERSION:
        raise FormatError(f"Unsupported container version {version}.")
    offset = len(MAGIC) + 2
    salt = blob[offset:offset + salt_len]
    offset += salt_len
    nonce = blob[offset:offset + NONCE_LEN]
    ciphertext = blob[offset + NONCE_LEN:]
    return version, salt, nonce, ciphertext
