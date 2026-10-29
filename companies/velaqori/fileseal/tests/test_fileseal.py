"""Tests: round trips, wrong keys, tamper/truncation, safe writes."""
from __future__ import annotations

import os

import pytest

from app.crypto import WrongKeyError, decrypt_bytes, encrypt_bytes
from app.files import FileError, decrypt_file, encrypt_file
from app.format import FormatError, unpack


def test_round_trip_preserves_content():
    blob = encrypt_bytes(b"important data", "pass-one")
    assert decrypt_bytes(blob, "pass-one") == b"important data"


def test_wrong_passphrase_rejected():
    blob = encrypt_bytes(b"secret", "right")
    with pytest.raises(WrongKeyError):
        decrypt_bytes(blob, "wrong")


def test_tampered_ciphertext_rejected():
    blob = bytearray(encrypt_bytes(b"secret", "pw"))
    blob[-1] ^= 0xFF
    with pytest.raises(WrongKeyError):
        decrypt_bytes(bytes(blob), "pw")


def test_truncated_and_foreign_files_rejected():
    with pytest.raises(FormatError):
        unpack(b"short")
    with pytest.raises(FormatError):
        unpack(b"NOTFSE" + b"\x00" * 64)
    full = encrypt_bytes(b"abc", "pw")
    with pytest.raises(FormatError):
        unpack(full[:10])


def test_unsupported_version_rejected():
    blob = bytearray(encrypt_bytes(b"abc", "pw"))
    blob[6] = 99  # version byte
    with pytest.raises(FormatError):
        unpack(bytes(blob))


def test_file_round_trip_preserves_original(tmp_path):
    src = tmp_path / "doc.txt"
    src.write_text("original content")
    enc = tmp_path / "doc.txt.fseal"
    out = tmp_path / "doc.out"
    encrypt_file(src, enc, "pw")
    assert src.read_text() == "original content"          # original preserved
    decrypt_file(enc, out, "pw")
    assert out.read_text() == "original content"


def test_existing_destination_refused(tmp_path):
    src = tmp_path / "a.txt"; src.write_text("x")
    dst = tmp_path / "b.txt"; dst.write_text("existing")
    with pytest.raises(FileError):
        encrypt_file(src, dst, "pw")
    encrypt_file(src, dst, "pw", overwrite=True)
    assert dst.exists()


def test_no_partial_output_on_failure(tmp_path):
    src = tmp_path / "a.txt"; src.write_text("x")
    dst = tmp_path / "a.fseal"
    encrypt_file(src, dst, "pw")
    broken = bytearray(dst.read_bytes()); broken[-3:] = b"zzz"
    dst.write_bytes(bytes(broken))
    with pytest.raises(WrongKeyError):
        decrypt_file(dst, tmp_path / "a.out", "pw")
    assert not (tmp_path / "a.out").exists()
    assert not any(p.name.startswith(".fileseal-tmp-") for p in tmp_path.iterdir())


def test_header_salt_and_nonce_sizes():
    blob = encrypt_bytes(b"x", "pw")
    _v, salt, nonce, _ct = unpack(blob)
    assert len(salt) == 16 and len(nonce) == 12
