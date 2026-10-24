"""Units, validation, aggregation, costs, anomalies, scenarios.

Documented assumptions:
- Interval readings are kWh consumed in the interval ending at `ts`.
- Meter-total readings are cumulative kWh; consumption = difference between
  successive totals (single-pass, sorted by timestamp).
- Estimates (baselines/forecasts) are ALWAYS labelled separately from measurements.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


class EnergyError(ValueError):
    pass


@dataclass
class Usage:
    meter: str
    period: str
    kwh_measured: float
    cost_estimate: float | None
    tariff: str | None
    note: str


def parse_ts(raw: str) -> datetime:
    try:
        return datetime.fromisoformat(raw)
    except ValueError as exc:
        raise EnergyError(f"Timestamp {raw!r} must be ISO-8601.") from exc


def validate_reading(kwh: float, kind: str) -> float:
    try:
        value = float(kwh)
    except (TypeError, ValueError) as exc:
        raise EnergyError(f"Reading {kwh!r} is not a number.") from exc
    if value < 0:
        raise EnergyError("Readings must not be negative (kWh cannot be below zero).")
    if value > 1_000_000:
        raise EnergyError("Reading exceeds the plausible single-interval maximum (1,000,000 kWh).")
    if kind not in ("interval", "meter_total"):
        raise EnergyError("kind must be 'interval' or 'meter_total'.")
    return value


def aggregate_intervals(rows: list[tuple[str, float]], start: str | None, end: str | None) -> float:
    """Single pass over readings, filtered by ISO timestamps (O(n))."""
    total = 0.0
    for ts, kwh in rows:
        if start and ts < start:
            continue
        if end and ts > end:
            continue
        total += kwh
    return round(total, 3)


def meter_totals_to_intervals(rows: list[tuple[str, float]]) -> list[tuple[str, float]]:
    """Convert cumulative meter totals into interval use (sorted, single pass)."""
    ordered = sorted(rows, key=lambda r: r[0])
    out: list[tuple[str, float]] = []
    prev: float | None = None
    for ts, total in ordered:
        if prev is not None:
            delta = round(total - prev, 3)
            if delta < 0:
                raise EnergyError(f"Meter total decreased at {ts} (meter reset or data error) — flagged, not summed.")
            out.append((ts, delta))
        prev = total
    return out


def cost(kwh: float, rate: float, standing: float = 0.0, days: int = 1) -> float:
    if rate < 0 or standing < 0:
        raise EnergyError("Tariff rates must not be negative.")
    return round(kwh * rate + standing * days, 2)


def simple_anomalies(rows: list[tuple[str, float]], multiplier: float = 2.0) -> list[dict]:
    """Transparent rule: flag intervals above `multiplier` x the mean. A flag is a
    review prompt, never proof of a fault or intrusion."""
    if not rows:
        return []
    mean = sum(kwh for _, kwh in rows) / len(rows)
    threshold = mean * multiplier
    return [{"ts": ts, "kwh": round(kwh, 3), "threshold": round(threshold, 3),
             "rule": f"interval use > {multiplier:g}x mean"}
            for ts, kwh in rows if kwh > threshold]


def baseline_estimate(rows: list[tuple[str, float]], periods: int = 7) -> dict:
    """Naive baseline forecast: mean of the last `periods` intervals. Explicitly
    labelled an ESTIMATE with its assumption — never a measurement."""
    recent = [kwh for _, kwh in rows[-periods:]]
    if not recent:
        return {"estimate_kwh": 0.0, "basis": "no data", "label": "ESTIMATE"}
    return {"estimate_kwh": round(sum(recent) / len(recent), 3),
            "basis": f"mean of the last {len(recent)} interval(s)",
            "label": "ESTIMATE (naive baseline; not a measurement)"}


def scenario_saving(current_kwh: float, reduction_pct: float) -> dict:
    if not 0 <= reduction_pct <= 100:
        raise EnergyError("Reduction must be between 0 and 100 percent.")
    saved = round(current_kwh * reduction_pct / 100, 3)
    return {"current_kwh": current_kwh, "reduction_pct": reduction_pct,
            "projected_kwh": round(current_kwh - saved, 3), "assumption":
            f"linear {reduction_pct}% reduction applied to measured use; real outcomes vary"}
