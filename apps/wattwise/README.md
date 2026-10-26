# WattWise — home energy monitoring & analysis (CLI + SQLite)

Engineering catalogue **Project 23** (Expert, delivered at scope).

## Overview
Imports meter readings (interval or cumulative totals), computes measured use
over any period, estimates bills under **versioned configurable tariffs**
(including time-of-use windows), flags unusual consumption by transparent
rules, and shows saving scenarios with stated assumptions.

## Measurement vs estimate (enforced + tested)
- Readings are **measurements** (kWh, ISO timestamps, consistent units).
- Costs and forecasts are **estimates** — every output says which tariff/assumptions
  were used; the naive baseline forecast is labelled `ESTIMATE` explicitly.
- CSV import reports **duplicates and invalid rows; gaps are never interpolated**.
- Anomaly flags carry their rule (`interval use > 2x mean`) and are review
  prompts — never proof of a fault.
- Meter-total decrease (reset/data error) is **flagged, not summed**.

## DSA/performance note
Aggregation is single-pass over readings `O(n)`; meter totals convert to
intervals in one sorted pass `O(n log n)`. Readings are indexed by
`(meter, ts)`. No full-history recompute per query (window filters are
inclusive string comparisons on ISO timestamps — documented).

## Usage
```bash
python3 -m app.cli import-csv home readings.csv
python3 -m app.cli tariff "standard" 2.00 --standing 0.50 --from 2026-10-01T00:00:00
python3 -m app.cli usage home --from 2026-10-01T00:00:00 --to 2026-10-07T00:00:00
python3 -m app.cli anomalies home --multiplier 2.0
python3 -m app.cli scenario home 20
```

## Testing
`python3 -m pytest tests/ -q` — validation bounds, window aggregation, meter
reset detection, tariff costing, anomaly transparency, estimate labelling,
CSV import quality counts.

## Limitations
CSV-only ingestion; no real-time hardware; forecasts are deliberately naive
(documented) baselines.

## Future improvements
Device-level breakdown where source data supports it, tariff comparison,
incremental period rollups.
