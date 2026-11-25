import chess
import pytest

from app import strategy as st


def sq(*names):
    return sorted(chess.parse_square(n) for n in names)


def test_detectors_known_structures():
    b = chess.Board("4k3/8/8/8/8/8/P1P1P3/4K3 w - - 0 1")
    assert st.isolated(b, True) == sq("a2", "c2", "e2")
    b = chess.Board("4k3/8/8/8/8/2P5/2P5/4K3 w - - 0 1")
    assert st.doubled(b, True) == sq("c2", "c3")
    b = chess.Board("4k3/p7/8/8/8/8/1P6/4K3 w - - 0 1")
    assert st.passed(b, True) == []  # a7 pawn controls b-file ahead? b2 faces a7 on adjacent file
    b = chess.Board("4k3/7p/8/8/8/8/1P6/4K3 w - - 0 1")
    assert st.passed(b, True) == sq("b2") and st.passed(b, False) == sq("h7")
    b = chess.Board("4k3/8/8/8/8/8/8/4K3 w - - 0 1")
    assert st.open_files(b) == list(range(8))
    # classic outpost: white pawn c4... d5 supported by c4, black has no c/e pawn
    b = chess.Board("4k3/pp3ppp/8/8/2P5/8/PP3PPP/4K3 w - - 0 1")
    assert chess.parse_square("d5") in st.outposts(b, True)
    b = chess.Board("4k3/pp1p1ppp/8/8/2P5/8/PP3PPP/4K3 w - - 0 1")
    assert chess.parse_square("d5") in st.outposts(b, True)  # d7 pawn does not attack d5
    b = chess.Board("4k3/pp2pppp/8/8/2P5/8/PP3PPP/4K3 w - - 0 1")
    assert chess.parse_square("d5") not in st.outposts(b, True)  # e7 pawn can attack d5 later


@pytest.mark.parametrize("item", st.LESSONS + st.EXERCISES, ids=lambda e: e["id"])
def test_positions_are_legal(item):
    assert chess.Board(item["fen"]).status() == chess.STATUS_VALID, item["id"]


@pytest.mark.parametrize("ex", st.EXERCISES, ids=lambda e: e["id"])
def test_every_exercise_has_nonempty_computed_answer(ex):
    assert st.answer_for(ex), ex["id"]
    assert ex["why"] and ex["prompt"]


def test_api_answer_and_privacy(authed_client, second_client, client):
    assert client.get("/api/strategy").status_code == 401
    ex = st.EXERCISES[0]
    good = authed_client.post(f"/api/strategy/exercises/{ex['id']}/answer", json={"squares": st.answer_for(ex)}).json()
    assert good["correct"]
    bad = authed_client.post(f"/api/strategy/exercises/{ex['id']}/answer", json={"squares": ["h1"]}).json()
    assert not bad["correct"] and bad["answer"] is None and bad["missed"]
    assert authed_client.post(f"/api/strategy/exercises/{ex['id']}/answer", json={"squares": ["z9"]}).status_code == 400
    mine = {e["id"]: e for e in authed_client.get("/api/strategy").json()["exercises"]}
    other = {e["id"]: e for e in second_client.get("/api/strategy").json()["exercises"]}
    assert mine[ex["id"]]["progress"]["attempts"] == 2 and other[ex["id"]]["progress"] is None
