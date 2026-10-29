# QuizArena — collaborative quiz platform (FastAPI + SQLite)

Engineering catalogue **Project 16** (intermediate).

## Overview
Create quizzes with explanations and difficulty tags, take attempts with
**seeded, reproducible shuffling**, see per-question review after submitting,
and rank on a **leaderboard with a documented tie-break** (score desc, then
fastest completion time).

## Features
- Quiz-bank **import with validation**: every rejected row lists its reasons —
  nothing is dropped silently; export round-trips through the same schema.
- **Moderation**: players report questions; a review queue can restore or
  remove them (hidden questions leave play immediately).
- Attempts store their shuffle **seed** so any result can be reproduced.

## DSA/performance note
Shuffling is Fisher–Yates `O(n)` seeded by the attempt token; leaderboard
aggregation is a single SQLite `GROUP BY` with `MAX(score/total)` and
`MIN(duration)`; import validation is linear in rows.

## Run
```bash
uvicorn app.main:app --port 8017
```

## Testing
`python3 -m pytest tests/ -q` — bank validation reasons, export round-trip,
seeded shuffle determinism, scoring + review, leaderboard tie-break,
moderation hide/restore/remove.

## Limitations
Demo content is simulated; "collaborative" here means shared leaderboards and
moderation — not live co-editing; no LMS integrations.

## Future improvements
Question banks with reuse across quizzes, timed exams, spaced-repetition
export to FlashKit format, WebSocket live games.
