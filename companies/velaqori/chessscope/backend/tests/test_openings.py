"""Opening data, SRS, drill grading, ownership (IDOR) and game linking."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import chess

from app import openings, srs

RUY = "e4 e5 Nf3 Nc6 Bb5 a6".split()


def test_dataset_is_legal_and_has_provenance():
    rows = openings.all_openings()
    assert len(rows) > 3000
    for r in rows[::37]:  # sampled; build script replays every line
        b = chess.Board()
        for u in r["uci"]:
            b.push_uci(u)
    m = openings.meta()
    assert m["license"] == "CC0-1.0" and len(m["commit"]) == 40
    pub = openings.public(rows[100], detail=True)
    assert pub["provenance"]["line_license"] == "CC0-1.0"


def test_curated_notes_cover_at_least_40_named_openings():
    from app.opening_notes import NOTES
    names = {r["name"] for r in openings.all_openings()}
    assert len(NOTES) >= 40
    assert all(n in names for n in NOTES), [n for n in NOTES if n not in names]
    note = openings.public(next(r for r in openings.all_openings() if r["name"] == "Italian Game"), detail=True)
    assert note["explanation"] and note["provenance"]["explanation_source"]


def test_transposition_recognised():
    a = chess.Board()
    for s in ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"]:
        a.push_san(s)
    b = chess.Board()
    for s in ["c4", "e6", "Nc3", "Nf6", "d4", "Bb4"]:
        b.push_san(s)
    assert a.epd() == b.epd()
    m = openings.match_game([mv.uci() for mv in b.move_stack])
    assert m and "Nimzo-Indian" in m["opening"]["name"]


def test_srs_properties():
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    c = srs.Card()
    good, due = srs.review(c, correct=True, elapsed_days=1.0, now=now)
    bad, due_bad = srs.review(c, correct=False, elapsed_days=1.0, now=now)
    assert good.stability > c.stability > bad.stability
    assert due > now + timedelta(days=1) and due_bad == now + srs.RETRY_AFTER_FAILURE
    assert abs(srs.retrievability(5.0, 5.0) - 0.9) < 1e-9
    assert abs(srs.retrievability(5.0, srs.interval_for(5.0)) - 0.9) < 1e-6


def _ruy_id():
    return next(r["id"] for r in openings.all_openings() if r["name"] == "Ruy Lopez: Morphy Defense")


def test_explore_endpoint_and_illegal_input(authed_client):
    r = authed_client.get("/api/openings/explore", params={"moves": "e2e4,e7e5"})
    assert r.status_code == 200 and r.json()["moves"]
    assert authed_client.get("/api/openings/explore", params={"moves": "e2e5"}).status_code == 400
    assert authed_client.get("/api/openings", params={"q": "sicilian"}).json()["results"]


def test_requires_login(client):
    assert client.get("/api/openings").status_code == 401
    assert client.get("/api/openings/cards").status_code == 401


def test_drill_grading_and_scheduling(authed_client):
    oid = _ruy_id()
    card = authed_client.post("/api/openings/cards", json={"opening_id": oid, "side": "white"}).json()
    again = authed_client.post("/api/openings/cards", json={"opening_id": oid, "side": "white"}).json()
    assert again["id"] == card["id"]  # idempotent
    line = openings.get(oid)["uci"]
    mine = [u for i, u in enumerate(line) if i % 2 == 0]
    ok = authed_client.post(f"/api/openings/cards/{card['id']}/review", json={"moves": mine}).json()
    assert ok["correct"] and ok["card"]["reps"] == 1 and not ok["card"]["due"]
    wrong = authed_client.post(f"/api/openings/cards/{card['id']}/review", json={"moves": ["d2d4"]}).json()
    assert not wrong["correct"] and wrong["first_error_index"] == 0 and wrong["card"]["lapses"] == 1
    # the prompt never reveals the line
    assert "expected" not in authed_client.get(f"/api/openings/cards/{card['id']}/drill").text


def test_cards_are_private(authed_client, second_client):
    card = authed_client.post("/api/openings/cards", json={"opening_id": _ruy_id(), "side": "white"}).json()
    cid = card["id"]
    assert second_client.get("/api/openings/cards").json()["cards"] == []
    assert second_client.post(f"/api/openings/cards/{cid}/review", json={"moves": []}).status_code == 404
    assert second_client.get(f"/api/openings/cards/{cid}/drill").status_code == 404
    assert second_client.delete(f"/api/openings/cards/{cid}").status_code == 404


def test_game_opening_link_and_idor(authed_client, second_client):
    pgn = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 *"
    gid = authed_client.post("/api/games", json={"pgn_text": pgn}).json()["id"]
    body = authed_client.get(f"/api/games/{gid}/opening").json()
    assert "Ruy Lopez" in body["match"]["opening"]["name"]
    assert second_client.get(f"/api/games/{gid}/opening").status_code == 404
