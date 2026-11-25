import httpx
import pytest

from app import importer

TWO = """[Event "A"]
[White "x"]
[Black "y"]
[Result "1-0"]
[Site "https://lichess.org/abcd1234"]

1. e4 e5 2. Nf3 1-0

[Event "B"]
[White "p"]
[Black "q"]
[Result "*"]

*

[Event "C"]
[Result "0-1"]

1. d4 d5 0-1
"""


def test_username_validation_blocks_injection():
    for bad in ["", "a", "../etc", "bob?max=9999", "x y", "a" * 31]:
        with pytest.raises(importer.ImportError_):
            importer.fetch_lichess_pgn(bad, 5)


def test_split_games_skips_empty():
    games = importer.split_games(TWO)
    assert len(games) == 2


def test_paste_import_and_privacy(authed_client, second_client):
    r = authed_client.post("/api/import/pgn", json={"pgn_text": TWO}).json()
    assert r["added"] == 2
    assert len(authed_client.get("/api/games").json()) == 2
    assert second_client.get("/api/games").json() == []
    assert authed_client.post("/api/import/pgn", json={"pgn_text": "garbage"}).status_code == 400


def test_lichess_import_bounds_and_dedupe(authed_client, monkeypatch):
    seen = {}

    def fake(username, n):
        seen["n"] = n
        return TWO

    monkeypatch.setattr(importer, "fetch_lichess_pgn", fake)
    assert authed_client.post("/api/import/lichess", json={"username": "someone", "max_games": 500}).status_code == 422
    r = authed_client.post("/api/import/lichess", json={"username": "someone", "max_games": 5}).json()
    assert r["added"] == 2 and seen["n"] == 5
    again = authed_client.post("/api/import/lichess", json={"username": "someone", "max_games": 5}).json()
    assert again["skipped_duplicates"] == 1  # only games with a Lichess Site are deduped


def test_lichess_errors_are_explicit(authed_client, monkeypatch):
    def boom(u, n):
        raise importer.ImportError_("Lichess did not answer in time.")
    monkeypatch.setattr(importer, "fetch_lichess_pgn", boom)
    r = authed_client.post("/api/import/lichess", json={"username": "someone"})
    assert r.status_code == 502 and "in time" in r.json()["detail"]


def test_requests_have_timeout_and_no_auth(monkeypatch):
    captured = {}

    class FakeClient:
        def __init__(self, **kw):
            captured.update(kw)
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def stream(self, method, url, **kw):
            captured["headers"] = kw["headers"]
            raise httpx.ConnectError("no network")

    monkeypatch.setattr(httpx, "Client", FakeClient)
    with pytest.raises(importer.ImportError_):
        importer.fetch_lichess_pgn("someone", 3)
    assert captured["timeout"] == importer.TIMEOUT_S
    assert "Authorization" not in captured["headers"]
