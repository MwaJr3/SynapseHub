"""Game CRUD, analysis endpoint and ownership tests."""

PGN = """[White "A"]
[Black "B"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0
"""


def test_upload_analyse_report_roundtrip(authed_client):
    upload = authed_client.post("/api/games", json={"pgn_text": PGN})
    assert upload.status_code == 200
    game_id = upload.json()["id"]
    assert upload.json()["white"] == "A"

    listing = authed_client.get("/api/games").json()
    assert len(listing) == 1 and listing[0]["analysed"] is False

    analysis_body = authed_client.post(f"/api/games/{game_id}/analyze").json()
    assert analysis_body["stats"]["plies"] == 7
    assert analysis_body["engine"]["available"] is False
    assert "NOT proof" in analysis_body["disclaimer"]

    report = authed_client.get(f"/api/games/{game_id}/report.json").json()
    assert report["stats"]["captures"] == 1

    detail = authed_client.get(f"/api/games/{game_id}").json()
    assert detail["analysis"] is not None
    assert detail["pgn_text"] == PGN


def test_invalid_pgn_rejected(authed_client):
    response = authed_client.post("/api/games", json={"pgn_text": "garbage input"})
    assert response.status_code == 400
    assert "parse" in response.json()["detail"].lower() or "game" in response.json()["detail"].lower()


def test_games_are_private(authed_client, second_client):
    game_id = authed_client.post("/api/games", json={"pgn_text": PGN}).json()["id"]
    assert second_client.get("/api/games").json() == []
    assert second_client.get(f"/api/games/{game_id}").status_code == 404
    assert second_client.post(f"/api/games/{game_id}/analyze").status_code == 404
    assert second_client.get(f"/api/games/{game_id}/report.json").status_code == 404
    assert second_client.delete(f"/api/games/{game_id}").status_code == 404


def test_insights_aggregate_results(authed_client):
    authed_client.post("/api/games", json={"pgn_text": PGN})
    body = authed_client.get("/api/insights").json()
    assert body["games"] == 1
    assert body["results"]["white_wins"] == 1
    assert body["engine_available"] is False
    assert "NOT proof" in body["disclaimer"]


def test_requires_authentication(client):
    assert client.get("/api/games").status_code == 401
    assert client.get("/api/insights").status_code == 401
