"""Import Lichess puzzles and openings into Tessera.

Lichess publishes its puzzle database under **CC0**, so it can be used
commercially without attribution. The openings side is different: the *names* and
ECO codes are reference data, and the lichess opening explorer is an API rather
than a dataset. This module therefore imports openings from a user-supplied JSON
file and does not scrape lichess.org.

The one detail that matters most
--------------------------------
In the Lichess puzzle CSV the `FEN` column is the position **before** the
opponent's setup move, and the first move in `Moves` is that setup move played by
the opponent. A solver plays from the *second* move onwards. Getting this wrong
produces "puzzles" that are already one move in, which look plausible and are
wrong for every single row — so the importer applies the setup move and stores
only the solver's line, and a test pins the behaviour.

Usage
-----
    python -m app.lichess_import --puzzles lichess_db_puzzle.csv.zst --limit 500
    python -m app.lichess_import --openings my-openings.json

Zstd, gzip and plain CSV are all accepted; the format is detected from the file
extension. Imported rows are recorded against a CC0 source so provenance is
preserved even though attribution is not legally required.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import io
import json
import pathlib
from collections.abc import Iterator
from dataclasses import dataclass

import chess
from sqlalchemy.orm import Session

from .chess_modality import validate_puzzle
from .database import Base, SessionLocal, engine
from .models import ChessPuzzle, Concept, OpeningRow, SourceRow
from .openings import MAX_OPENING_PLIES, Opening, san_line, validate_opening

LICHESS_SOURCE_ID = "src-lichess-puzzles"
LICHESS_SOURCE = {
    "id": LICHESS_SOURCE_ID,
    "title": "Lichess open puzzle database",
    "author": "Lichess (published by the lichess.org project)",
    "url": "https://database.lichess.org/",
    "license_class": "OPEN",
    "license_name": "CC0 1.0 (public domain dedication)",
    "commercial_use_ok": True,
    "attribution": "Puzzles from the Lichess open database, released under CC0.",
    "retrieved_at": "",  # filled at import time
}

#: The puzzle CSV columns we require. Extra columns are ignored rather than
#: shifting indices if Lichess adds one.
REQUIRED_COLUMNS = {"PuzzleId", "FEN", "Moves", "Rating", "Themes"}

#: Difficulty: ratings run from about 400 to 3000; map to the 1–5 concept scale.
MIN_RATING = 400
MAX_RATING = 3000


def rating_to_difficulty(rating: int) -> float:
    """Map a Lichess puzzle rating onto Tessera's 1–5 difficulty scale."""
    clamped = max(MIN_RATING, min(MAX_RATING, rating))
    return round(1.0 + 4.0 * (clamped - MIN_RATING) / (MAX_RATING - MIN_RATING), 2)


@dataclass(frozen=True)
class ParsedPuzzle:
    puzzle_id: str
    fen: str
    solution_uci: list[str]
    difficulty: float
    theme: str
    rating: int

    @property
    def title(self) -> str:
        return f"{self.theme.replace('_', ' ')} · {self.rating}"


def split_solution(fen: str, moves: str) -> tuple[str, list[str]]:
    """Apply the opponent's setup move; return (solver_fen, solver_line).

    This is the rule described in the module docstring, isolated so it can be
    tested directly.
    """
    plies = moves.split()
    if len(plies) < 2:
        raise ValueError("a puzzle needs at least a setup move and one reply")

    board = chess.Board(fen)
    setup = chess.Move.from_uci(plies[0])
    if setup not in board.legal_moves:
        raise ValueError(f"setup move {plies[0]} is not legal in the given position")
    board.push(setup)

    solver_line = plies[1:]
    # The solver must have the move now; if they do not, the row is malformed.
    if not solver_line:
        raise ValueError("no solution moves after the setup move")
    return board.fen(), solver_line


def parse_row(row: dict[str, str]) -> ParsedPuzzle | None:
    """Turn one CSV row into a puzzle, or None when the row must be skipped."""
    try:
        solver_fen, solver_line = split_solution(row["FEN"], row["Moves"])
        # The full line (setup + solution) must be legal from the original FEN.
        full = row["Moves"].split()
        board = chess.Board(row["FEN"])
        for uci in full:
            move = chess.Move.from_uci(uci)
            if move not in board.legal_moves:
                return None
            board.push(move)
        rating = int(float(row["Rating"]))
        themes = [t for t in row.get("Themes", "").split() if t]
        theme = themes[0] if themes else "tactics"
        parsed = ParsedPuzzle(
            puzzle_id=row["PuzzleId"],
            fen=solver_fen,
            solution_uci=solver_line,
            difficulty=rating_to_difficulty(rating),
            theme=theme,
            rating=rating,
        )
        # Reuse the same validator the board uses, so an import cannot create a
        # puzzle the solver could never actually finish.
        _validate_solver_line(parsed.fen, parsed.solution_uci)
        return parsed
    except (KeyError, ValueError):
        return None


def _validate_solver_line(fen: str, line: list[str]) -> None:
    if not line:
        raise ValueError("empty solution")
    board = chess.Board(fen)
    for uci in line:
        move = chess.Move.from_uci(uci)
        if move not in board.legal_moves:
            raise ValueError(f"illegal solver move {uci}")
        board.push(move)


