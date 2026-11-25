"""Opening data access: Lichess chess-openings (CC0) + original notes, position-based lookup.

Every record returned carries a `provenance` block. Lookup is by *position* (EPD) so that
transpositions are recognised.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import chess

from .opening_notes import NOTES_LICENSE, NOTES_SOURCE, note_for

DATA = Path(__file__).parent / "data" / "openings.json"
MAX_DRILL_PLIES = 30


def epd_key(board: chess.Board) -> str:
    return board.epd()


@lru_cache(maxsize=1)
def _load() -> tuple[dict, list[dict], dict[int, set[str]]]:
    raw = json.loads(DATA.read_text(encoding="utf-8"))
    rows = []
    for i, r in enumerate(raw["openings"]):
        ucis = r["uci"].split()
        rows.append({"id": i, "eco": r["eco"], "name": r["name"], "uci": ucis})
    return raw["meta"], rows, {}


def meta() -> dict:
    return _load()[0]


def all_openings() -> list[dict]:
    return _load()[1]


@lru_cache(maxsize=1)
def _by_end_epd() -> dict[str, list[int]]:
    out: dict[str, list[int]] = {}
    for r in all_openings():
        b = chess.Board()
        for u in r["uci"]:
            b.push_uci(u)
        out.setdefault(epd_key(b), []).append(r["id"])
    return out


def provenance(has_note: bool) -> dict:
    m = meta()
    p = {"line_source": m["source"], "line_license": m["license"], "line_url": m["source_url"],
         "line_commit": m["commit"][:12]}
    p["explanation_source"] = NOTES_SOURCE if has_note else None
    p["explanation_license"] = NOTES_LICENSE if has_note else None
    return p


def public(r: dict, detail: bool = False) -> dict:
    board = chess.Board()
    san = []
    for u in r["uci"]:
        mv = chess.Move.from_uci(u)
        san.append(board.san(mv))
        board.push(mv)
    note = note_for(r["name"])
    out = {"id": r["id"], "eco": r["eco"], "name": r["name"], "plies": len(r["uci"]),
           "san": san, "uci": r["uci"], "fen": board.fen(),
           "has_explanation": note is not None, "provenance": provenance(note is not None)}
    if detail:
        out["explanation"] = note
    return out


def get(opening_id: int) -> dict | None:
    rows = all_openings()
    return rows[opening_id] if 0 <= opening_id < len(rows) else None


def search(q: str = "", eco: str = "", limit: int = 50) -> list[dict]:
    q = q.strip().lower()
    eco = eco.strip().upper()
    out = []
    for r in all_openings():
        if eco and not r["eco"].startswith(eco):
            continue
        if q and q not in r["name"].lower():
            continue
        out.append(r)
        if len(out) >= limit:
            break
    return out


class LineError(ValueError):
    pass


def replay(moves: list[str]) -> chess.Board:
    if len(moves) > 80:
        raise LineError("Too many moves.")
    b = chess.Board()
    for u in moves:
        try:
            mv = chess.Move.from_uci(u)
        except ValueError as exc:
            raise LineError(f"Bad move {u!r}.") from exc
        if mv not in b.legal_moves:
            raise LineError(f"Illegal move {u}.")
        b.push(mv)
    return b


def explore(moves: list[str]) -> dict:
    """Named continuations from the position reached by `moves` (prefix match + transpositions)."""
    board = replay(moves)
    here = epd_key(board)
    prefix = tuple(moves)
    nxt: dict[str, dict] = {}
    names_here = []
    for r in all_openings():
        u = r["uci"]
        if tuple(u[: len(prefix)]) == prefix:
            if len(u) == len(prefix):
                names_here.append(r)
            else:
                e = nxt.setdefault(u[len(prefix)], {"uci": u[len(prefix)], "count": 0, "example": r})
                e["count"] += 1
                if len(u) < len(e["example"]["uci"]):
                    e["example"] = r
    transposed = [r for oid in _by_end_epd().get(here, []) if (r := get(oid)) and tuple(r["uci"]) != prefix]
    moves_out = []
    for e in sorted(nxt.values(), key=lambda e: -e["count"]):
        mv = chess.Move.from_uci(e["uci"])
        moves_out.append({"uci": e["uci"], "san": board.san(mv), "lines": e["count"],
                          "example": {"id": e["example"]["id"], "eco": e["example"]["eco"], "name": e["example"]["name"]}})
    # best (longest) name that exactly matches this position, if any
    named = sorted(names_here + transposed, key=lambda r: len(r["name"]))
    return {"fen": board.fen(), "turn": "white" if board.turn else "black",
            "position_names": [{"id": r["id"], "eco": r["eco"], "name": r["name"]} for r in named[:5]],
            "moves": moves_out, "provenance": provenance(False)}


def match_game(ucis: list[str]) -> dict | None:
    """Longest opening whose moves are a prefix of the game, using positions so transpositions count.

    Returns the opening, its length, and the ply index (0-based move index) where the game left
    the known line (None if the whole opening line was followed to the end of the game).
    """
    board = chess.Board()
    best = None
    table = _by_end_epd()
    for i, u in enumerate(ucis[:40]):
        try:
            board.push_uci(u)
        except ValueError:
            break
        ids = table.get(epd_key(board))
        if ids:
            best = (i + 1, max((get(x) for x in ids), key=lambda r: len(r["name"])))
    if not best:
        return None
    plies, r = best
    return {"opening": public(r), "matched_plies": plies,
            "left_book_at_ply": plies + 1 if plies < len(ucis) else None}
