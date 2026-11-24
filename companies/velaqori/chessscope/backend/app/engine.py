"""Hardened UCI engine adapter (Stockfish) for ChessScope.

Design rules:
* The engine is OPTIONAL. If it cannot be found or fails, callers get an
  explicit "engine unavailable" status -- evaluations are never invented.
* Every run is bounded: depth is clamped, each search has a movetime cap, the
  whole analysis has a wall-clock budget, and the number of plies is capped.
* Every evaluation carries a label of its source ("stockfish-uci:<name>").
* Resolution order: STOCKFISH_PATH -> CHESSSCOPE_ENGINE (legacy) -> bundled
  backend/engine/stockfish -> `stockfish` on PATH (apt installs /usr/games).
"""
from __future__ import annotations

import os
import shutil
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import chess
import chess.engine

MAX_DEPTH = 20
MIN_DEPTH = 1
DEFAULT_DEPTH = 12
MAX_MOVETIME_S = 5.0
DEFAULT_MOVETIME_S = 1.0
DEFAULT_TOTAL_BUDGET_S = 60.0
MAX_PLIES = 300
MATE_SCORE = 10000


def clamp_depth(depth: int | None) -> int:
    try:
        value = int(depth) if depth is not None else DEFAULT_DEPTH
    except (TypeError, ValueError):
        value = DEFAULT_DEPTH
    return max(MIN_DEPTH, min(MAX_DEPTH, value))


def clamp_movetime(seconds: float | None) -> float:
    try:
        value = float(seconds) if seconds is not None else DEFAULT_MOVETIME_S
    except (TypeError, ValueError):
        value = DEFAULT_MOVETIME_S
    return max(0.05, min(MAX_MOVETIME_S, value))


def resolve_engine_path(explicit: str | None = None) -> str:
    """Return a usable executable path or '' (never raises)."""
    if os.environ.get("CHESSSCOPE_DISABLE_ENGINE") == "1":
        return ""
    candidates: list[str] = []
    for raw in (explicit, os.environ.get("STOCKFISH_PATH"), os.environ.get("CHESSSCOPE_ENGINE")):
        if raw and raw.strip():
            candidates.append(raw.strip())
    candidates.append(str(Path(__file__).resolve().parent.parent / "engine" / "stockfish"))
    for name in ("stockfish",):
        found = shutil.which(name) or shutil.which(name, path="/usr/games:/usr/local/bin")
        if found:
            candidates.append(found)
    for cand in candidates:
        if os.path.isfile(cand) and os.access(cand, os.X_OK):
            return cand
    return ""


@dataclass
class EngineSettings:
    path: str = ""
    depth: int = DEFAULT_DEPTH
    movetime_s: float = DEFAULT_MOVETIME_S
    total_budget_s: float = DEFAULT_TOTAL_BUDGET_S

    @classmethod
    def from_env(cls) -> "EngineSettings":
        return cls(
            path=resolve_engine_path(),
            depth=clamp_depth(os.environ.get("CHESSSCOPE_ENGINE_DEPTH")),
            movetime_s=clamp_movetime(os.environ.get("CHESSSCOPE_ENGINE_MOVETIME")),
            total_budget_s=min(300.0, float(os.environ.get("CHESSSCOPE_ENGINE_BUDGET", DEFAULT_TOTAL_BUDGET_S))),
        )


def unavailable(reason: str) -> dict:
    return {
        "available": False,
        "name": None,
        "depth": None,
        "source": None,
        "message": f"Engine unavailable: {reason}. No evaluations are shown; heuristic analysis only.",
    }


def engine_status(settings: EngineSettings | None = None) -> dict:
    """Cheap status check (does not launch the engine)."""
    s = settings or EngineSettings.from_env()
    if not s.path:
        return unavailable("no Stockfish binary found (set STOCKFISH_PATH or run scripts/install-stockfish.sh)")
    return {"available": True, "path_configured": True, "depth": s.depth,
            "source": "stockfish-uci (server)", "message": "Server-side UCI engine configured."}


def score_to_cp(score: chess.engine.PovScore) -> int:
    value = score.white().score(mate_score=MATE_SCORE)
    return int(max(-MATE_SCORE, min(MATE_SCORE, value if value is not None else 0)))


def classify_eval_drop(drop_cp: int) -> str | None:
    if drop_cp >= 200:
        return "blunder"
    if drop_cp >= 100:
        return "mistake"
    if drop_cp >= 50:
        return "inaccuracy"
    return None


Row = tuple[int | None, int | None, str | None]


def evaluate_moves(
    moves: list[chess.Move],
    settings: EngineSettings | None = None,
    engine_factory: Callable[[], object] | None = None,
    start: chess.Board | None = None,
) -> tuple[list[Row], dict]:
    """Per-move (eval_cp_white, drop_cp_for_mover, classification) plus status.

    Never raises: any engine failure (missing binary, crash, timeout) yields an
    explicit unavailable/partial status instead.
    """
    s = settings or EngineSettings.from_env()
    if len(moves) > MAX_PLIES:
        return [], unavailable(f"game longer than {MAX_PLIES} plies")
    if engine_factory is None:
        if not s.path:
            return [], unavailable("no Stockfish binary found")
        path = s.path
        engine_factory = lambda: chess.engine.SimpleEngine.popen_uci(path, timeout=10)  # noqa: E731
    try:
        engine = engine_factory()
    except Exception as exc:  # noqa: BLE001
        return [], unavailable(f"engine failed to start ({type(exc).__name__})")

    depth = clamp_depth(s.depth)
    limit = chess.engine.Limit(depth=depth, time=clamp_movetime(s.movetime_s))
    board = (start or chess.Board()).copy()
    rows: list[Row] = []
    deadline = time.monotonic() + s.total_budget_s
    truncated = False
    try:
        try:
            name = (getattr(engine, "id", None) or {}).get("name", "UCI engine")
        except Exception:  # noqa: BLE001
            name = "UCI engine"
        prev = score_to_cp(engine.analyse(board, limit)["score"])
        for move in moves:
            if time.monotonic() > deadline:
                truncated = True
                break
            mover_white = board.turn == chess.WHITE
            board.push(move)
            after = score_to_cp(engine.analyse(board, limit)["score"])
            drop = (prev - after) if mover_white else (after - prev)
            rows.append((after, drop, classify_eval_drop(drop)))
            prev = after
    except Exception as exc:  # noqa: BLE001 -- engine crash/timeout mid-run
        return [], unavailable(f"engine error during analysis ({type(exc).__name__})")
    finally:
        try:
            engine.quit()
        except Exception:  # noqa: BLE001
            pass
    msg = "Evaluations computed by a server-side Stockfish (UCI) process."
    if truncated:
        msg += f" Time budget reached after {len(rows)} of {len(moves)} plies; later plies are unevaluated."
    return rows, {"available": True, "name": name, "depth": depth, "source": f"stockfish-uci:{name}",
                  "partial": truncated, "message": msg}
