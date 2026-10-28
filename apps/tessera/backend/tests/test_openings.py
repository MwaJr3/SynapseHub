"""Openings: real lines, and lookup that understands transpositions."""
from __future__ import annotations

import chess
import pytest

from app.openings import (
    MAX_OPENING_PLIES,
    Opening,
    canonical_position,
    lookup_by_moves,
    lookup_by_position,
    moves_to_fen,
    san_line,
    validate_opening,
)
from app.openings_data import build_openings


def test_every_seeded_opening_is_legal_and_validated():
    openings = build_openings()
    assert len(openings) == 10
    for opening in openings:
        validate_opening(opening)
        # Replaying the line must not raise, which is what "legal" means here.
        moves_to_fen(opening.moves_uci.split())


def test_eco_codes_are_well_formed():
    for opening in build_openings():
        assert len(opening.eco) == 3
        assert opening.eco[0].isalpha()
        assert opening.eco[1:].isdigit()


def test_san_rendering_matches_a_players_notation():
    assert san_line(["e2e4", "c7c5"]) == "1. e4 c5"
    assert san_line(["e2e4", "e7e5", "g1f3"]) == "1. e4 e5 2. Nf3"


def test_transposition_resolves_to_the_same_position():
    # Queen's Gambit by two move orders reaches the same board.
    one = moves_to_fen(["d2d4", "d7d5", "c2c4"])
    two = moves_to_fen(["c2c4", "d7d5", "d2d4"])
    assert canonical_position(one) == canonical_position(two)


def test_canonical_position_ignores_move_counters():
    first = moves_to_fen(["e2e4"])
    # Same board reached later in the game via a different route has different counters.
    board = chess.Board(first)
    board.halfmove_clock = 7
    board.fullmove_number = 30
    assert canonical_position(first) == canonical_position(board.fen())
    assert first != board.fen()  # the raw FENs differ


def test_lookup_by_position_finds_the_opening():
    entries = build_openings()
    fen = moves_to_fen(["e2e4", "c7c5"])
    found = lookup_by_position(fen, entries)
    assert found is not None
    assert found.eco in {"B20", "B50", "B90"}  # all reachable from 1.e4 c5
    assert lookup_by_position(moves_to_fen(["e2e4", "e7e5", "g1f3"]), entries) is None


def test_lookup_by_moves_prefers_the_exact_line_then_nearest_continuation():
    entries = build_openings()
    matches = lookup_by_moves(["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4"], entries)
    assert matches
    # B50 is exactly this line; B90 (Najdorf) shares all seven plies and continues,
    # so both are correct answers and the exact match must rank first.
    assert matches[0].eco == "B50"
    assert matches[0].moves_uci.split()[:7] == ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4"]
    assert {m.eco for m in matches} == {"B50", "B90"}
    # Exact line first, then the continuation that is closest to what was played.
    assert len(matches[0].moves_uci.split()) == 7
    assert matches[-1].eco == "B90"


def test_unknown_line_is_reported_not_invented():
    entries = build_openings()
    assert lookup_by_moves(["a2a3"], entries) == []


def test_illegal_opening_line_is_rejected_at_validation():
    bad = Opening(
        id="bad", eco="C20", name="Impossible", family="Test",
        moves_san="1. e4", moves_uci="e2e5", idea="",  # pawn cannot jump to e5
    )
    with pytest.raises(ValueError):
        validate_opening(bad)


def test_opening_longer_than_the_limit_is_rejected():
    long_line = " ".join(["g1f3", "g8f6"] * (MAX_OPENING_PLIES // 2 + 1))
    opening = Opening(
        id="long", eco="A04", name="Too long", family="Test",
        moves_san="", moves_uci=long_line, idea="",
    )
    with pytest.raises(ValueError):
        validate_opening(opening)


def test_malformed_eco_is_rejected():
    opening = Opening(
        id="bad-eco", eco="ZZZ", name="Bad", family="Test",
        moves_san="1. e4", moves_uci="e2e4", idea="",
    )
    with pytest.raises(ValueError):
        validate_opening(opening)
