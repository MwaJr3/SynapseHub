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
