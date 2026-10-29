# TaskDeck — personal task manager (CLI)

Engineering catalogue **Project 6** (Beginner–Intermediate).

## Overview
Create, edit, delete and complete tasks with priorities and deadlines; filter by
priority and status; persist between sessions. OOP is introduced where it helps
(`Task`, `TaskStore`), with storage and presentation separated.

## Design decisions
- **Malformed task data is reported, not silently dropped** — loading prints
  per-row warnings and keeps the valid rows (a test enforces this).
- Sort order: earliest deadline first (no deadline = last), then priority.
- Validation: non-empty titles ≤ 200 chars, priority/status enums, ISO dates.

## Usage
```bash
python3 -m app.cli add "Write report" --priority high --deadline 2026-11-01
python3 -m app.cli list --status todo
python3 -m app.cli done 1
```

## Testing
`python3 -m pytest tests/ -q` — validation, filters, sorting, CRUD, persistence
round-trip, malformed-row reporting, corrupt-file handling.

## Limitations
Single-user local tool. Recurring tasks, reminders and a GUI are roadmap items.

## Future enhancements
Recurring tasks, daily planner, productivity statistics, search, web interface.

## Modern features & performance notes (feature-candidate pass)
- **Recurring tasks** (`recur`): daily/weekly/monthly expansion, bounded to
  30 occurrences (`O(occurrences)`).
- **Dependency cycle detection** (`check-cycles`): DFS `O(V+E)` returning the
  cycle path — refuses scheduling loops explicitly.
- **Focus view** (`focus`): top-N by (priority, due) in `O(n log n)`.
- **Saved filters** (`save-filter`/`use-filter`): named criteria registry.
- Deferred candidates (with reasons): calendar sync (requires external
  services); automatic recurrence posting (a policy decision — templates
  remain explicit).
