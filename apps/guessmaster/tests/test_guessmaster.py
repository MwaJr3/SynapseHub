"""Tests: boundaries, invalid input, state machine, high-score ranking."""
from __future__ import annotations

import random

import pytest

from app.config import DIFFICULTIES, Difficulty
from app.game import GameError, GuessGame
from app.scores import record, top


def make_game(low=1, high=10, attempts=5, target=None):
    d = Difficulty("test", low, high, attempts)
    rng = random.Random(0)
    game = GuessGame(d, rng=rng)
    if target is not None:
        game.target = target
    return game


def test_hints_and_win():
    game = make_game(target=5)
    assert game.guess(7) == "high"
    assert game.guess(3) == "low"
    assert game.guess(5) == "correct"
    assert game.state == "won"
    assert game.attempts == 3


def test_lose_when_attempts_exhausted():
    game = make_game(attempts=2, target=5)
    game.guess(4); game.guess(6)
    assert game.state == "lost"
    assert game.attempts_left == 0


def test_boundaries_accepted():
    game = make_game(low=1, high=10, target=1)
    assert game.guess(1) in {"correct", "high", "low"}
    game2 = make_game(low=1, high=10, target=10)
    game2.guess(10)
    assert game2.state == "won"


def test_invalid_guesses_rejected_and_do_not_count():
    game = make_game(target=5)
    for bad in (0, 11, "x", 3.5, True):
        with pytest.raises(GameError):
            game.guess(bad)
    assert game.attempts == 0
    assert game.state == "in_progress"


def test_no_guessing_after_game_over():
    game = make_game(attempts=1, target=5)
    game.guess(1)
    with pytest.raises(GameError):
        game.guess(5)


def test_difficulties_configured():
    assert set(DIFFICULTIES) == {"easy", "medium", "hard"}
    for d in DIFFICULTIES.values():
        assert d.low < d.high and d.max_attempts >= 1


def test_high_scores_ranking(tmp_path):
    path = tmp_path / "s.json"
    record(path, "ada", "easy", 4, True)
    record(path, "bob", "easy", 2, True)
    record(path, "cid", "easy", 1, False)   # losses never rank
    rows = top(path, "easy")
    assert [r["player"] for r in rows] == ["bob", "ada"]
