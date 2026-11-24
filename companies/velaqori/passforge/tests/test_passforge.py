"""Tests for passforge: settings, generation guarantees, export safety."""
from __future__ import annotations

import os
import re
import string

import pytest

from app.config import PasswordPolicy, PolicyError
from app.export import ExportError, save_passwords
from app.generator import generate_passphrase, generate_password, load_wordlist, validate_policy
from app.policy_check import policy_problems


def test_default_policy_generates_expected_length():
    policy = PasswordPolicy()
    assert len(generate_password(policy)) == policy.length


def test_guarantees_one_character_from_each_enabled_group():
    policy = PasswordPolicy(length=12, use_symbols=False)
    for _ in range(25):
        pw = generate_password(policy)
        assert any(c in string.ascii_lowercase for c in pw)
        assert any(c in string.ascii_uppercase for c in pw)
        assert any(c in string.digits for c in pw)


def test_disabled_groups_are_absent():
    policy = PasswordPolicy(length=16, use_upper=False, use_symbols=False)
    pw = generate_password(policy)
    assert not any(c in string.ascii_uppercase for c in pw)
    assert not any(c in string.punctuation for c in pw)


def test_invalid_configurations_rejected():
    with pytest.raises(PolicyError):
        validate_policy(PasswordPolicy(length=4))
    with pytest.raises(PolicyError):
        validate_policy(PasswordPolicy(length=200))
    with pytest.raises(PolicyError):
        validate_policy(PasswordPolicy(use_lower=False, use_upper=False, use_digits=False, use_symbols=False))


def test_empty_symbol_list_rejected():
    with pytest.raises(PolicyError):
        validate_policy(PasswordPolicy(symbols=""))


def test_generation_uses_no_ordinary_random(monkeypatch):
    import secrets as _secrets

    def boom(*a, **k):
        raise AssertionError("secrets module was not used")

    monkeypatch.setattr(_secrets, "choice", boom)
    monkeypatch.setattr(_secrets, "randbelow", boom)
    with pytest.raises(AssertionError):
        generate_password(PasswordPolicy(length=8))


def test_passwords_are_not_constant_across_calls():
    values = {generate_password(PasswordPolicy()) for _ in range(10)}
    assert len(values) > 1


def test_passphrase_shape_and_validation():
    phrase = generate_passphrase(6, "-")
    parts = phrase.split("-")
    assert len(parts) == 6
    assert all(re.fullmatch(r"[a-z]+", p) for p in parts)
    with pytest.raises(PolicyError):
        generate_passphrase(2, "-")
    with pytest.raises(PolicyError):
        generate_passphrase(6, "")


def test_wordlist_is_documented_and_sized():
    words = load_wordlist()
    assert len(words) >= 200
    assert len(set(words)) == len(words)


def test_export_permissions_and_overwrite(tmp_path):
    target = tmp_path / "out.txt"
    save_passwords(target, ["aaa111AAA!!!"])
    assert oct(os.stat(target).st_mode & 0o777) == "0o600"
    with pytest.raises(ExportError):
        save_passwords(target, ["bbb222BBB@@@"])
    save_passwords(target, ["bbb222BBB@@@"], overwrite=True)
    assert target.read_text().startswith("bbb222")
    with pytest.raises(ExportError):
        save_passwords(tmp_path / "empty.txt", [])


def test_policy_check_reports_problems():
    policy = PasswordPolicy(length=10, use_symbols=False)
    assert policy_problems(policy, "x" * 10) == ["missing an uppercase letter", "missing a digit"]
    assert policy_problems(policy, generate_password(policy)) == []


def test_cli_runs_end_to_end(capsys):
    """Regression: cli.py had a SyntaxError and presets/properties crashed."""
    from app.cli import main
    assert main(["presets"]) == 0
    assert main(["generate", "--count", "2"]) == 0
    assert len(capsys.readouterr().out.strip().splitlines()) >= 3
