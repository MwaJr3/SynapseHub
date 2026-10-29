"""Chess must follow the real rules: no illegal move is ever accepted."""
from __future__ import annotations

import pytest

from app import chess_modality
from app.seed import PUZZLES

BACK_RANK = next(p for p in PUZZLES if p["id"] == "pz-back-rank")
SMOTHERED = next(p for p in PUZZLES if p["id"] == "pz-smothered")


def test_seeded_puzzles_are_valid_and_end_in_mate():
    import chess

    for puzzle in PUZZLES:
        chess_modality.validate_puzzle(puzzle["fen"], puzzle["solution_uci"])
        board = chess.Board(puzzle["fen"])
        for uci in puzzle["solution_uci"]:
            board.push(chess.Move.from_uci(uci))
        assert board.is_checkmate(), puzzle["id"]


def test_solution_is_never_exposed_in_the_public_view():
    view = chess_modality.public_puzzle(BACK_RANK["fen"])
    # The winning move is of course among the legal moves — it is a legal move. What
    # must never leak is the solution *line*, its length, or which move wins.
    assert "solution_uci" not in view
    assert "solution" not in str(view.keys())
    assert set(view) == {"fen", "side_to_move", "in_check", "plies_played", "legal_moves"}


def test_legal_moves_are_enumerated_from_the_real_position():
    moves = chess_modality.legal_moves(BACK_RANK["fen"])
    assert any(move.uci == "a1a8" for move in moves)
    assert all(move.san for move in moves)


def test_illegal_move_is_rejected():
    progress = chess_modality.apply_move(BACK_RANK["fen"], "a1a3", BACK_RANK["solution_uci"], 0)
    assert progress.legal is True  # a1-a3 is legal chess…
    progress = chess_modality.apply_move(BACK_RANK["fen"], "a1b3", BACK_RANK["solution_uci"], 0)
    assert progress.legal is False  # …but a rook cannot move like a knight
    assert progress.solved is False
    assert "not legal" in (progress.error or "")


def test_a_legal_but_wrong_move_does_not_advance_the_board():
    progress = chess_modality.apply_move(BACK_RANK["fen"], "a1a2", BACK_RANK["solution_uci"], 0)
    assert progress.legal is True
    assert progress.on_solution is False
    assert progress.fen == BACK_RANK["fen"]
    assert progress.plies_played == 0


def test_the_winning_move_solves_a_one_move_puzzle():
    progress = chess_modality.apply_move(BACK_RANK["fen"], "a1a8", BACK_RANK["solution_uci"], 0)
    assert progress.solved is True
    assert progress.san_history == ["Ra8#"]
    assert progress.plies_played == 1


def test_garbage_input_is_rejected_without_raising():
    for bad in ("", "zzzz", "a1", "e9e9"):
        progress = chess_modality.apply_move(BACK_RANK["fen"], bad, BACK_RANK["solution_uci"], 0)
        assert progress.legal is False
        assert progress.error


def test_a_solved_position_refuses_further_moves():
    import chess

    # After the solution the game is over, so a further move is not legal play.
    board = chess.Board(SMOTHERED["fen"])
    board.push_uci(SMOTHERED["solution_uci"][0])
    assert board.is_checkmate()
    progress = chess_modality.apply_move(board.fen(), "g8f8", SMOTHERED["solution_uci"], 1)
    assert progress.legal is False


def test_playing_the_winning_move_solves_the_smothered_puzzle():
    progress = chess_modality.apply_move(SMOTHERED["fen"], "g5f7", SMOTHERED["solution_uci"], 0)
    assert progress.solved is True
    assert progress.san_history == ["Nf7#"]


def test_an_invalid_puzzle_is_refused_at_validation_time():
    with pytest.raises(ValueError):
        chess_modality.validate_puzzle("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", ["a1a2"])  # not a mate line
    with pytest.raises(ValueError):
        chess_modality.validate_puzzle("not-a-fen", ["a1a8"])
