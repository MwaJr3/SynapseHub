# ChessScope — Chess Game Analysis

Full-stack chess game analysis: import PGN games, compute structural
statistics and **honestly labelled** heuristic flags, optionally run a local
UCI engine for real evaluations, and aggregate portfolio insights. Part of
the portfolio product **ChessScope** (Velaqori Systems).

> **Honesty statements (also in-product).** Heuristic flags mark suspicious
> patterns for review — they are **NOT proof** that a move is a mistake. Engine
> evaluations appear **only** when a local UCI engine (e.g. Stockfish) is
> configured; without one the app says so and invents no evaluations. Absence
> of flags is not proof a game is mistake-free.

## Features (working)

- PGN import with real parsing via `python-chess` (invalid PGNs rejected with
  reasons).
- Per-game statistics: plies, captures, checks, castles, promotions, per-side
  move counts, material-balance timeline.
- Heuristic flags (labelled): lower-value-piece captures into recapturable
  squares, possibly hanging pieces.
- Optional engine tier: per-move centipawn evals + drop-based classification
  (inaccuracy / mistake / blunder) with thresholds documented in
  `backend/app/analysis.py`. Degrades gracefully to heuristic-only.
- Portfolio insights: results by colour, openings from PGN labels, flag totals.
- Per-account game library with ownership enforcement (tested).
- JSON analysis report per game.

## Stack

FastAPI, SQLAlchemy (SQLite default, PostgreSQL-ready), `python-chess`,
React 19, TypeScript (strict), Tailwind CSS 4, Vite.
Tests: pytest (12) + Vitest (3).

## Run it

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt            # includes python-chess
python3 -m app.seed
python3 -m uvicorn app.main:app --port 8005

cd ../frontend
npm install && npm run dev                 # http://localhost:5178 → :8005
```

Optional engine: `export CHESSSCOPE_ENGINE=/path/to/stockfish` before starting
the backend. Without it, analysis is heuristic-only and says so.

### Demo account (fictional)

| Email | Password |
| --- | --- |
| `demo.player@chessscope.example` | `demo-password-123` |

The seeded game is a simulated Scholar's-mate demonstration, labelled as such.

## Tests

```bash
cd backend && python3 -m pytest tests/ -q    # 12 tests
cd ../frontend && npm test                   # 3 tests
```

Covered: PGN parsing (valid/invalid/empty), statistics on known games,
material timeline, heuristic flag labelling, graceful engine absence,
injected-fake engine classification path, threshold logic, game CRUD,
per-user isolation, insights aggregation, auth enforcement.

## Known limitations

- Heuristic flags are crude by design and clearly labelled; they can
  over-trigger. Engine mode is the accurate tier.
- No interactive board editor in this MVP (analysis is PGN-driven).
- Screenshots pending capture in a browser environment (not fabricated).
