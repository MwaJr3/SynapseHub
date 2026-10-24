"""Descriptive statistics and simple trend estimates (documented formulas)."""
from __future__ import annotations

import math
from dataclasses import dataclass

from .ingest import Dataset


@dataclass
class ColumnStats:
    column: str
    count: int
    missing: int
    mean: float
    median: float
    std: float
    min: float
    max: float
    slope_per_row: float      # least-squares slope over row order (trend estimate)


def _median(values: list[float]) -> float:
    s = sorted(values)
    n = len(s)
    mid = n // 2
    return s[mid] if n % 2 else (s[mid - 1] + s[mid]) / 2


def column_stats(ds: Dataset, col: str) -> ColumnStats:
    values = []
    missing = 0
    for r in ds.rows:
        if r[col] == "":
            missing += 1
            continue
        try:
            values.append(float(r[col]))
        except ValueError:
            missing += 1
    n = len(values)
    if n == 0:
        raise ValueError(f"Column {col!r} has no numeric values.")
    mean = sum(values) / n
    std = math.sqrt(sum((v - mean) ** 2 for v in values) / n) if n > 1 else 0.0
    # least-squares slope against row index (trend, not causation)
    if n > 1:
        xs = list(range(n))
        xbar = (n - 1) / 2
        denom = sum((x - xbar) ** 2 for x in xs)
        slope = sum((x - xbar) * (v - mean) for x, v in zip(xs, values)) / denom if denom else 0.0
    else:
        slope = 0.0
    return ColumnStats(col, n, missing, round(mean, 4), round(_median(values), 4),
                       round(std, 4), min(values), max(values), round(slope, 6))


def group_totals(ds: Dataset, group_col: str, value_col: str) -> list[tuple[str, float, int]]:
    totals: dict[str, list[float]] = {}
    for r in ds.rows:
        if r[value_col] == "" or r.get(group_col, "") == "":
            continue
        try:
            totals.setdefault(r[group_col], []).append(float(r[value_col]))
        except ValueError:
            continue
    return sorted(((k, round(sum(v), 2), len(v)) for k, v in totals.items()), key=lambda kv: -kv[1])
