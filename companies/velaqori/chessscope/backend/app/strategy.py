"""Middlegame strategy: pawn-structure feature detectors + original lessons and exercises.

Exercise answers are COMPUTED from the position by the detectors below (not hand-typed), so
they cannot drift from the board. Lesson text is original to ChessScope.
"""
from __future__ import annotations

import chess

PROV = {"source": "ChessScope original", "license": "Project license (original text)",
        "position_note": "Constructed teaching positions; answers computed by detectors in strategy.py"}


def _pawns(board: chess.Board, color: bool) -> list[int]:
    return list(board.pieces(chess.PAWN, color))


def _files(sqs: list[int]) -> set[int]:
    return {chess.square_file(s) for s in sqs}


def isolated(board: chess.Board, color: bool) -> list[int]:
    ps = _pawns(board, color)
    files = _files(ps)
    return sorted(s for s in ps if not ({chess.square_file(s) - 1, chess.square_file(s) + 1} & files))


def doubled(board: chess.Board, color: bool) -> list[int]:
    ps = _pawns(board, color)
    return sorted(s for s in ps if sum(1 for t in ps if chess.square_file(t) == chess.square_file(s)) > 1)


def passed(board: chess.Board, color: bool) -> list[int]:
    out = []
    enemy = _pawns(board, not color)
    for s in _pawns(board, color):
        f, r = chess.square_file(s), chess.square_rank(s)
        blocked = any(abs(chess.square_file(e) - f) <= 1 and ((chess.square_rank(e) > r) if color else (chess.square_rank(e) < r))
                      for e in enemy)
        if not blocked:
            out.append(s)
    return sorted(out)


def backward(board: chess.Board, color: bool) -> list[int]:
    out = []
    mine = _pawns(board, color)
    enemy_set = set(_pawns(board, not color))
    for s in mine:
        f, r = chess.square_file(s), chess.square_rank(s)
        step = 1 if color else -1
        stop_r = r + step
        if not 0 <= stop_r <= 7:
            continue
        stop = chess.square(f, stop_r)
        supporters = [t for t in mine if abs(chess.square_file(t) - f) == 1
                      and ((chess.square_rank(t) <= r) if color else (chess.square_rank(t) >= r))]
        stop_attacked = any(a in enemy_set for a in board.attackers(not color, stop))
        if not supporters and stop_attacked:
            out.append(s)
    return sorted(out)


def open_files(board: chess.Board) -> list[int]:
    allp = _pawns(board, True) + _pawns(board, False)
    return sorted(set(range(8)) - _files(allp))


def half_open_files(board: chess.Board, color: bool) -> list[int]:
    """Files with no pawn of `color` but at least one enemy pawn."""
    return sorted(_files(_pawns(board, not color)) - _files(_pawns(board, color)))


def outposts(board: chess.Board, color: bool) -> list[int]:
    """Empty squares on the 4th-6th rank (own perspective), pawn-supported and not attackable by enemy pawns."""
    out = []
    enemy = _pawns(board, not color)
    mine = set(_pawns(board, color))
    ranks = range(3, 6) if color else range(2, 5)
    for r in ranks:
        for f in range(8):
            sq = chess.square(f, r)
            if board.piece_at(sq) is not None:
                continue
            supported = any(a in mine for a in board.attackers(color, sq))
            # an enemy pawn can attack sq later if it stands on an adjacent file *ahead* of sq (from the enemy's side)
            attackable = any(abs(chess.square_file(e) - f) == 1 and ((chess.square_rank(e) > r) if color else (chess.square_rank(e) < r))
                             for e in enemy)
            if supported and not attackable:
                out.append(sq)
    return sorted(out)


DETECTORS = {
    "isolated_white": lambda b: isolated(b, True), "isolated_black": lambda b: isolated(b, False),
    "doubled_white": lambda b: doubled(b, True), "doubled_black": lambda b: doubled(b, False),
    "passed_white": lambda b: passed(b, True), "passed_black": lambda b: passed(b, False),
    "backward_white": lambda b: backward(b, True), "backward_black": lambda b: backward(b, False),
    "outposts_white": lambda b: outposts(b, True), "outposts_black": lambda b: outposts(b, False),
}

