"""Tactics trainer: themed puzzles validated by search, adaptive selection, review scheduling.

Validation (no engine needed):
  * mate puzzles: forced mate within N moves proved by exhaustive search (endgames.mate_in);
  * material puzzles: a depth-3 alpha-beta material search (+capture quiescence) must show the
    chosen first move gains at least MIN_GAIN centipawns over the best alternative that does not
    win the tactic, and the accepted moves are exactly those within TOLERANCE of the best.
All explanations are original to ChessScope; positions are constructed teaching positions.
"""
from __future__ import annotations

import chess

from . import endgames

PROV = {"source": "ChessScope original", "license": "Project license (original text)",
        "position_note": "Constructed teaching positions, verified by search in tests"}
VAL = {chess.PAWN: 100, chess.KNIGHT: 320, chess.BISHOP: 330, chess.ROOK: 500, chess.QUEEN: 900, chess.KING: 0}
MATE = 100000
TOLERANCE = 50
MIN_GAIN = 250

PUZZLES = [
    dict(id="t-back-1", theme="back-rank", difficulty=1, fen="6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1", goal=("mate", 1),
         explanation="The black king is boxed in by its own pawns. A rook check on the back rank cannot be answered: this is the back-rank mate.",
         hint="Which rook move gives check along the eighth rank?"),
    dict(id="t-back-2", theme="back-rank", difficulty=2, fen="3r2k1/5ppp/8/8/8/8/5PPP/3RR1K1 w - - 0 1", goal=("mate", 2),
         explanation="Remove the only defender of the back rank with a rook trade that comes with check; the second rook then lands with mate.",
         hint="Two rooks against one defender of the eighth rank."),
    dict(id="t-smother-1", theme="smothered-mate", difficulty=1, fen="6rk/6pp/8/6N1/8/8/8/K7 w - - 0 1", goal=("mate", 1),
         explanation="A knight check cannot be blocked, and here the king's own rook and pawns take away every flight square: a smothered mate.",
         hint="A knight check from f7."),
    dict(id="t-fork-1", theme="fork", difficulty=1, fen="2q1k3/8/8/1N6/8/8/8/4K3 w - - 0 1", goal=("material",),
         explanation="The knight jumps to a square where it checks the king and attacks the queen at once. The king must move, and the queen falls.",
         hint="Find a knight move that checks and attacks something else."),
    dict(id="t-fork-2", theme="fork", difficulty=2, fen="r3k3/8/1P6/3N4/8/8/8/4K3 w - - 0 1", goal=("material",),
         explanation="A knight gives check and attacks a rook from the same square, a knight fork. Count the squares a knight attacks from each candidate square.",
         hint="Which square attacks both the king and the rook?"),
    dict(id="t-double-1", theme="discovered-check", difficulty=2, fen="4k3/1q6/8/8/4N3/8/8/4RK2 w - - 0 1", goal=("material",),
         explanation="Moving the knight uncovers the rook's check on the e-file. If the knight also attacks the queen (a double check), the opponent must move the king and loses the queen.",
         hint="Move the blocking piece with an attack of its own."),
    dict(id="t-pin-1", theme="pin", difficulty=2, fen="4k3/4b3/8/3P4/8/8/4R3/4K3 w - - 0 1", goal=("material",),
         explanation="A piece pinned against its king cannot move. If you can attack it again, you win it. Here a pawn attacks the pinned bishop, which cannot run away.",
         hint="The bishop cannot leave the e-file. Attack it with a pawn."),
    dict(id="t-hang-1", theme="loose-piece", difficulty=1, fen="4k3/8/8/3b4/8/8/8/3RK3 w - - 0 1", goal=("material",),
         explanation="Before anything else, check whether the opponent left a piece unprotected. Capturing a loose piece is the simplest tactic.",
         hint="Look at the undefended black piece."),
]
BY_ID = {p["id"]: p for p in PUZZLES}


def material(board: chess.Board) -> int:
    s = 0
    for p in board.piece_map().values():
        s += VAL[p.piece_type] * (1 if p.color == chess.WHITE else -1)
    return s


def _eval(board: chess.Board) -> int:
    return material(board) if board.turn == chess.WHITE else -material(board)


def _quiesce(board: chess.Board, alpha: int, beta: int, depth: int) -> int:
    stand = _eval(board)
    if depth == 0 or stand >= beta:
        return stand
    alpha = max(alpha, stand)
    for m in board.legal_moves:
        if board.is_capture(m):
            board.push(m)
            s = -_quiesce(board, -beta, -alpha, depth - 1)
            board.pop()
            if s >= beta:
                return s
            alpha = max(alpha, s)
    return alpha


