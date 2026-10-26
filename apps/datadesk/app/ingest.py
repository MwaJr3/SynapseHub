"""Ingestion and validation: source files are preserved, never modified."""
from __future__ import annotations

import csv
from dataclasses import dataclass, field
from pathlib import Path


class IngestError(ValueError):
    pass


@dataclass
class Dataset:
    name: str
    columns: list[str]
    rows: list[dict] = field(default_factory=list)
    numeric_columns: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def load_csv(path: str | Path, required: list[str] | None = None) -> Dataset:
    p = Path(path)
    if not p.is_file():
        raise IngestError(f"{p} is not a readable file.")
    with p.open(newline="") as fh:
        reader = csv.DictReader(fh)
        if not reader.fieldnames:
            raise IngestError("CSV has no header row.")
        columns = [c.strip() for c in reader.fieldnames]
        if required:
            missing = [c for c in required if c not in columns]
            if missing:
                raise IngestError(f"Missing required column(s): {', '.join(missing)}.")
        rows = []
        warnings = []
        for i, raw in enumerate(reader, start=2):
            row = {c: (raw.get(c) or "").strip() for c in reader.fieldnames}
            if any(row.values()):
                rows.append(row)
            else:
                warnings.append(f"row {i}: empty row skipped")
        return Dataset(p.name, columns, rows, [], warnings)


def coerce_numeric(ds: Dataset) -> Dataset:
    """Explicit cleaning decisions: a column is numeric only if EVERY non-empty
    value parses; non-numeric values in a mostly-numeric column are dropped from
    numeric analysis and counted in warnings (never silently zero-filled)."""
    for col in ds.columns:
        values = [r[col] for r in ds.rows if r[col] != ""]
        missing = len(ds.rows) - len(values)
        if not values:
            continue
        parsed: list[float] = []
        bad = 0
        for v in values:
            try:
                parsed.append(float(v))
            except ValueError:
                bad += 1
        if parsed and bad == 0:
            ds.numeric_columns.append(col)
            if missing:
                ds.warnings.append(
                    f"column {col!r}: {missing} missing value(s) excluded from numeric analysis "
                    f"({len(parsed)} usable) — values were dropped, not zero-filled")
        elif parsed and bad <= len(values) * 0.3:
            ds.numeric_columns.append(col)
            ds.warnings.append(
                f"column {col!r}: {bad} non-numeric and {missing} missing value(s) excluded from "
                f"numeric analysis ({len(parsed)} usable) — values were dropped, not zero-filled")
    return ds
