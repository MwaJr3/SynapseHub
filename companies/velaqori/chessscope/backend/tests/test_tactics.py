import chess
import pytest

from app import tactics as t


@pytest.mark.parametrize("p", t.PUZZLES, ids=lambda p: p["id"])
def test_puzzle_is_sound(p):
    b = chess.Board(p["fen"])
    assert b.status() == chess.STATUS_VALID
    ok, top, base = t.best_moves(p)
    assert ok, p["id"]
    if p["goal"][0] == "mate":
        assert top == t.MATE
    else:
        assert top - base >= t.MIN_GAIN and len(ok) <= 2, (p["id"], ok, top, base)
    assert p["explanation"] and p["hint"] and p["theme"]


def test_check_and_selection():
    p = t.BY_ID["t-fork-2"]
    assert t.check(p, p["fen"], "d5c7")["solved"]
    assert not t.check(p, p["fen"], "e1e2")["accepted"]
    assert "error" in t.check(p, p["fen"], "a1a2")
    first, why = t.select_next({})
    assert first["difficulty"] == 1 and "level" in why
    prog = {"t-fork-1": {"attempts": 2, "solved": 1, "due": False, "due_at": "x"}}
    nxt, why = t.select_next(prog)
    assert nxt["theme"] == "fork" and "fork" in why
    due = {"t-back-1": {"attempts": 1, "solved": 1, "due": True, "due_at": "x"}}
    assert t.select_next(due)[0]["id"] == "t-back-1"


def test_api_flow_and_privacy(authed_client, second_client, client):
    assert client.get("/api/tactics/next").status_code == 401
    nxt = authed_client.get("/api/tactics/next").json()["puzzle"]
    bad = authed_client.post(f"/api/tactics/{nxt['id']}/move", json={"fen": nxt["fen"], "move": "h5h6"})
    assert bad.status_code == 400
    p = t.BY_ID["t-back-1"]
    r = authed_client.post("/api/tactics/t-back-1/move", json={"fen": p["fen"], "move": "a1a8"}).json()
    assert r["solved"] and r["explanation"]
    mine = {x["id"]: x for x in authed_client.get("/api/tactics").json()["puzzles"]}
    other = {x["id"]: x for x in second_client.get("/api/tactics").json()["puzzles"]}
    assert mine["t-back-1"]["progress"]["solved"] == 1 and other["t-back-1"]["progress"] is None
