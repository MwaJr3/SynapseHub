# ChessScope — Chess Game Analysis

Full-stack chess game analysis: import PGN games, compute structural
statistics and **honestly labelled** heuristic flags, optionally run a local
UCI engine for real evaluations, and aggregate portfolio insights. Part of
the portfolio product **ChessScope** (Velaqori Systems).

> **Honesty statements (also in-product).** Heuristic flags mark suspicious
> patterns for review — they are **NOT proof** that a move is a mistake. Engine
> evaluations appear **only** when a local UCI engine is
> configured; without one the app says so and invents no evaluations. Absence
> of flags is not proof a game is mistake-free.

## Features (working)

- PGN import with real parsing via `python-chess` (invalid PGNs rejected with
  reasons).
- Per-game statistics: plies, captures, checks, castles, promotions, per-side
  move counts, material-balance timeline.
- Heuristic flags (labelled): lower-value-piece captures into recapturable
  squares, possibly hanging pieces.
- Real engine tier: per-move centipawn evals + drop-based classification
  (inaccuracy ≥ 50cp / mistake ≥ 100cp / blunder ≥ 200cp). **A compiled
  Stockfish 11 binary is bundled** at `backend/engine/stockfish` and is
  auto-discovered (override with `CHESSSCOPE_ENGINE`). It is not committed to
  git — run `backend/scripts/setup-engine.sh` to download and compile it.
- Training & improvement: every classified move is recorded (phase + theme
  category), and the plan page aggregates mistakes into ranked focus areas
  with concrete practice suggestions and a rough early-vs-recent blunder trend
  ("suggestions, not guarantees").
  (inaccuracy / mistake / blunder) with thresholds documented in
  `backend/app/analysis.py`. Degrades gracefully to heuristic-only.
- Portfolio insights: results by colour, openings from PGN labels, flag totals.
- Per-account game library with ownership enforcement (tested).
- JSON analysis report per game.

## Stack

FastAPI, SQLAlchemy (SQLite default, PostgreSQL-ready), `python-chess`,
React 19, TypeScript (strict), Tailwind CSS 4, Vite.
Tests: pytest (16) + Vitest (3).

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

Engine: the bundled binary is auto-discovered from `backend/engine/stockfish`.
To use another engine: `export CHESSSCOPE_ENGINE=/path/to/stockfish` (and optional
`CHESSSCOPE_ENGINE_DEPTH`, default 12) before starting. Without any engine the app
degrades honestly to heuristic flags only.
the backend. Without it, analysis is heuristic-only and says so.

### Demo account (fictional)

| Email | Password |
| --- | --- |
| `demo.player@chessscope.example` | `demo-password-123` |

The seeded game is a simulated Scholar's-mate demonstration, labelled as such.

## Tests

```bash
cd backend && python3 -m pytest tests/ -q    # 16 tests
cd ../frontend && npm test                   # 3 tests
```

Covered: PGN parsing (valid/invalid/empty), statistics on known games,
material timeline, heuristic flag labelling, graceful engine absence,
injected-fake engine classification path, real bundled engine at shallow depth,
threshold logic, mistake recording + plan building, game CRUD,
per-user isolation, insights aggregation, auth enforcement.

## Known limitations

- Heuristic flags are crude by design and clearly labelled; they can
  over-trigger. Engine mode is the accurate tier.
- No interactive board editor in this MVP (analysis is PGN-driven).
- Screenshots pending capture in a browser environment (not fabricated).


## Stockfish: three honest evaluation paths (step 1)

| Path | Where | How |
|---|---|---|
| Server UCI | backend | `STOCKFISH_PATH`, else bundled `backend/engine/stockfish`, else `stockfish` on PATH. Install: `backend/scripts/install-stockfish.sh` (apt) or the `backend/Dockerfile`. |
| Browser WASM | frontend Web Worker | npm `stockfish@18.0.5` (lite, single-thread; no SharedArrayBuffer needed, so it works on Vercel). Files are copied to `public/engine` by `npm run dev/build`. |
| None | - | The UI/API says "Engine unavailable"; no evaluation is invented. |

Bounds: depth clamped 1-20, per-search movetime <= 5 s, whole-game budget 60 s (`CHESSSCOPE_ENGINE_BUDGET`), games over 300 plies refused. Every evaluation carries a `source` label.
Set `CHESSSCOPE_DISABLE_ENGINE=1` to force the unavailable path (used by tests).
Licence note: the npm `stockfish` package and Stockfish itself are GPL-3.0; the licence text ships in `public/engine/` and a Stockfish source link is https://github.com/official-stockfish/Stockfish.
Vercel: `backend/index.py` re-exports the FastAPI app; Postgres via `DATABASE_URL` + `DB_SCHEMA`. Vercel cannot run native binaries, so there the browser engine is the evaluation path.
