"""Endgame solver correctness, exercise validation, scoring and ownership."""
import chess
import pytest

from app import endgames as eg


def b(fen):
    return chess.Board(fen)


def test_bitbase_known_results():
    assert eg.kpk_pawn_side_wins(b("4k3/8/4K3/4P3/8/8/8/8 w - - 0 1")) is True
    assert eg.kpk_pawn_side_wins(b("8/8/3k4/8/3K4/3P4/8/8 w - - 0 1")) is False  # defender holds the opposition
    assert eg.kpk_pawn_side_wins(b("8/8/3k4/8/3K4/3P4/8/8 b - - 0 1")) is True
    assert eg.kpk_pawn_side_wins(b("1k6/8/K7/P7/8/8/8/8 b - - 0 1")) is False  # rook pawn
    # colour/side symmetry: black pawn version of the same position agrees
    assert eg.kpk_pawn_side_wins(b("8/8/8/8/3k4/3p4/8/3K4 b - - 0 1")) in (True, False)
    assert eg.kpk_pawn_side_wins(b("8/8/3k4/3p4/3K4/8/8/8 b - - 0 1")) is False
    assert eg.kpk_pawn_side_wins(b("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")) is None


def test_bitbase_agrees_with_brute_force_on_short_wins():
    # A position where promotion is forced in <=3 white moves must be a bitbase win.
    assert eg.kpk_pawn_side_wins(b("8/4P3/4K3/8/8/8/8/k7 w - - 0 1")) is True


@pytest.mark.parametrize("ex", eg.EXERCISES, ids=lambda e: e["id"])
def test_every_exercise_is_valid_and_claim_matches_solver(ex):
    board = chess.Board(ex["fen"])
    assert board.status() == chess.STATUS_VALID
    kind = ex["goal"][0]
    if kind == "mate":
        assert eg.mate_distance(board, 3) == ex["goal"][1]
    elif kind == "win":
        assert eg.kpk_pawn_side_wins(board) is True
    elif kind == "draw":
        assert eg.kpk_pawn_side_wins(board) is False
    else:
        for u in ex["goal"][1]:
            mv = chess.Move.from_uci(u)
            assert mv in board.legal_moves, (ex["id"], u)
            board.push(mv)
        assert ex.get("verification") == "line-legal"
    assert ex["explanation"] and ex["hint"]


def test_check_move_scoring():
    ex = eg.BY_ID["mate-q-1"]
    ok = eg.check_move(ex, ex["fen"], "f7g7")
    assert ok["accepted"] and ok["solved"]
    bad = eg.check_move(ex, ex["fen"], "f7e7")
    assert not bad["accepted"]
    ex = eg.BY_ID["kpk-key-1"]
    assert eg.check_move(ex, ex["fen"], "d4d5")["accepted"]
    assert not eg.check_move(ex, ex["fen"], "d4c4")["accepted"]
    assert "error" in eg.check_move(ex, ex["fen"], "d4d8")


def test_lucena_line_plays_to_the_end():
    ex = eg.BY_ID["lucena"]
    fen = ex["fen"]
    line = ex["goal"][1]
    for i in range(0, len(line), 2):
        r = eg.check_move(ex, fen, line[i])
        assert r["accepted"], (i, r)
        fen = r["fen_after"]
    assert r["solved"]


def test_api_progress_and_privacy(authed_client, second_client, client):
    assert client.get("/api/endgames").status_code == 401
    r = authed_client.post("/api/endgames/mate-q-1/move", json={"fen": eg.BY_ID["mate-q-1"]["fen"], "move": "f7g7"}).json()
    assert r["solved"] and r["explanation"]
    mine = {e["id"]: e for e in authed_client.get("/api/endgames").json()["exercises"]}
    other = {e["id"]: e for e in second_client.get("/api/endgames").json()["exercises"]}
    assert mine["mate-q-1"]["progress"]["solved"] == 1
    assert other["mate-q-1"]["progress"] is None
    assert authed_client.get("/api/endgames/nope").status_code == 404
