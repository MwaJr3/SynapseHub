"""Engine adapter: unavailable path, bounds, fake engine, and a conditional real-Stockfish test."""
import chess
import pytest

from app import analysis, engine


class FakeEngine:
    id = {"name": "Fake 1"}

    def __init__(self, scores):
        self.scores = list(scores)
        self.limits = []

    def analyse(self, board, limit):
        self.limits.append(limit)
        cp = self.scores.pop(0)
        return {"score": chess.engine.PovScore(chess.engine.Cp(cp), chess.WHITE)}

    def quit(self):
        pass


def test_unavailable_is_explicit(monkeypatch):
    monkeypatch.setenv("CHESSSCOPE_DISABLE_ENGINE", "1")
    rows, info = engine.evaluate_moves([chess.Move.from_uci("e2e4")])
    assert rows == [] and info["available"] is False
    assert "Engine unavailable" in info["message"] and info["source"] is None


def test_depth_and_movetime_are_clamped():
    assert engine.clamp_depth(999) == engine.MAX_DEPTH
    assert engine.clamp_depth(-5) == engine.MIN_DEPTH
    assert engine.clamp_depth("junk") == engine.DEFAULT_DEPTH
    assert engine.clamp_movetime(1e6) == engine.MAX_MOVETIME_S


def test_fake_engine_labelled_and_bounded():
    fake = FakeEngine([20, 10, 400])  # start, after e4, after e5 (white +400: black blundered)
    moves = [chess.Move.from_uci("e2e4"), chess.Move.from_uci("e7e5")]
    rows, info = engine.evaluate_moves(moves, engine.EngineSettings(path="x", depth=99), lambda: fake)
    assert info["available"] and info["source"] == "stockfish-uci:Fake 1" and info["depth"] == engine.MAX_DEPTH
    assert rows[1][2] == "blunder"
    assert all(l.depth == engine.MAX_DEPTH and l.time <= engine.MAX_MOVETIME_S for l in fake.limits)


def test_engine_crash_reports_unavailable():
    class Boom(FakeEngine):
        def analyse(self, board, limit):
            raise RuntimeError("boom")

    rows, info = engine.evaluate_moves([chess.Move.from_uci("e2e4")], engine.EngineSettings(path="x"), lambda: Boom([]))
    assert rows == [] and not info["available"]


def test_factory_start_failure():
    def factory():
        raise FileNotFoundError("nope")

    _, info = engine.evaluate_moves([chess.Move.from_uci("e2e4")], engine.EngineSettings(path="x"), factory)
    assert not info["available"]


def test_budget_truncates():
    fake = FakeEngine([0] * 10)
    moves = [chess.Move.from_uci("e2e4"), chess.Move.from_uci("e7e5")]
    rows, info = engine.evaluate_moves(moves, engine.EngineSettings(path="x", total_budget_s=-1), lambda: fake)
    assert rows == [] and info["partial"] is True


def test_status_route(client):
    data = client.get("/api/engine/status").json()
    assert data["server"]["available"] is False and data["browser"]["available"] is True


@pytest.mark.skipif(not engine.resolve_engine_path(), reason="Stockfish binary not installed")
def test_real_stockfish_finds_mate_blunder(monkeypatch):
    monkeypatch.delenv("CHESSSCOPE_DISABLE_ENGINE", raising=False)
    pgn = '[Result "1-0"]\n\n1. f3 e5 2. g4 Qh4# 0-1'
    result = analysis.analyse_game(pgn, engine_path=engine.resolve_engine_path(), depth=8)
    assert result.engine["available"] and result.engine["source"].startswith("stockfish-uci:")
    assert result.moves[2].classification in ("mistake", "blunder")  # g4 allows mate