LESSONS = [
    dict(id="iqp", title="Isolated queen's pawn", fen="r1bq1rk1/pp2bppp/2n1pn2/8/3P4/2N2N2/PP2BPPP/R1BQ1RK1 w - - 0 1",
         structure="White pawn on d4 with no c- or e-pawn.",
         plan="The isolated pawn cannot be defended by another pawn, so its owner wants activity: pieces on the central squares, attacks on the kingside, and the break d4-d5 at the right moment. The defender wants to trade pieces (the pawn matters more in an endgame) and to blockade d5 with a knight.",
         pitfalls="Trading all the attacking pieces without compensation leaves the pawn as a lasting target."),
    dict(id="carlsbad", title="Carlsbad structure (minority attack)", fen="r1bq1rk1/pp3ppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 1",
         structure="White pawns on c3-d4 against Black pawns on c6-d5, with e-pawn exchanged. Here a similar skeleton is shown.",
         plan="White advances the b-pawn against Black's c6 pawn to create a weakness (the minority attack); Black meets it with play against the e4 square or a kingside pawn majority.",
         pitfalls="Attacking without preparing the b4-b5 lever just opens lines for the opponent."),
    dict(id="hedgehog", title="Hedgehog setup", fen="rnbq1rk1/1p1bppbp/p2p1np1/8/2PNP3/2N1B3/PP2BPPP/R2QK2R w KQ - 0 1",
         structure="Black pawns on a6, b6/d6, e6 with pieces behind them; White has a space advantage.",
         plan="Black stays compact and waits for White to commit; the pawn breaks ...b5 or ...d5 are the way to free the position. White uses the space to prepare central or kingside expansion.",
         pitfalls="Playing the break too early or too late. Passive waiting with no break in mind gets squeezed."),
    dict(id="maroczy", title="Maroczy bind", fen="r1bq1rk1/pp1nppbp/3p1np1/8/2PNP3/2N1B3/PP2BPPP/R2QK2R w KQ - 0 1",
         structure="White pawns on c4 and e4, controlling d5.",
         plan="White clamps down on the d5 square and keeps the space; Black needs piece trades and a freeing ...b5 or ...d5 break.",
         pitfalls="Trading the dark-squared bishops carelessly can leave the d-file and d5 square weak."),
    dict(id="french-chain", title="French pawn chain", fen="rnbqkb1r/pp3ppp/4pn2/2ppP3/3P4/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 1",
         structure="White pawns on d4 and e5 against Black's d5 and e6.",
         plan="Attack the base of the opponent's chain: White usually aims at ...c5/...f6 resistance; Black strikes the base of White's chain at d4 with ...c5 and the head at e5 with ...f6. White's space is kingside; Black's is queenside.",
         pitfalls="Attacking the head of the chain while the base is untouched usually gets nowhere."),
    dict(id="kid-chain", title="King's Indian chain", fen="rnbq1rk1/ppp1ppbp/3p1np1/8/2PPP3/2N2N2/PP2BPPP/R1BQK2R w KQ - 0 1",
         structure="White pawns c4-d4-e4 vs Black's d6 and a kingside fianchetto.",
         plan="When the centre locks (d4-d5 vs ...e5), each side attacks on the flank where the other is weak: White on the queenside with c4-c5, Black on the kingside with ...f5 and ...g5.",
         pitfalls="Both sides are in a race; wasting a tempo usually loses it."),
]

EXERCISES = [
    dict(id="iso-1", title="Find White's isolated pawns", fen="4k3/pp3ppp/8/3p4/2P5/8/P2P1PPP/4K3 w - - 0 1", detector="isolated_white",
         prompt="Select every isolated White pawn (no friendly pawn on an adjacent file).",
         why="An isolated pawn has no pawn neighbours to defend it, so pieces must guard it."),
    dict(id="iso-2", title="Find Black's isolated pawns", fen="4k3/p4p1p/8/1p6/3P4/8/PP3PPP/4K3 w - - 0 1", detector="isolated_black",
         prompt="Select every isolated Black pawn.", why="Each of these pawns has no friendly pawn on a neighbouring file."),
    dict(id="dbl-1", title="Doubled pawns", fen="4k3/pp3p2/5p2/8/2P5/2P5/P4PPP/4K3 w - - 0 1", detector="doubled_white",
         prompt="Select every doubled White pawn (two or more on one file).", why="Pawns on the same file cannot defend each other and block one another."),
    dict(id="pass-1", title="Passed pawns", fen="4k3/1p3p1p/8/3P4/8/8/P4PPP/4K3 w - - 0 1", detector="passed_white",
         prompt="Select every passed White pawn (no enemy pawn ahead on its file or adjacent files).", why="A passed pawn cannot be stopped by pawns, only by pieces."),
    dict(id="pass-2", title="Black's passed pawns", fen="4k3/p4p2/8/8/1p6/8/5PPP/4K3 w - - 0 1", detector="passed_black",
         prompt="Select every passed Black pawn.", why="No White pawn stands in front of these on the same or adjacent files."),
    dict(id="back-1", title="Backward pawns", fen="4k3/pp3ppp/3p4/8/4P3/8/PPP2PPP/4K3 w - - 0 1", detector="backward_black",
         prompt="Select every backward Black pawn (cannot be supported by a neighbour and its stop square is attacked by an enemy pawn).",
         why="A backward pawn is weak and the square in front of it is a good post for the opponent's pieces."),
    dict(id="out-1", title="Outposts for White", fen="4k3/pp3p1p/3p4/8/2P1P3/5N2/PP3PPP/4K3 w - - 0 1", detector="outposts_white",
         prompt="Select every White outpost: an empty square on the 4th-6th rank, protected by a White pawn, which no Black pawn can ever attack.",
         why="A piece on an outpost cannot be chased away by pawns and exerts lasting pressure."),
    dict(id="out-2", title="Outposts for Black", fen="4k3/pp3ppp/8/3p4/2P5/8/PP4PP/4K3 w - - 0 1", detector="outposts_black",
         prompt="Select every Black outpost.", why="Think like the white version, seen from Black's side of the board."),
]
BY_ID = {e["id"]: e for e in EXERCISES}
LESSON_BY_ID = {e["id"]: e for e in LESSONS}


def answer_for(ex: dict) -> list[str]:
    b = chess.Board(ex["fen"])
    return sorted(chess.square_name(s) for s in DETECTORS[ex["detector"]](b))


def features(fen: str) -> dict:
    b = chess.Board(fen)
    names = lambda sqs: sorted(chess.square_name(s) for s in sqs)  # noqa: E731
    return {
        "isolated": {"white": names(isolated(b, True)), "black": names(isolated(b, False))},
        "doubled": {"white": names(doubled(b, True)), "black": names(doubled(b, False))},
        "passed": {"white": names(passed(b, True)), "black": names(passed(b, False))},
        "backward": {"white": names(backward(b, True)), "black": names(backward(b, False))},
        "outposts": {"white": names(outposts(b, True)), "black": names(outposts(b, False))},
        "open_files": ["abcdefgh"[f] for f in open_files(b)],
    }
