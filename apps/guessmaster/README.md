# GuessMaster — number guessing game (CLI)

Engineering catalogue **Project 3** (Beginner 1/5).

## Overview
Guess a randomly generated number with higher/lower hints, configurable
difficulty levels, attempt tracking and a persistent high-score table.

## Design decisions
- Game logic (`GuessGame`) is fully separated from I/O — the CLI is a thin loop.
- The RNG is injectable (`random.Random(...)`), so tests are deterministic and
  never assert on a particular random value.
- Explicit state machine: `in_progress → won | lost`. Guessing after the game
  ends is rejected; invalid guesses never consume attempts.
- High scores rank **wins only**, lowest attempts first.

## Usage
```bash
python3 -m app.cli play --difficulty medium --player ada
python3 -m app.cli scores --difficulty medium
```

## Testing
`python3 -m pytest tests/ -q` — range boundaries, invalid inputs (out of range,
non-integer, boolean), win/lose transitions, illegal post-game guesses,
difficulty configuration, score ranking.

## Limitations
Single-player local game. Timed challenges, multiplayer and GUI are roadmap
items deliberately out of scope for level 1.

## Future enhancements
Multiple players, shared leaderboards, timed challenges, graphical interface.

## Modern features & performance notes (feature-candidate pass)
- **Seeded daily challenge** (`daily`): deterministic per-user-per-day seed —
  same challenge all day, reproducible (`O(1)` hashing).
- **Adaptive difficulty**: documented bounded heuristic (accuracy ≥0.8 →
  harder, ≤0.3 → easier; clamped widths). Not a learning-science claim.
- **Streaks** (`streak`): consecutive-day counts with a one-day grace.
- Deferred candidates (with reasons): online leaderboards (multi-user hosting
  out of scope); unlockable cosmetics (content design, not core learning).
