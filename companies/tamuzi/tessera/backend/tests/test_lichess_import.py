"""The Lichess importer, including the setup-move rule that is easy to get wrong."""
from __future__ import annotations

import gzip
import io
import json
import pathlib

import chess
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.lichess_import import (
    import_openings,
    import_puzzles,
    parse_row,
    rating_to_difficulty,
    split_solution,
)
from app.models import ChessPuzzle, Concept, OpeningRow, SourceRow

# Fixture rows in the exact Lichess column format. The move lines are synthetic
# but every ply is legal chess, verified with python-chess, so these exercise the
# parser honestly. (A real database row can look identical in shape.)
FIXTURE_CSV = """PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
fixt1,rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1,e2e4 e7e5 g1f3,1705,79,100,54395,mate mateIn2 middlegame short,https://lichess.org/yyznGmXs/black,
fixt2,r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1,a1a8 e8e7 h1h8,1951,78,100,1234,endgame rook master,https://lichess.org/abcd/white,
"""


@pytest.fixture()
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    session.add(Concept(id="chess.tactics", title="Tactical motifs", subject="Chess", difficulty=3.0))
    session.commit()
    try:
        yield session
    finally:
        session.close()


def write(path: pathlib.Path, text: str) -> pathlib.Path:
    path.write_text(text, encoding="utf-8")
    return path


START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
LINE = "e2e4 e7e5 g1f3"


def test_the_setup_move_is_applied_and_not_given_to_the_solver():
    """Lichess gives the position BEFORE the opponent's setup move."""
    solver_fen, line = split_solution(START_FEN, LINE)
    # The setup move (e2e4) must already be played, and must not be the first ask.
    assert line == ["e7e5", "g1f3"]
    board = chess.Board(START_FEN)
    board.push_uci("e2e4")
    assert solver_fen == board.fen()


def test_solver_line_is_legal_from_the_resulting_position():
    solver_fen, line = split_solution(START_FEN, LINE)
    board = chess.Board(solver_fen)
    for uci in line:
        move = chess.Move.from_uci(uci)
        assert move in board.legal_moves
        board.push(move)


def test_split_rejects_a_line_with_no_reply():
    with pytest.raises(ValueError):
        split_solution(START_FEN, "e2e4")


def test_split_rejects_a_setup_move_that_is_not_legal():
    with pytest.raises(ValueError):
        split_solution(START_FEN, "e2e5 e7e6")


def test_parse_row_builds_a_puzzle():
    row = {
        "PuzzleId": "fixt1",
        "FEN": START_FEN,
        "Moves": LINE,
        "Rating": "1705",
        "Themes": "mate mateIn2",
    }
    parsed = parse_row(row)
    assert parsed is not None
    assert parsed.theme == "mate"
    assert parsed.rating == 1705
    assert "mate" in parsed.title


def test_parse_row_skips_a_broken_row_instead_of_raising():
    assert parse_row({"PuzzleId": "x", "FEN": "garbage", "Moves": "a1a2", "Rating": "1000"}) is None


def test_rating_maps_onto_the_one_to_five_scale():
    assert rating_to_difficulty(400) == 1.0
    assert rating_to_difficulty(3000) == 5.0
    assert 1.0 < rating_to_difficulty(1700) < 5.0
    # Out-of-range values clamp rather than producing nonsense.
    assert rating_to_difficulty(50) == 1.0
    assert rating_to_difficulty(99999) == 5.0


def test_import_puzzles_records_source_and_concept(db, tmp_path):
    path = write(tmp_path / "puzzles.csv", FIXTURE_CSV)
    report = import_puzzles(db, path, limit=None)

    assert report["imported"] == 2
    assert db.query(ChessPuzzle).count() == 2
    # Provenance is preserved even though CC0 does not require attribution.
    assert db.get(SourceRow, "src-lichess-puzzles") is not None
    imported = db.get(ChessPuzzle, "fixt1")
    assert imported is not None
    assert imported.source_id == "src-lichess-puzzles"
    assert imported.concept_id == "chess.tactics"


def test_import_respects_the_limit(db, tmp_path):
    path = write(tmp_path / "puzzles.csv", FIXTURE_CSV)
    report = import_puzzles(db, path, limit=1)
    assert report["imported"] == 1


def test_reimporting_is_idempotent(db, tmp_path):
    path = write(tmp_path / "puzzles.csv", FIXTURE_CSV)
    import_puzzles(db, path)
    again = import_puzzles(db, path)
    assert again["imported"] == 0
    assert again["skipped_existing"] == 2


def test_gzip_input_is_streamed_correctly(db, tmp_path):
    path = tmp_path / "puzzles.csv.gz"
    with gzip.open(path, "wt", encoding="utf-8", newline="") as handle:
        handle.write(FIXTURE_CSV)
    report = import_puzzles(db, path)
    assert report["imported"] == 2


def test_zstd_input_is_streamed_correctly(db, tmp_path):
    zstandard = pytest.importorskip("zstandard")
    path = tmp_path / "puzzles.csv.zst"
    compressed = zstandard.ZstdCompressor().compress(FIXTURE_CSV.encode())
    path.write_bytes(compressed)
    report = import_puzzles(db, path)
    assert report["imported"] == 2


def test_unexpected_header_is_refused(db, tmp_path):
    path = write(tmp_path / "bad.csv", "id,position\n1,x\n")
    with pytest.raises(ValueError, match="header"):
        import_puzzles(db, path)


def test_openings_import_from_json(db, tmp_path):
    payload = [
        {"eco": "C20", "name": "King's Pawn Game", "family": "Open games", "moves_uci": ["e2e4", "e7e5"], "idea": "Test."},
        {"eco": "BAD", "name": "Broken", "family": "x", "moves_uci": ["e2e5"], "idea": ""},
    ]
    path = tmp_path / "openings.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    report = import_openings(db, path)
    assert report["imported"] == 1
    assert report["skipped"] == 1
    assert db.query(OpeningRow).count() == 1
