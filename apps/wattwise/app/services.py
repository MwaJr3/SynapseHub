"""Import, tariffs (versioned), alerts, reports. Single-pass aggregation."""
from __future__ import annotations

from datetime import datetime, timezone

from .analysis import (EnergyError, aggregate_intervals, baseline_estimate, cost,
                       meter_totals_to_intervals, parse_ts, scenario_saving,
                       simple_anomalies, validate_reading)
from .db import connect


class Store:
    def __init__(self, db_path: str) -> None:
        self.conn = connect(db_path)

    def add_reading(self, meter: str, ts: str, kwh: float, kind: str = "interval") -> None:
        parse_ts(ts)
        value = validate_reading(kwh, kind)
        try:
            self.conn.execute("INSERT INTO readings(meter, ts, kwh, kind) VALUES (?,?,?,?)",
                              (meter.strip(), ts, value, kind))
        except Exception as exc:
            raise EnergyError(f"Duplicate or invalid reading for {meter} at {ts}.") from exc
        self.conn.commit()

    def import_csv(self, meter: str, csv_text: str, kind: str = "interval") -> dict:
        """CSV import with data-quality checks: gaps and duplicates are reported."""
        import csv, io
        seen: set[str] = set()
        imported = duplicates = invalid = 0
        problems: list[str] = []
        for row in csv.DictReader(io.StringIO(csv_text)):
            ts = (row.get("timestamp") or row.get("ts") or "").strip()
            raw = (row.get("kwh") or "").strip()
            if not ts or not raw:
                invalid += 1
                problems.append(f"row missing timestamp/kwh: {row}")
                continue
            if (ts, kind) in seen:
                duplicates += 1
                continue
            try:
                self.add_reading(meter, ts, raw, kind)
                seen.add((ts, kind))
                imported += 1
            except EnergyError as exc:
                invalid += 1
                problems.append(str(exc))
        return {"imported": imported, "duplicates_skipped": duplicates, "invalid": invalid, "problems": problems[:10],
                "note": "Gaps in intervals are NOT interpolated; missing data is reported as missing."}

    def add_tariff(self, name: str, rate: float, standing: float, valid_from: str,
                   valid_to: str | None = None, window_start: int = 0, window_end: int = 24) -> int:
        parse_ts(valid_from)
        if not 0 <= window_start < window_end <= 24:
            raise EnergyError("Time-of-use window must satisfy 0 <= start < end <= 24.")
        cur = self.conn.execute(
            "INSERT INTO tariffs(name, rate_per_kwh, standing_charge, valid_from, valid_to, window_start, window_end) "
            "VALUES (?,?,?,?,?,?,?)", (name, float(rate), float(standing), valid_from, valid_to, window_start, window_end))
        self.conn.commit()
        return cur.lastrowid

    def usage(self, meter: str, start: str | None = None, end: str | None = None) -> dict:
        rows = [(r["ts"], r["kwh"]) for r in self.conn.execute(
            "SELECT ts, kwh FROM readings WHERE meter=? AND kind='interval' ORDER BY ts", (meter,)).fetchall()]
        kwh = aggregate_intervals(rows, start, end)
        tariff = self.conn.execute("SELECT * FROM tariffs WHERE valid_from<=? ORDER BY valid_from DESC LIMIT 1",
                                   (start or datetime.now(timezone.utc).isoformat(),)).fetchone()
        t = dict(tariff) if tariff else None
        days = 1
        if start and end:
            days = max(1, (datetime.fromisoformat(end) - datetime.fromisoformat(start)).days + 1)
        cost_est = cost(kwh, t["rate_per_kwh"], t["standing_charge"], days) if t else None
        return {"meter": meter, "kwh_measured": kwh, "cost_estimate": cost_est,
                "tariff": t["name"] if t else None,
                "note": ("Cost is an ESTIMATE using tariff " + (t["name"] if t else "none configured") +
                         " (rates and standing charges are configurable).")}

    def anomalies(self, meter: str, multiplier: float = 2.0) -> list[dict]:
        rows = [(r["ts"], r["kwh"]) for r in self.conn.execute(
            "SELECT ts, kwh FROM readings WHERE meter=? AND kind='interval' ORDER BY ts", (meter,)).fetchall()]
        found = simple_anomalies(rows, multiplier)
        for item in found:
            self.conn.execute("INSERT OR IGNORE INTO alerts(meter, ts, message, rule) VALUES (?,?,?,?)",
                              (meter, item["ts"], f"interval use {item['kwh']} kWh exceeds {item['threshold']}",
                               item["rule"]))
        self.conn.commit()
        return found

    def forecast(self, meter: str, periods: int = 7) -> dict:
        rows = [(r["ts"], r["kwh"]) for r in self.conn.execute(
            "SELECT ts, kwh FROM readings WHERE meter=? AND kind='interval' ORDER BY ts", (meter,)).fetchall()]
        return baseline_estimate(rows, periods)

    def scenario(self, meter: str, reduction_pct: float) -> dict:
        rows = self.usage(meter)
        return scenario_saving(rows["kwh_measured"], reduction_pct)
