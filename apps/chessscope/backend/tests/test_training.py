"""Training module tests: mistake recording, recommendations, real-engine E2E."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("CHESSSCOPE_DATA_DIR", "/tmp/cs-training-test")

from app import config, recommendations
from app.main import app
from app.database import Base, engine as db_engine


ENGINE = config.ENGINE_PATH  # auto-discovered bundled Stockfish (empty if not installed)

SHORT_GAME = """
[Event "Training sample"]
[White "Demo Player"]
[Black "Demo Opponent"]
[Result "*"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 g6 4. Qf3 Nf6 5. Qb3 Nd4 6. Qc3 Bg7 7. d3 d6 8. Bg5 *
"""


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=db_engine)
    Base.metadata.create_all(bind=db_engine)
    with TestClient(app) as c:
        yield c


def _authed(client: TestClient):
    r = client.post("/api/auth/register", json={"email": "train@example.com", "password": "password123"})
    assert r.status_code in (200, 201), r.text
    return r


def test_phase_and_category_are_transparent():
    assert recommendations.phase_of(4, 78) == "opening"
    assert recommendations.phase_of(24, 78) == "middlegame"
    assert recommendations.phase_of(30, 20) == "endgame"
    assert recommendations.categorise(["hanging piece attacked"], False, "middlegame") == "hanging piece"
    assert recommendations.categorise(["capture recaptured by lower-value piece"], True, "middlegame") == "risky capture"
    assert recommendations.categorise([], False, "opening") == "opening"
    assert recommendations.categorise([], True, "endgame") == "endgame"
    assert recommendations.categorise([], False, "middlegame") == "positional"


def test_build_plan_ranks_focus_areas_by_count():
    mistakes = [
        {"classification": "blunder", "category": "hanging piece", "phase": "middlegame"},
        {"classification": "mistake", "category": "hanging piece", "phase": "middlegame"},
        {"classification": "inaccuracy", "category": "opening", "phase": "opening"},
    ]
    plan = recommendations.build_plan(mistakes)
    assert plan.total_mistakes == 3
    assert plan.by_classification == {"blunder": 1, "mistake": 1, "inaccuracy": 1}
    assert plan.focus_areas[0].category == "hanging piece"
    assert plan.focus_areas[0].count == 2
    assert "check" in plan.focus_areas[0].advice.lower() or "undefended" in plan.focus_areas[0].advice.lower()
    assert "not guarantees" in plan.note


def test_progress_summary_compares_earlier_and_later_games():
    mistakes = (
        [{"classification": "blunder", "category": "tactics", "phase": "middlegame", "created_at": f"2026-01-0{i}T00:00:00"} for i in range(1, 4)]
        + [{"classification": "inaccuracy", "category": "tactics", "phase": "middlegame", "created_at": f"2026-02-0{i}T00:00:00"} for i in range(1, 4)]
    )
    summary = recommendations.progress_summary(mistakes)
    assert summary["early_blunders"] == 3
    assert summary["recent_blunders"] == 0
    assert summary["direction"] == "improving"
    empty = recommendations.progress_summary([])
    assert "No recorded mistakes" in empty["note"]


@pytest.mark.skipif(not ENGINE or not os.path.exists(ENGINE), reason="bundled engine not installed")
def test_real_engine_records_mistakes_and_builds_plan(client: TestClient, monkeypatch):
    monkeypatch.setattr(config, "ENGINE_PATH", ENGINE)
    monkeypatch.setattr(config, "ENGINE_DEPTH", 3)  # fast but genuinely engine-driven
    _authed(client)
    r = client.post("/api/games", json={"pgn_text": SHORT_GAME})
    assert r.status_code in (200, 201), r.text
    game_id = r.json()["id"]
    r = client.post(f"/api/games/{game_id}/analyze")
    assert r.status_code == 200, r.text
    assert r.json()["engine"]["available"] is True

    r = client.get("/api/training/mistakes")
    assert r.status_code == 200
    mistakes = r.json()["mistakes"]
    assert len(mistakes) >= 1
    first = mistakes[0]
    assert first["classification"] in {"inaccuracy", "mistake", "blunder"}
    assert first["category"] in recommendations.CATEGORIES
    assert first["phase"] in recommendations.PHASES
    assert first["evalDropCp"] >= 50

    r = client.get("/api/training/plan")
    assert r.status_code == 200
    plan = r.json()
    assert plan["totalMistakes"] == len(mistakes)
    assert plan["focusAreas"], "plan must suggest at least one focus area"
    assert "not guarantees" in plan["note"]

    # Re-analysis replaces the game's records (no duplicates).
    client.post(f"/api/games/{game_id}/analyze")
    again = client.get("/api/training/mistakes").json()["mistakes"]
    assert len(again) == len(mistakes)
