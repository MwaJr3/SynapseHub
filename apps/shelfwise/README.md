# ShelfWise — library management system (CLI + SQLite)

Engineering catalogue **Project 9** (Intermediate).

## Overview
Tracks books, **physical copies** (a title is not a copy), borrowers, loans and
overdue items, with search and inventory reports. Relational persistence uses
**SQLite** (the catalogue's "then migrate to SQLite" stage is implemented
directly — documented as the target design).

## Business rules (tested)
- A copy can only be **borrowed by one person at a time** (open-loan invariant).
- Loans have borrow/due dates (default 14 days, configurable); overdue =
  `due_on < today` with an injectable "today" for deterministic tests.
- Returns record `was_overdue`; inventory counts available vs total copies.
- Duplicate copy labels are rejected; unknown IDs fail clearly.

## Usage
```bash
python3 -m app.cli add-book "Things Fall Apart" "Chinua Achebe"
python3 -m app.cli add-copy 1 A-001
python3 -m app.cli register "Ada" --contact ada@example.test
python3 -m app.cli borrow 1 1
python3 -m app.cli overdue
python3 -m app.cli inventory
```

## Testing
`python3 -m pytest tests/ -q` — book/copy distinction, borrow/return, double-borrow
prevention, overdue boundary dates, unknown IDs, search, duplicate labels,
validation.

## Limitations
No barcode integration, reservations or notifications yet (roadmap). Contact
details are free-text demo values; no personal data leaves the machine.

## Future enhancements
Barcode support, reservations, notifications, administrative reporting, roles.