def _neg(board: chess.Board, depth: int, alpha: int, beta: int) -> int:
    if board.is_checkmate():
        return -MATE
    if board.is_stalemate() or board.is_insufficient_material():
        return 0
    if depth == 0:
        return _quiesce(board, alpha, beta, 4)
    best = -MATE
    for m in board.legal_moves:
        board.push(m)
        s = -_neg(board, depth - 1, -beta, -alpha)
        board.pop()
        best = max(best, s)
        alpha = max(alpha, s)
        if alpha >= beta:
            break
    return best


def root_scores(board: chess.Board, depth: int = 3) -> dict[str, int]:
    out = {}
    for m in board.legal_moves:
        board.push(m)
        out[m.uci()] = -_neg(board, depth - 1, -MATE, MATE)
        board.pop()
    return out


def best_moves(puzzle: dict) -> tuple[list[str], int, int]:
    """Accepted first moves, best score, baseline (static material for side to move)."""
    board = chess.Board(puzzle["fen"])
    if puzzle["goal"][0] == "mate":
        n = puzzle["goal"][1]
        ok = []
        for m in list(board.legal_moves):
            c = board.copy(); c.push(m)
            if c.is_checkmate() or (n > 1 and not c.is_game_over() and all(
                    endgames.mate_in(_after(c, r), n - 1) for r in list(c.legal_moves))):
                ok.append(m.uci())
        return ok, MATE, 0
    scores = root_scores(board)
    top = max(scores.values())
    return [u for u, s in scores.items() if s >= top - TOLERANCE], top, _eval(board)


def _after(board: chess.Board, move: chess.Move) -> chess.Board:
    c = board.copy(); c.push(move)
    return c


def public(p: dict, full: bool = False) -> dict:
    board = chess.Board(p["fen"])
    out = {"id": p["id"], "theme": p["theme"], "difficulty": p["difficulty"], "fen": p["fen"],
           "side_to_move": "white" if board.turn else "black", "kind": p["goal"][0],
           "mate_in": p["goal"][1] if p["goal"][0] == "mate" else None, "provenance": PROV}
    if full:
        out["hint"] = p["hint"]
    return out


def check(p: dict, fen: str, uci: str) -> dict:
    if p["goal"][0] == "mate":
        return endgames.check_move({"goal": p["goal"]}, fen, uci)
    try:
        board = chess.Board(fen)
        move = chess.Move.from_uci(uci)
    except ValueError:
        return {"error": "Bad position or move."}
    if board.status() != chess.STATUS_VALID or move not in board.legal_moves:
        return {"error": "Illegal move or position."}
    if fen.split(" ")[:4] != p["fen"].split(" ")[:4]:
        return {"error": "Material puzzles are single-move: start from the puzzle position."}
    accepted, _top, _base = best_moves(p)
    san = board.san(move)
    ok = uci in accepted
    after = board.copy()
    reply = None
    if ok:
        after.push(move)
        # scripted reply: the opponent's best (by the same search)
        if not after.is_game_over():
            rs = root_scores(after, 2)
            ru = max(rs, key=lambda k: rs[k])
            rm = chess.Move.from_uci(ru)
            reply = {"uci": ru, "san": after.san(rm)}
            after.push(rm)
    return {"accepted": ok, "san": san, "reply": reply, "fen_after": after.fen() if ok else fen, "solved": ok,
            "why": "" if ok else "That does not win material by force; look for a forcing move."}


def select_next(progress: dict[str, dict]) -> tuple[dict, str]:
    """Adaptive choice: due reviews first, then the theme with the highest miss rate, then difficulty ramp."""
    due = [p for p in PUZZLES if progress.get(p["id"], {}).get("due") and progress[p["id"]]["attempts"] > 0]
    if due:
        return due[0], "Scheduled review: this puzzle is due again."
    by_theme: dict[str, list[int]] = {}
    for p in PUZZLES:
        pr = progress.get(p["id"])
        if pr and pr["attempts"]:
            miss = pr["attempts"] - pr["solved"]
            t = by_theme.setdefault(p["theme"], [0, 0])
            t[0] += miss
            t[1] += pr["attempts"]
    solved_levels = [p["difficulty"] for p in PUZZLES if progress.get(p["id"], {}).get("solved")]
    ceiling = (max(solved_levels) + 1) if solved_levels else 1
    fresh = [p for p in PUZZLES if not progress.get(p["id"], {}).get("attempts") and p["difficulty"] <= ceiling]
    if fresh:
        weak = sorted(by_theme, key=lambda th: -(by_theme[th][0] / by_theme[th][1]))
        for th in weak:
            for p in fresh:
                if p["theme"] == th and by_theme[th][0] > 0:
                    return p, f"New puzzle in a theme you have missed ({th})."
        return fresh[0], "Next new puzzle at your level."
    return min(PUZZLES, key=lambda p: (progress.get(p["id"], {}).get("due_at", ""))), "Revisiting the puzzle due soonest."
