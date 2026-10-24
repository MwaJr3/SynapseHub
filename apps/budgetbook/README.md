# BudgetBook — personal expense tracker (CLI)

Engineering catalogue **Project 2** (Beginner 1/5).

## Overview
Record income and expenses by category, compute expenditure and balance for any
period, and see the largest spending categories and monthly summaries. All money
uses **`decimal.Decimal`** — never binary floats.

## Documented policy decisions (assumptions made visible)
- **Amounts are always positive**; the `kind` field (`income`/`expense`/`refund`)
  expresses direction. Zero and negative amounts are rejected at entry.
- **A refund is not income** — it reduces expenditure (and is reported
  separately so gross vs net spending stays visible).
- **Corrections** (`edit`) require a reason and append an audit note; history is
  never silently rewritten.
- **Transaction totals ≠ account balance** — `summary` reports income,
  gross expenses, refunds, net expenditure and balance as distinct figures.

## Architecture
`cli.py` → `core.Ledger` → `models` / `config`; `storage.py` serialises Decimals
as strings for exact round-trips.

## Usage
```bash
python3 -m app.cli add expense Groceries "Shop" 320.50 2026-10-03
python3 -m app.cli add refund Groceries "Returned item" 20.50 2026-10-06
python3 -m app.cli summary --from 2026-10-01 --to 2026-10-31
python3 -m app.cli categories --from 2026-10-01 --to 2026-10-31
```

## Testing
`python3 -m pytest tests/ -q` — exact-decimal arithmetic, amount/date validation,
refund semantics, inclusive period boundaries, top categories net of refunds,
correction audit trail, storage round-trip.

## Limitations
Local single-user tool (privacy stays with the user: no network, no sharing).
No budgets, recurring transactions or charts yet — roadmap items.

## Future enhancements
Budgets with honest variance reporting, recurring transactions, CSV import/export,
charts with accessible text summaries, multiple accounts.

## Modern features & performance notes (feature-candidate pass)
- **CSV import with validation + duplicate warnings** (`import-csv`): invalid
  rows carry reasons; duplicates are warnings (caller decides) — nothing is
  dropped silently. `O(n)` expected via row hashing.
- **Recurring templates** (`add-template`, `materialize`): daily/weekly/monthly
  intervals; materialized transactions are flagged **needs-review** (human
  confirmation before they count), bounded to 365 occurrences.
- Deferred candidates (with reasons): bank CSV dialect auto-detection (needs
  real bank samples; guessing would corrupt rows); budget rollover automation
  (policy decision — needs explicit user setup).
