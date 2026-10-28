"""Chess as a learning modality.

The board must implement the actual rules of chess — legality, check, promotion,
castling, en passant — rather than "a piece can move like this". `python-chess`
does the rule work, so a learner can never be told an illegal move is fine and a
puzzle solution is never validated against a simplified board.

A puzzle is a FEN plus a full winning line in UCI. The solver plays the even
indexes of that line and the opponent replies with the odd ones. Progress is
tracked by the number of plies already played, so the endpoint is stateless.
"""

from __future__ import annotations

from dataclasses import dataclass

import chess

#: A puzzle line longer than this is a study, not a puzzle; refuse it.
MAX_SOLUTION_PLIES = 20


@dataclass(frozen=True)
class LegalMove:
    uci: str
    san: str
    from_square: str
    to_square: str
    promotion: str | None


@dataclass(frozen=True)
class PuzzleProgress:
    legal: bool
    on_solution: bool
    solved: bool
    fen: str
    plies_played: int
    san_history: list[str]
    opponent_reply: str | None
    error: str | None = None


def validate_puzzle(fen: str, solution_uci: list[str]) -> None:
    """Reject a malformed puzzle at seed/ingest time rather than in front of a learner."""
    try:
        board = chess.Board(fen)
    except ValueError as exc:  # invalid FEN
        raise ValueError(f"invalid FEN: {exc}") from exc
    if board.is_game_over():
        raise ValueError("a puzzle must start from a playable position")
    if not solution_uci:
        raise ValueError("a puzzle needs a solution line")
    if len(solution_uci) > MAX_SOLUTION_PLIES:
        raise ValueError("solution line is too long to be a puzzle")
    # The line must be legal move by move, from the given position.
    for index, uci in enumerate(solution_uci):
        try:
            move = chess.Move.from_uci(uci)
        except ValueError as exc:
            raise ValueError(f"illegal UCI '{uci}': {exc}") from exc
        if move not in board.legal_moves:
            raise ValueError(f"solution move {index} ({uci}) is not legal in this position")
        board.push(move)
    if not board.is_checkmate() and not board.is_game_over():
        # A puzzle should end in a decided position; a quiet line is a lesson, not a puzzle.
        raise ValueError("the solution line must end in checkmate or a decided position")


def side_to_move(fen: str) -> str:
    board = chess.Board(fen)
    return "white" if board.turn == chess.WHITE else "black"


def legal_moves(fen: str) -> list[LegalMove]:
    """Every legal move in the position, for highlighting and keyboard/click input."""
    board = chess.Board(fen)
    moves: list[LegalMove] = []
    for move in board.legal_moves:
        moves.append(
            LegalMove(
                uci=move.uci(),
                san=board.san(move),
                from_square=chess.square_name(move.from_square),
                to_square=chess.square_name(move.to_square),
                promotion=chess.piece_symbol(move.promotion) if move.promotion else None,
            )
        )
    return sorted(moves, key=lambda item: item.uci)


def public_puzzle(fen: str, plies_played: int = 0) -> dict:
    """What the learner is allowed to see. The solution is never included."""
    board = chess.Board(fen)
    return {
        "fen": fen,
        "side_to_move": "white" if board.turn == chess.WHITE else "black",
        "in_check": board.is_check(),
        "plies_played": plies_played,
        "legal_moves": [m.uci for m in legal_moves(fen)],
    }


def apply_move(fen: str, uci: str, solution_uci: list[str], plies_played: int) -> PuzzleProgress:
    """Validate one learner move against the position and the solution line."""
    board = chess.Board(fen)

    try:
        move = chess.Move.from_uci(uci)
    except ValueError:
        return PuzzleProgress(
            legal=False, on_solution=False, solved=False, fen=fen,
            plies_played=plies_played, san_history=[], opponent_reply=None,
            error="that is not a valid move notation",
        )

    if move not in board.legal_moves:
        return PuzzleProgress(
            legal=False, on_solution=False, solved=False, fen=fen,
            plies_played=plies_played, san_history=[], opponent_reply=None,
            error="that move is not legal in this position",
        )

    san = board.san(move)
    expected_index = plies_played
    expected = solution_uci[expected_index] if expected_index < len(solution_uci) else None

    if expected is not None and move.uci() != expected:
        # Legal, but not the point of the puzzle. The board does not advance, so the
        # learner can try again rather than being pushed into an unrelated line.
        return PuzzleProgress(
            legal=True, on_solution=False, solved=False, fen=fen,
            plies_played=plies_played, san_history=[], opponent_reply=None,
            error="legal move, but not the winning continuation — try again",
        )

    board.push(move)
    history = [san]
    next_plies = plies_played + 1

    if next_plies >= len(solution_uci):
        return PuzzleProgress(
            legal=True, on_solution=True, solved=True, fen=board.fen(),
            plies_played=next_plies, san_history=history, opponent_reply=None,
        )

    reply = chess.Move.from_uci(solution_uci[next_plies])
    reply_san = board.san(reply)
    board.push(reply)
    history.append(reply_san)

    return PuzzleProgress(
        legal=True, on_solution=True, solved=False, fen=board.fen(),
        plies_played=next_plies + 1, san_history=history, opponent_reply=reply_san,
    )
