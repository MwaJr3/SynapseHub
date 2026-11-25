"""Chess correctness (python-chess is the server authority) and FEN/PGN import/export."""
import chess
import pytest

from app import chess_tools


def test_castling_rights_and_execution():
    b = chess.Board("r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1")
    assert chess.Move.from_uci("e1g1") in b.legal_moves and b.is_castling(chess.Move.from_uci("e1g1"))
    b.push_san("O-O")
    assert b.piece_at(chess.F1).piece_type == chess.ROOK and not b.has_kingside_castling_rights(chess.WHITE)
    through_check = chess.Board("r3k2r/pppppppp/8/8/8/5r2/PPPPP1PP/R3K2R w KQkq - 0 1")
    assert chess.Move.from_uci("e1g1") not in through_check.legal_moves


def test_en_passant():
    b = chess.Board("rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3")
    m = chess.Move.from_uci("e5d6")
    assert b.is_en_passant(m)
    b.push(m)
    assert b.piece_at(chess.D5) is None


def test_en_passant_expires():
    b = chess.Board()
    for san in ["e4", "a6", "e5", "d5", "h3"]:
        b.push_san(san)
    assert chess.Move.from_uci("e5d6") not in b.legal_moves or b.ep_square is None


def test_promotion_requires_piece():
    b = chess.Board("8/P6k/8/8/8/8/8/K7 w - - 0 1")
    assert chess.Move.from_uci("a7a8") not in b.legal_moves
    assert chess.Move.from_uci("a7a8n") in b.legal_moves


def test_stalemate_and_mate():
    assert chess.Board("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1").is_stalemate()
    assert chess.Board("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3").is_checkmate()


def test_parse_pgn_and_fen():
    out = chess_tools.parse_input('[Event "x"]\n\n1. e4 e5 2. Nf3 *')
    assert out["kind"] == "pgn" and [p["san"] for p in out["plies"]] == ["e4", "e5", "Nf3"]
    assert chess_tools.parse_input(chess.STARTING_FEN)["kind"] == "fen"


@pytest.mark.parametrize("bad", ["", "   ", "1. e4 e5 2. Ke4", "8/8/8/8/8/8/8/8 w - - 0 1", "x" * 300000])
def test_parse_rejects(bad):
    with pytest.raises(chess_tools.InputError):
        chess_tools.parse_input(bad)


def test_export_roundtrip_custom_fen():
    pgn = chess_tools.export_pgn("8/P6k/8/8/8/8/8/K7 w - - 0 1", ["a7a8q", "h7g6"], {"Event": "t"})
    again = chess_tools.parse_input(pgn)
    assert again["start_fen"].startswith("8/P6k/8/8/8/8/8/K7") and len(again["plies"]) == 2
    with pytest.raises(chess_tools.InputError):
        chess_tools.export_pgn(chess.STARTING_FEN, ["e2e5"])


def test_parse_route(client):
    assert client.post("/api/chess/parse", json={"text": "1. e4 e5"}).status_code == 200
    r = client.post("/api/chess/parse", json={"text": "1. e4 e5 2. Ke4"})
    assert r.status_code == 400
