"""Hash correctness against known vectors + size limits."""
from __future__ import annotations

import base64

import pytest

from app.hashing import HashingError, hash_bytes, hash_stream


def test_known_vectors():
    result = hash_bytes(b"", "empty.bin")
    assert result.sha256 == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    assert result.md5 == "d41d8cd98f00b204e9800998ecf8427e"
    assert result.sha1 == "da39a3ee5e6b4b0d3255bfef95601890afd80709"
    assert "must NOT be used" in result.note               # weak-algo warning present


def test_hash_bytes_content():
    r = hash_bytes(b"hello", "h.txt")
    assert r.sha256 == "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    assert r.size == 5


def test_stream_respects_limit(tmp_path):
    p = tmp_path / "big.bin"
    p.write_bytes(b"x" * 1000)
    with pytest.raises(HashingError):
        hash_stream(str(p), "big.bin", max_bytes=100)
    r = hash_stream(str(p), "big.bin", max_bytes=10_000)
    assert r.size == 1000
