# FlashKit — flashcard learning application (CLI + SQLite)

Engineering catalogue **Project 10** (Intermediate).

## Overview
Create decks and cards, study interactively, record answers **and** confidence,
revisit difficult cards sooner, and track progress.

## Design decisions (documented as required)
- **Card content is separate from review history** (different tables).
- **Confidence ≠ recall.** Each review stores self-reported confidence (1–5) and
  actual correctness as distinct columns; progress reports expose the gap
  (`confident_but_wrong`, `unsure_but_right`).
- **Review algorithm (v1, documented):** correct answers double the interval
  (1 → 2 → 4 …, capped at 60 days), nudged ±25% by confidence; incorrect answers
  reset the interval to 1 day. This is a simple, testable rule — not a claim of
  equivalence with SM-2 or any published algorithm.

## Usage
```bash
python3 -m app.cli add-deck "Biology" --subject science
python3 -m app.cli add-card 1 "What is a cell?" "The basic unit of life"
python3 -m app.cli due 1
python3 -m app.cli review 1 --correct --confidence 4
python3 -m app.cli progress 1
```

## Testing
`python3 -m pytest tests/ -q` — interval doubling/cap/reset, confidence nudges,
due-date calculation and due-card ordering, confidence-vs-recall separation,
validation.

## Limitations
The scheduler is intentionally simple and documented; daily study goals,
import/export and sync are roadmap items.

## Future improvements
A documented SM-2-style algorithm, statistics dashboard, import/export, goals,
accessibility improvements for a future GUI.

## Modern features & performance notes (feature-candidate pass)
- **Cloze cards** (`cloze`): `{{blank}}` parsing with exact answer spans.
- **Tags** (`tag`): dedupe + tag filtering `O(n)`.
- **Difficult-cards session** (`difficult`): lowest success rate first,
  deterministic tie-break, bounded limit.
- **Scheduler honesty**: interval logic is an **SM-2-style heuristic**
  (Anki-family method) — it is **not FSRS** and is not presented as validated
  spaced-repetition research.
- Deferred candidates (with reasons): FSRS adoption (would require verifying
  an implementation against the published algorithm before claiming it);
  audio/image cards (media pipeline out of scope).