def iter_csv_rows(path: pathlib.Path) -> Iterator[dict[str, str]]:
    """Stream rows from .zst, .gz or plain .csv without loading the file."""
    suffix = path.suffix.lower()
    if suffix == ".zst":
        import zstandard

        with open(path, "rb") as raw, zstandard.ZstdDecompressor().stream_reader(raw) as reader:
            text = io.TextIOWrapper(reader, encoding="utf-8", newline="")
            yield from csv.DictReader(text)
    elif suffix == ".gz":
        with gzip.open(path, "rt", encoding="utf-8", newline="") as text:
            yield from csv.DictReader(text)
    else:
        with open(path, encoding="utf-8", newline="") as text:
            yield from csv.DictReader(text)


def ensure_source(db: Session) -> None:
    if db.get(SourceRow, LICHESS_SOURCE_ID) is None:
        from datetime import date

        db.add(SourceRow(**{**LICHESS_SOURCE, "retrieved_at": date.today().isoformat()}))
        db.commit()


def import_puzzles(
    db: Session,
    path: pathlib.Path,
    *,
    limit: int | None = None,
    skip_existing: bool = True,
) -> dict[str, int]:
    """Import puzzles from a Lichess CSV export. Returns a count summary."""
    ensure_source(db)

    # Attach puzzles to the tactics concept when it exists, so solving them
    # feeds the learner model rather than a dead end.
    tactics = db.get(Concept, "chess.tactics")

    seen = 0
    imported = 0
    skipped_invalid = 0
    skipped_existing = 0
    header_checked = False

    for row in iter_csv_rows(path):
        if not header_checked:
            missing = REQUIRED_COLUMNS - set(row)
            if missing:
                raise ValueError(f"unexpected puzzle CSV header, missing: {sorted(missing)}")
            header_checked = True

        seen += 1
        if limit is not None and imported >= limit:
            break

        parsed = parse_row(row)
        if parsed is None:
            skipped_invalid += 1
            continue

        if skip_existing and db.get(ChessPuzzle, parsed.puzzle_id) is not None:
            skipped_existing += 1
            continue

        db.add(
            ChessPuzzle(
                id=parsed.puzzle_id,
                title=parsed.title,
                fen=parsed.fen,
                solution_uci=parsed.solution_uci,
                theme=parsed.theme,
                difficulty=parsed.difficulty,
                concept_id=tactics.id if tactics else None,
                source_id=LICHESS_SOURCE_ID,
            )
        )
        imported += 1
        if imported % 100 == 0:
            db.commit()

    db.commit()
    return {
        "rows_seen": seen,
        "imported": imported,
        "skipped_invalid": skipped_invalid,
        "skipped_existing": skipped_existing,
    }


def import_openings(db: Session, path: pathlib.Path) -> dict[str, int]:
    """Import openings from a JSON array supplied by the operator.

    Each entry: {"eco": "B20", "name": "Sicilian Defence", "family": "Sicilian",
                 "moves_uci": ["e2e4","c7c5"], "idea": "..."}
    """
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError("openings file must contain a JSON array")

    imported = 0
    skipped = 0
    for entry in payload:
        try:
            moves = [str(move) for move in entry["moves_uci"]]
            if len(moves) > MAX_OPENING_PLIES:
                raise ValueError("line too long")
            opening = Opening(
                id=str(entry["id"] if "id" in entry else f"eco-{entry['eco'].lower()}-{'-'.join(moves)}"),
                eco=str(entry["eco"]),
                name=str(entry["name"]),
                family=str(entry.get("family", "Openings")),
                moves_san=san_line(moves),
                moves_uci=" ".join(moves),
                idea=str(entry.get("idea", "")),
            )
            validate_opening(opening)
        except (KeyError, ValueError):
            skipped += 1
            continue

        if db.get(OpeningRow, opening.id) is not None:
            skipped += 1
            continue

        db.add(
            OpeningRow(
                id=opening.id,
                eco=opening.eco,
                name=opening.name,
                family=opening.family,
                moves_san=opening.moves_san,
                moves_uci=opening.moves_uci,
                idea=opening.idea,
                concept_id="chess.tactics" if db.get(Concept, "chess.tactics") else None,
            )
        )
        imported += 1

    db.commit()
    return {"imported": imported, "skipped": skipped}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Import Lichess puzzles or openings into Tessera")
    parser.add_argument("--puzzles", type=pathlib.Path, help="Lichess puzzle CSV (.csv, .gz, .zst)")
    parser.add_argument("--openings", type=pathlib.Path, help="Openings JSON file")
    parser.add_argument("--limit", type=int, default=None, help="Stop after N imported puzzles")
    args = parser.parse_args(argv)

    if not args.puzzles and not args.openings:
        parser.error("provide --puzzles and/or --openings")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if args.puzzles:
            if not args.puzzles.exists():
                print(f"file not found: {args.puzzles}")
                return 2
            print("puzzles:", import_puzzles(db, args.puzzles, limit=args.limit))
        if args.openings:
            if not args.openings.exists():
                print(f"file not found: {args.openings}")
                return 2
            print("openings:", import_openings(db, args.openings))
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
