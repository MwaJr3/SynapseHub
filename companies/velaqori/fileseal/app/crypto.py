"""Key derivation and authenticated encryption using the `cryptography` library.

Algorithm choices (never hand-rolled):
- KDF: scrypt (n=2**14, r=8, p=1) from a human passphrase + random salt.
- Cipher: AES-256-GCM (authenticated encryption) with a random 96-bit nonce.
The container format binds the header as associated data so header tampering
is detected too.
"""
from __future__ import annotations

import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

from .format import MAGIC, NONCE_LEN, SALT_LEN, pack, unpack


class CryptoError(ValueError):
    pass


class WrongKeyError(CryptoError):
    """Decryption failed: wrong passphrase or tampered data (indistinguishable by design)."""


def derive_key(passphrase: str, salt: bytes) -> bytes:
    if not passphrase:
        raise CryptoError("Passphrase must not be empty.")
    kdf = Scrypt(salt=salt, length=32, n=2 ** 14, r=8, p=1)
    return kdf.derive(passphrase.encode())


def encrypt_bytes(plaintext: bytes, passphrase: str) -> bytes:
    salt = os.urandom(SALT_LEN)
    nonce = os.urandom(NONCE_LEN)
    key = derive_key(passphrase, salt)
    aad = MAGIC  # associated data binds the format identity
    ct = AESGCM(key).encrypt(nonce, plaintext, aad)
    return pack(salt, nonce, ct)


def decrypt_bytes(blob: bytes, passphrase: str) -> bytes:
    _version, salt, nonce, ct = unpack(blob)
    key = derive_key(passphrase, salt)
    try:
        return AESGCM(key).decrypt(nonce, ct, MAGIC)
    except InvalidTag as exc:
        raise WrongKeyError(
            "Decryption failed: wrong passphrase or the file was modified. "
            "(These two cases are deliberately indistinguishable.)"
        ) from exc
