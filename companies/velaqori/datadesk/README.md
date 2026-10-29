# DataDesk — data analysis dashboard (CLI + HTML reports)

Engineering catalogue **Project 14** (Intermediate 3/5).

## Overview
Imports CSV files, validates structure, **cleans with explicit, reported
decisions**, computes descriptive statistics and trend estimates, groups
totals, and writes HTML + JSON reports.

## Engineering requirements (as enforced/tested)
- Ingestion, cleaning, analysis and reporting are **separate modules**.
- **Source files are never modified.**
- Cleaning decisions are explicit: non-numeric values are **dropped from
  numeric analysis and counted in warnings — never zero-filled**.
- Required columns are validated at load; missing/invalid values are reported.
- Charts include **accessible text summaries** (`aria-label` + visible summary),
  correct labels, and no misleading scales (zero-based bars).
- Trend slopes are labelled as least-squares **association over row order —
  never causation**.

## Usage
```bash
python3 -m app.cli data/sample_exams.csv --numeric score --group-by subject --value score \
  --html report.html --json report.json
```

## Testing
`python3 -m pytest tests/ -q` — required-column validation, drop-not-fill
cleaning, stats correctness (min/max/median/mean), group totals, text summaries
in reports.

## Limitations
Charts are static SVG. Interactive filters and multiple chart types are roadmap
items. Numeric inference uses a documented 30% tolerance for mixed columns.

## Future enhancements
Interactive filters, dataset profiles, upload history, more chart types.

## Modern features & performance notes (feature-candidate pass)
- **Column profiling** (`profile`): missing %, distinct, numeric min/max/mean
  or an explicit `mixed/text` guess — one pass per column `O(n)`.
- **Recipes**: each transform (trim, fill_missing) is recorded and replayable
  (`replay_plan`); **reversible** via preserved originals `O(1)` per column.
- **Bounded preview** (`preview`): 1..100 rows, refused beyond the bound.
- Deferred candidates (with reasons): statistical outlier detection (needs
  validated thresholds per domain); auto-type inference beyond the simple
  numeric check (silent type guessing can corrupt analysis).
