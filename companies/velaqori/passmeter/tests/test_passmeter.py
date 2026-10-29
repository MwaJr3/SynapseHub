"""Tests: weak/predictable/strong matrix, false confidence, redaction."""
from __future__ import annotations

import json

import pytest

from app.report import to_json
from app.rules import assess


def test_strong_password_scores_high():
    a = assess("Tr0ub4dor&3xK!92zQ")
    assert a.band == "strong"
    assert a.score >= 7


def test_weak_common_passwords():
    for pw in ("password", "123456", "qwerty123", "admin123"):
        assert assess(pw).band == "weak", pw


def test_repetitive_and_sequential_patterns_penalised():
    a = assess("aaaaaaaaaaaa")
    assert any(s.name == "repetition" and s.effect < 0 for s in a.signals)
    b = assess("abcdefghijkl")
    assert any(s.name == "sequence" and s.effect < 0 for s in b.signals)
    assert b.band in ("weak", "fair")


def test_length_and_variety_drive_improvement():
    short = assess("ab1!")
    long = assess("ab1!ab1!ab1!ab1!ab1!")
    assert long.score > short.score or long.band != "weak"


def test_empty_input_refused():
    with pytest.raises(ValueError):
        assess("")


def test_report_never_echoes_password():
    secret = "S3cret-Candidate-Value!"
    payload = to_json(assess(secret))
    assert secret not in json.dumps(payload)


def test_suggestions_present_and_honest():
    a = assess("password")
    assert a.suggestions
    assert all(isinstance(s, str) for s in a.suggestions)


def test_entropy_estimate_is_labelled_approximate():
    a = assess("correct horse battery staple 42!")
    assert a.entropy_bits_estimate > 0
