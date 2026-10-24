# GradeFlow — student grade management (CLI)

Engineering catalogue **Project 1** (Beginner 1/5).

## Overview
Register students (unique IDs), record marks per subject, calculate totals and
averages, assign letters from **configurable grading boundaries**, show
individual results and the highest performer. Invalid marks, duplicate IDs and
incomplete results have explicit, documented behaviour.

## Features (implemented)
- Registration with duplicate-ID rejection; empty ID/name rejected.
- Marks validated to 0–100; re-recording a subject requires explicit `--update`.
- Total, average, letter grade (configurable bands; exact boundary → higher band).
- `top` lists every student sharing the highest average; mark-less students are
  excluded (never treated as zero).
- Results flag `incomplete (no marks recorded)` rather than fabricating zeros.
- JSON save/load.

## Architecture
`cli.py` → `core.Gradebook` (rules) → `models` / `config`; `storage.py` handles JSON.
Grading policy lives in `config.py` only.

## Usage
```bash
python3 -m app.cli add-student S1 "Ada"
python3 -m app.cli add-mark S1 Maths 72
python3 -m app.cli result S1
python3 -m app.cli top
```

## Testing
`python3 -m pytest tests/ -q` — boundary values (75/74.99/45/44.99), invalid marks
(negative, >100, NaN, non-numeric), duplicate IDs/marks, ties, incomplete handling,
configurable bands, storage round-trip.

## Limitations
Single-user local tool (authentication/roles are an *advanced* enhancement, out
of scope here). Averages cover recorded marks only; the result view shows the
mark count so this is visible. Screenshots pending capture.

## Future enhancements
CSV export, subject-specific grading rules, GUI, teacher/admin roles.

## Modern features & performance notes (feature-candidate pass)
- **Weighted categories** (`weighted`) with strict weight-sum validation.
- **What-if planner** (`what-if`): closed-form `O(1)` plan estimate, labelled
  PLAN ESTIMATE with assumptions; impossible targets reported `feasible: false`
  instead of optimistic numbers.
- **Boundary validation** (`check-boundaries`): strictly-decreasing cutoffs in
  0..100 with explicit problems.
- DSA notes: all feature functions are `O(n)` in their inputs (or `O(1)` for
  the what-if solver); no unbounded work added.
- Deferred candidates (with reasons): SIS/LMS imports (require real vendor
  APIs; out of offline scope); grade-curve automation (policy decision, not
  tooling).
