"""ChessScope analysis core: PGN parsing, statistics, and honesty-labelled insights.

Two analysis tiers:

1. **Heuristic tier (always available).** Structural statistics and clearly
   labelled *suspicious-pattern* flags computed with python-chess only. A flag
   is NOT proof that a move is bad — it marks patterns worth review.

2. **Engine tier (optional).** If a UCI engine path is configured and the
   binary exists, per-move centipawn evaluations and drop-based classification
   (inaccuracy / mistake / blunder) are computed. If not, the report says so
   explicitly — evaluations are never invented.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field

import chess
import chess.engine
import chess.pgn

MATERIAL = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}


class PgnError(ValueError):
    """The PGN text could not be parsed."""


@dataclass
class MoveStat:
    ply: int
    san: str
    side: str
    is_capture: bool
    is_check: bool
    is_mate: bool
    is_castle: bool
    is_promotion: bool
    captured_value: int | None
    material_after: int
    flags: list[str] = field(default_factory=list)
    engine_eval_cp: int | None = None
    eval_drop_cp: int | None = None
    classification: str | None = None


@dataclass
class GameAnalysis:
    headers: dict
    result: str
    moves: list[MoveStat]
    stats: dict
    engine: dict
    flags_summary: dict


def material_balance(board: chess.Board) -> int:
    """White-positive material difference in pawns."""
    total = 0
    for piece_type, value in MATERIAL.items():
        total += len(board.pieces(piece_type, chess.WHITE)) * value
        total -= len(board.pieces(piece_type, chess.BLACK)) * value
    return total


def parse_pgn(text: str) -> tuple[chess.pgn.Game, list[chess.Move]]:
    if not text.strip():
        raise PgnError("Empty PGN text.")
    game = chess.pgn.read_game(__import__("io").StringIO(text))
    if game is None:
        raise PgnError("Could not parse a game from this PGN text.")
    moves = list(game.mainline_moves())
    if not moves:
        raise PgnError("The game contains no moves.")
    return game, moves


def heuristic_flags(board_before: chess.Board, move: chess.Move) -> list[str]:
    """Label suspicious patterns — explicitly NOT proof of a mistake.

    Implemented with material values only (this python-chess build has no SEE):
    a capture of a lower-value piece into a square the opponent can recapture,
    and a moved piece left attacked and undefended by a lower-value attacker.
    """
    flags: list[str] = []
    moving_piece = board_before.piece_at(move.from_square)
    captured_value: int | None = None
    if board_before.is_capture(move):
        if board_before.is_en_passant(move):
            captured_value = MATERIAL[chess.PAWN]
        else:
            captured = board_before.piece_at(move.to_square)
            captured_value = MATERIAL[captured.piece_type] if captured else None

    board_after = board_before.copy(stack=False)
    board_after.push(move)
    opponent = board_after.turn  # the side that may recapture

    if captured_value is not None and moving_piece is not None:
        if captured_value < MATERIAL[moving_piece.piece_type] and board_after.attackers(opponent, move.to_square):
            flags.append(
                "captured a lower-value piece on a square the opponent can recapture (heuristic — review required)"
            )

    moved_piece = board_after.piece_at(move.to_square)
    if moved_piece is not None and moved_piece.piece_type != chess.KING:
        attackers = board_after.attackers(opponent, move.to_square)
        defenders = board_after.attackers(not opponent, move.to_square)
        if attackers and not defenders:
            lowest_attacker = min(
                MATERIAL[p.piece_type] for p in (board_after.piece_at(sq) for sq in attackers) if p is not None
            )
            if MATERIAL[moved_piece.piece_type] > lowest_attacker:
                flags.append("moved piece may be hanging (attacked, undefended, by a lower-value piece — heuristic)")
    return flags


def run_engine_analysis(
    moves: list[chess.Move],
    engine_path: str,
    depth: int,
    engine_factory=None,
) -> tuple[list[tuple[int | None, int | None, str | None]], dict]:
    """Per-move (eval_cp, eval_drop_cp, classification). Injectable factory for tests."""
    if engine_factory is None:
        if not engine_path or not os.path.exists(engine_path):
            return [], {"available": False, "name": None, "depth": None,
                        "message": "No UCI engine configured or the binary was not found. No evaluations are shown; heuristic analysis only."}
        engine_factory = lambda: chess.engine.SimpleEngine.popen_uci(engine_path)  # noqa: E731

    board = chess.Board()
    results: list[tuple[int | None, int | None, str | None]] = []
    engine = engine_factory()
    try:
        for move in moves:
            before = engine.analyse(board, chess.engine.Limit(depth=depth))["score"].white().score(mate_score=10000)
            board.push(move)
            after = engine.analyse(board, chess.engine.Limit(depth=depth))["score"].white().score(mate_score=10000)
            mover_before = before if board.turn == chess.BLACK else -before
            mover_after = after if board.turn == chess.BLACK else -after
            drop = mover_before - mover_after
            classification = None
            if drop >= 200:
                classification = "blunder"
            elif drop >= 100:
                classification = "mistake"
            elif drop >= 50:
                classification = "inaccuracy"
            results.append((after, drop, classification))
    finally:
        try:
            engine.quit()
        except Exception:  # noqa: BLE001 — engine shutdown must never crash analysis
            pass
    return results, {"available": True, "name": getattr(engine, "id", {}).get("name", "UCI engine") if isinstance(getattr(engine, "id", None), dict) else "UCI engine", "depth": depth, "message": "Evaluations computed with a local UCI engine."}


def classify_eval_drop(drop_cp: int) -> str | None:
    if drop_cp >= 200:
        return "blunder"
    if drop_cp >= 100:
        return "mistake"
    if drop_cp >= 50:
        return "inaccuracy"
    return None


def analyse_game(text: str, engine_path: str = "", depth: int = 12, engine_factory=None) -> GameAnalysis:
    game, moves = parse_pgn(text)
    headers = {key: game.headers.get(key, "") for key in ("White", "Black", "Result", "Date", "Event", "Site", "Opening")}
    result = game.headers.get("Result", "*")

    board = chess.Board()
    move_stats: list[MoveStat] = []
    flag_counts: dict[str, int] = {}
    for ply, move in enumerate(moves, start=1):
        flags = heuristic_flags(board, move)
        for flag in flags:
            key = flag.split(" (")[0]
            flag_counts[key] = flag_counts.get(key, 0) + 1
        captured_value: int | None = None
        if board.is_capture(move):
            captured_value = MATERIAL[chess.PAWN] if board.is_en_passant(move) else None
            if captured_value is None:
                captured = board.piece_at(move.to_square)
                captured_value = MATERIAL[captured.piece_type] if captured else None
        stat = MoveStat(
            ply=ply,
            san=board.san(move),
            side="white" if board.turn == chess.WHITE else "black",
            is_capture=board.is_capture(move),
            is_check=False,  # set after push
            is_mate=False,
            is_castle=board.is_castling(move),
            is_promotion=move.promotion is not None,
            captured_value=captured_value,
            material_after=0,
            flags=flags,
        )
        board.push(move)
        stat.is_check = board.is_check()
        stat.is_mate = board.is_checkmate()
        stat.material_after = material_balance(board)
        move_stats.append(stat)

    engine_rows, engine_info = run_engine_analysis(moves, engine_path, depth, engine_factory)
    if engine_info["available"]:
        for stat, (eval_cp, drop, classification) in zip(move_stats, engine_rows):
            stat.engine_eval_cp = eval_cp
            stat.eval_drop_cp = drop
            stat.classification = classification

    stats = {
        "plies": len(move_stats),
        "captures": sum(1 for m in move_stats if m.is_capture),
        "checks": sum(1 for m in move_stats if m.is_check),
        "castles": sum(1 for m in move_stats if m.is_castle),
        "promotions": sum(1 for m in move_stats if m.is_promotion),
        "final_material_balance": move_stats[-1].material_after if move_stats else 0,
        "white_moves": sum(1 for m in move_stats if m.side == "white"),
        "black_moves": sum(1 for m in move_stats if m.side == "black"),
    }
    return GameAnalysis(
        headers=headers,
        result=result,
        moves=move_stats,
        stats=stats,
        engine=engine_info,
        flags_summary=flag_counts,
    )
