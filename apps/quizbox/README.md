# QuizBox — quiz application (CLI)

Engineering catalogue **Project 4** (Beginner 2/5).

## Overview
Multiple-choice quizzes drawn from a validated question bank (science,
programming, mathematics, history — fictional demo content), with difficulty
levels, randomised selection, answer explanations and end-of-quiz results.

## Design decisions
- Questions are modelled **independently from presentation** (`models.Question`).
- Question definitions are validated on load: unique ids, ≥2 unique non-empty
  options, in-range `correct_index`, required explanation.
- Scoring is server-side (in-process): the session owns the score; double answer
  submissions are rejected so they cannot change results.
- Selection supports a seeded RNG — reproducible in tests, random in play.

## Usage
```bash
python3 -m app.cli start --category science --count 3
python3 -m app.cli start --difficulty easy --seed 42 --count 5
```

## Testing
`python3 -m pytest tests/ -q` — bank validation, invalid question shapes,
selection counts/filters, seeded reproducibility, scoring, per-category
breakdown, invalid/double answers.

## Limitations
The bundled question bank is **fictional demo content**. Timed examinations,
progress tracking and import/export are roadmap items.

## Future enhancements
Examination mode with timers, question-bank import/export, progress tracking,
web interface.
