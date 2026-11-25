"""Authoritative (python-chess) FEN/PGN parsing and export used for import validation."""
from __future__ import annotations

import io

import chess
import chess.pgn

MAX_CHARS = 200_000
MAX_PLIES = 600


class InputError(ValueError):
    pass


def parse_input(text: str) -> dict:
    text = (text or "").strip()
    if not text:
        raise InputError("Nothing to load: provide a FEN or a PGN.")
    if len(text) > MAX_CHARS:
        raise InputError("Input is too large (limit 200000 characters).")
    if "[" not in text and "\n" not in text and text.count("/") == 7:
        try:
            board = chess.Board(text)
        except ValueError as exc:
            raise InputError(f"Invalid FEN: {exc}") from exc
        status = board.status()
        if status != chess.STATUS_VALID:
            raise InputError(f"Illegal position (status flags {int(status)}).")
        return {"kind": "fen", "start_fen": board.fen(), "plies": [], "headers": {}}
    game = chess.pgn.read_game(io.StringIO(text))
    if game is None or game.errors:
        reason = str(game.errors[0]) if game and game.errors else "could not parse"
        raise InputError(f"Invalid PGN: {reason}")
    board = game.board()
    start = board.fen()
    plies = []
    for move in game.mainline_moves():
        if len(plies) >= MAX_PLIES:
            raise InputError(f"Too many plies (limit {MAX_PLIES}).")
        san = board.san(move)
        board.push(move)
        plies.append({"san": san, "uci": move.uci(), "fen": board.fen()})
    if not plies:
        raise InputError("The PGN contains no moves.")
    return {"kind": "pgn", "start_fen": start, "plies": plies, "headers": dict(game.headers)}


def export_pgn(start_fen: str, ucis: list[str], headers: dict | None = None) -> str:
    board = chess.Board(start_fen)
    game = chess.pgn.Game()
    for k, v in (headers or {}).items():
        game.headers[str(k)] = str(v)
    if start_fen != chess.STARTING_FEN:
        game.setup(board)
    node = game
    for u in ucis:
        move = chess.Move.from_uci(u)
        if move not in board.legal_moves:
            raise InputError(f"Illegal move {u}.")
        node = node.add_variation(move)
        board.push(move)
    return str(game)
