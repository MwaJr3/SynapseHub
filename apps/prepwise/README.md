# PrepWise — interview preparation platform (FastAPI + SQLite)

Engineering catalogue **Project 17** (intermediate).

## Overview
A preparation platform with **company/role/difficulty filters**, **mock
interview sessions with a countdown timer and suggested pacing**, and a
**spaced review queue** using Leitner-style boxes.

## Honest framing (tested)
- Self-scores are **learner estimates — not verified performance** (stated in
  product and asserted in tests).
- The review scheduler is a **Leitner-style box heuristic** (interval per box),
  labelled as an educational approach — not a validated learning claim.
- Demo question content is **simulated** and labelled.

## DSA/performance note
Filtering is an indexed SQLite query `O(k)` per filter combination; box
schedule updates are single-row writes; the timer is client-side countdown
(only the target end-time is state).

## Run
```bash
uvicorn app.main:app --port 8018
```

## Testing
`python3 -m pytest tests/ -q` — filters, mock session self-score handling
(invalid entries never invented), box progression/reset, due queue, timer
bounds, honesty labels.

## Limitations
No realtime interviewer voice/video; no real question corpora; simple boxes
instead of a full spaced-repetition scheduler.

## Future improvements
Recording/transcription adapters, progress analytics, import from FlashKit
export format, weighted topic balancing.
