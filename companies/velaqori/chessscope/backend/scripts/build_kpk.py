"""Generate an exact king+pawn vs king bitbase (win/not-win for White) with python-chess.

Output: app/data/kpk.bin  = W-to-move win bits then B-to-move win bits (see app/endgames.py index()).
Method: retrograde-free fixpoint over all legal states with the pawn on files a-d (others are
mirrored). 'Win' means White can force promotion to a queen or rook that is not captured and is
not stalemated; every other result is counted as a draw. Run once; the output is committed.
"""
from __future__ import annotations

import sys
from pathlib import Path

import chess

OUT = Path(__file__).resolve().parent.parent / "app" / "data" / "kpk.bin"
PAWNS = [chess.square(f, r) for f in range(4) for r in range(1, 7)]  # a2..d7


def idx(pawn_i: int, wk: int, bk: int) -> int:
    return (pawn_i * 64 + wk) * 64 + bk


def mk(wk: int, bk: int, p: int, white_to_move: bool) -> chess.Board:
    b = chess.Board(None)
    b.set_piece_at(wk, chess.Piece(chess.KING, chess.WHITE))
    b.set_piece_at(bk, chess.Piece(chess.KING, chess.BLACK))
    b.set_piece_at(p, chess.Piece(chess.PAWN, chess.WHITE))
    b.turn = chess.WHITE if white_to_move else chess.BLACK
    return b


def valid(wk: int, bk: int, p: int, white_to_move: bool) -> bool:
    if len({wk, bk, p}) < 3 or chess.square_distance(wk, bk) <= 1:
        return False
    if white_to_move and chess.square_name(bk) in [chess.square_name(s) for s in mk(wk, bk, p, True).attacks(p)]:
        return False
    return True


def main() -> None:
    wstates: dict[int, tuple[list[int], bool]] = {}  # idx -> (child B idx list, promo_wins)
    bstates: dict[int, list[int | None]] = {}  # idx -> children W idx (None = pawn captured)
    for pi, p in enumerate(PAWNS):
        for wk in range(64):
            for bk in range(64):
                if valid(wk, bk, p, True):
                    b = mk(wk, bk, p, True)
                    kids, promo = [], False
                    for m in b.legal_moves:
                        if m.promotion:
                            if m.promotion in (chess.QUEEN, chess.ROOK):
                                c = b.copy(); c.push(m)
                                if any(True for _ in c.legal_moves) and not any(c.is_capture(x) for x in c.legal_moves):
                                    promo = True
                        elif m.from_square == p:
                            kids.append(idx(PAWNS.index(m.to_square), wk, bk))
                        else:
                            kids.append(idx(pi, m.to_square, bk))  # king move: pawn stays
                    wstates[idx(pi, wk, bk)] = (kids, promo)
                if valid(wk, bk, p, False):
                    b = mk(wk, bk, p, False)
                    kids2: list[int | None] = []
                    for m in b.legal_moves:
                        kids2.append(None if m.to_square == p else idx(pi, wk, m.to_square))
                    bstates[idx(pi, wk, bk)] = kids2
    wwin: set[int] = set()
    bwin: set[int] = set()
    changed = True
    rounds = 0
    while changed:
        changed = False
        rounds += 1
        for k, (kids, promo) in wstates.items():
            if k not in wwin and (promo or any(c in bwin for c in kids)):
                wwin.add(k); changed = True
        for k, kids in bstates.items():
            if k not in bwin and kids and all(c is not None and c in wwin for c in kids):
                bwin.add(k); changed = True
    total = len(PAWNS) * 64 * 64
    data = bytearray(2 * total // 8)
    for k in wwin:
        data[k // 8] |= 1 << (k % 8)
    for k in bwin:
        j = total + k
        data[j // 8] |= 1 << (j % 8)
    OUT.write_bytes(bytes(data))
    print(f"rounds={rounds} W-wins={len(wwin)}/{len(wstates)} B-wins={len(bwin)}/{len(bstates)} bytes={len(data)}", file=sys.stderr)


if __name__ == "__main__":
    main()
