"""Chess openings: reference data plus position-based lookup.

Opening *names* and *ECO codes* are factual reference data. The lines here are
short move sequences (facts, not creative text) and every study note is written
for this project.

The important technical decision is that lookup is by **position**, not by move
order. Two different move orders that reach the same board are the same opening,
and a trainer that cannot see that will tell a learner they are "out of theory"
for playing a transposition. `canonical_position` normalises a position so
transpositions collapse onto one key.
"""

from __future__ import annotations

from dataclasses import dataclass

import chess

#: Openings longer than this stop being useful as an opening trainer entry.
MAX_OPENING_PLIES = 16


@dataclass(frozen=True)
class Opening:
    id: str
    eco: str
    name: str
    family: str
    moves_san: str
    moves_uci: str
    idea: str


def canonical_position(fen: str) -> str:
    """A position key that ignores halfmove/fullmove counters.

    Those two fields change with the path taken, not with the position, so
    including them would defeat transposition detection (and would also make
    "the same position reached on move 4 vs move 6" look different).
    """
    board = chess.Board(fen)
    placement = board.board_fen()
    turn = "w" if board.turn == chess.WHITE else "b"
    castling = board.castling_xfen()
    en_passant = chess.square_name(board.ep_square) if board.ep_square is not None else "-"
    return f"{placement} {turn} {castling} {en_passant}"


def moves_to_fen(moves_uci: list[str], start_fen: str | None = None) -> str:
    """Replay a UCI line and return the resulting FEN. Raises on illegal input."""
    board = chess.Board(start_fen) if start_fen else chess.Board()
    for uci in moves_uci:
        move = chess.Move.from_uci(uci)
        if move not in board.legal_moves:
            raise ValueError(f"illegal move in opening line: {uci}")
        board.push(move)
    return board.fen()


def san_line(moves_uci: list[str], start_fen: str | None = None) -> str:
    """Render a UCI line as numbered SAN, as a player would read it."""
    board = chess.Board(start_fen) if start_fen else chess.Board()
    parts: list[str] = []
    for uci in moves_uci:
        move = chess.Move.from_uci(uci)
        if move not in board.legal_moves:
            raise ValueError(f"illegal move in opening line: {uci}")
        number = board.fullmove_number
        if board.turn == chess.WHITE:
            parts.append(f"{number}. {board.san(move)}")
        else:
            parts.append(f"{number}... {board.san(move)}" if not parts else board.san(move))
        board.push(move)
    return " ".join(parts)


def validate_opening(opening: Opening) -> None:
    """Reject a malformed opening at seed/import time rather than in front of a learner."""
    moves = opening.moves_uci.split()
    if not moves:
        raise ValueError(f"{opening.id}: opening has no moves")
    if len(moves) > MAX_OPENING_PLIES:
        raise ValueError(f"{opening.id}: opening line is too long to be an opening entry")
    if not (len(opening.eco) == 3 and opening.eco[0].isalpha() and opening.eco[1:].isdigit()):
        raise ValueError(f"{opening.id}: ECO code must look like B20, got {opening.eco!r}")
    moves_to_fen(moves)  # raises on any illegal move
    if opening.moves_san.split() and san_line(moves) != opening.moves_san:
        raise ValueError(f"{opening.id}: SAN does not match the UCI line")


def lookup_by_position(fen: str, entries: list[Opening]) -> Opening | None:
    """The opening whose final position matches this one, if any."""
    key = canonical_position(fen)
    for opening in entries:
        try:
            if canonical_position(moves_to_fen(opening.moves_uci.split())) == key:
                return opening
        except ValueError:
            continue
    return None


def lookup_by_moves(moves_uci: list[str], entries: list[Opening]) -> list[Opening]:
    """Openings that start with this exact prefix.

    Ordering is chosen for how a trainer should speak: an opening whose line is
    *exactly* what was played comes first ("you are in the Classical Sicilian"),
    then the nearest continuations ("this can become a Najdorf"). Returning
    several lets the UI avoid picking one and being wrong.
    """
    player = " ".join(moves_uci)
    played = len(moves_uci)
    matches = [
        opening
        for opening in entries
        if " ".join(opening.moves_uci.split()[:played]) == player
    ]
    # Exact line first, then the closest continuation.
    return sorted(matches, key=lambda item: (len(item.moves_uci.split()) != played, len(item.moves_uci.split())))
