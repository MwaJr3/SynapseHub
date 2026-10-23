"""PGN parsing, statistics, heuristic-flag and engine-degradation tests."""
import chess
import pytest

from app import analysis

SCHOLARS = """[Event "T"]
[White "A"]
[Black "B"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0
"""

HANGING_QUEEN = """[Event "T"]
[White "A"]
[Black "B"]
[Result "0-1"]

1. e4 e5 2. Qh5 Nc6 3. Qxe5+ Nxe5 4. f4 Qh4+ 0-1
"""


def test_parse_pgn_valid_and_invalid():
    game, moves = analysis.parse_pgn(SCHOLARS)
    assert game.headers["Result"] == "1-0"
    assert len(moves) == 7
    with pytest.raises(analysis.PgnError):
        analysis.parse_pgn("")
    with pytest.raises(analysis.PgnError):
        analysis.parse_pgn("this is not a game at all!!!")
    with pytest.raises(analysis.PgnError):
        analysis.parse_pgn("[Event 'x']\n\n*")


def test_stats_on_scholars_mate():
    result = analysis.analyse_game(SCHOLARS)
    assert result.stats["plies"] == 7
    assert result.stats["captures"] == 1  # Qxf7#
    assert result.result == "1-0"
    assert result.moves[-1].is_mate is True
    assert result.moves[-1].san == "Qxf7#"
    assert result.stats["white_moves"] == 4 and result.stats["black_moves"] == 3


def test_material_timeline_tracks_balance():
    result = analysis.analyse_game(HANGING_QUEEN)
    # After 3...Nxe5 black has won the queen (9) for a pawn (1) → balance -8
    nxe5 = next(m for m in result.moves if m.san == "Nxe5")
    assert nxe5.material_after == -8


def test_heuristic_flags_are_labelled_not_proof():
    result = analysis.analyse_game(HANGING_QUEEN)
    qxe5 = next(m for m in result.moves if m.san == "Qxe5+")
    assert any("heuristic" in flag for flag in qxe5.flags)
    assert result.flags_summary  # flags counted


def test_engine_absent_degrades_gracefully():
    result = analysis.analyse_game(SCHOLARS, engine_path="")
    assert result.engine["available"] is False
    assert "No evaluations" in result.engine["message"] or "heuristic" in result.engine["message"].lower()
    assert all(m.engine_eval_cp is None and m.classification is None for m in result.moves)


def test_engine_factory_injection_marks_classifications():
    import chess.engine as ce

    class SimpleFake:
        id = {"name": "FakeEngine 1.0"}

        def analyse(self, board, limit):
            return {"score": ce.PovScore(ce.Cp(50), chess.WHITE)}

        def quit(self):
            pass

    rows, info = analysis.run_engine_analysis(
        [chess.Move.from_uci("e2e4")], engine_path="", depth=5, engine_factory=SimpleFake
    )
    assert info["available"] is True
    assert info["name"] == "FakeEngine 1.0"
    assert rows[0][0] == 50
    assert rows[0][2] is None  # no drop on a +50 constant


def test_eval_drop_classification_thresholds():
    assert analysis.classify_eval_drop(250) == "blunder"
    assert analysis.classify_eval_drop(150) == "mistake"
    assert analysis.classify_eval_drop(60) == "inaccuracy"
    assert analysis.classify_eval_drop(10) is None
