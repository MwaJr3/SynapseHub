# StockMate — inventory management (FastAPI + SQLite)

Engineering catalogue **Project 25** (Advanced).

## Overview
A small-warehouse inventory system with an **immutable movement ledger**
(receive/issue/adjust/reverse), **role permissions enforced server-side**,
**negative-stock guards**, reorder alerts and honest reporting.

## Audit discipline (tested)
- Stock changes are ledger rows only — history is never edited. Corrections
  are **reversing rows** that reference the original movement; reversing a
  reversal is refused (create a new adjustment instead).
- **Negative stock is refused** with an explanatory error (no silent
  backdating of corrections).
- Roles are checked in the store layer: viewers read; clerks receive/issue;
  managers adjust/reverse/archive. Violations raise `PermissionError` → 403.

## Honest reporting
Valuation is `unit_cost × on_hand`, labelled a **book estimate** (no market
claim). The demand projection is labelled **ESTIMATE** with its assumptions
(rate continues, no seasonality, possibly short ledger window).

## DSA/performance note
Ledger append `O(1)`; ledger reads are indexed by item `O(k)`; valuation is a
single table scan.

## Run
```bash
uvicorn app.main:app --port 8022
```

## Testing
`python3 -m pytest tests/ -q` — movement math, negative guard, role denials,
reversal immutability, reorder alerts, estimate labels.

## Limitations
Demo data; no FIFO/lot costing; single location; flat-rate forecast only.

## Future improvements
Purchase orders, stock counts/cycle counting, CSV import with duplicate
warnings, per-role dashboards.
