"""Tests: units/validation, aggregation, tariffs, anomalies, estimates labelling."""
from __future__ import annotations

import pytest

from app.analysis import (EnergyError, aggregate_intervals, baseline_estimate,
                          meter_totals_to_intervals, scenario_saving, simple_anomalies, validate_reading)
from app.services import Store


def test_validation():
    assert validate_reading(1.5, "interval") == 1.5
    for bad in (-1, 2_000_000, "x"):
        with pytest.raises(EnergyError):
            validate_reading(bad, "interval")
    with pytest.raises(EnergyError):
        validate_reading(1, "guess")


def test_aggregation_single_pass_window():
    rows = [("2026-10-01T00:00:00", 1.0), ("2026-10-02T00:00:00", 2.0), ("2026-10-03T00:00:00", 3.0)]
    assert aggregate_intervals(rows, "2026-10-02T00:00:00", "2026-10-03T00:00:00") == 5.0
    assert aggregate_intervals(rows, None, None) == 6.0


def test_meter_totals_to_intervals_and_reset_detection():
    rows = [("2026-10-01", 100.0), ("2026-10-02", 102.5), ("2026-10-03", 106.0)]
    assert meter_totals_to_intervals(rows) == [("2026-10-02", 2.5), ("2026-10-03", 3.5)]
    with pytest.raises(EnergyError):
        meter_totals_to_intervals([("2026-10-01", 100.0), ("2026-10-02", 90.0)])


def test_cost_with_standing_charge():
    from app.analysis import cost
    assert cost(10, 2.5, 1.0, days=3) == 28.0


def test_anomaly_rule_is_transparent():
    rows = [(f"2026-10-0{i}T00:00:00", 1.0) for i in range(1, 8)]
    rows.append(("2026-10-08T00:00:00", 10.0))
    flags = simple_anomalies(rows, multiplier=2.0)
    assert len(flags) == 1 and flags[0]["kwh"] == 10.0 and "2x mean" in flags[0]["rule"]


def test_forecast_is_labelled_estimate():
    rows = [(f"2026-10-0{i}T00:00:00", float(i)) for i in range(1, 8)]
    f = baseline_estimate(rows, periods=3)
    assert f["label"].startswith("ESTIMATE")
    assert f["estimate_kwh"] == pytest.approx(6.0)


def test_scenario_states_assumptions():
    s = scenario_saving(100.0, 20.0)
    assert s["projected_kwh"] == 80.0 and "assumption" in s
    with pytest.raises(EnergyError):
        scenario_saving(100.0, 150.0)


def test_store_import_and_usage(tmp_path):
    store = Store(str(tmp_path / "w.db"))
    store.add_tariff("std", 2.0, 0.5, "2026-10-01T00:00:00")
    csv_text = "timestamp,kwh\n2026-10-01T00:00:00,1.0\n2026-10-01T00:00:00,1.0\n2026-10-02T00:00:00,2.0\nbad,xx\n"
    result = store.import_csv("home", csv_text)
    assert result["imported"] == 2 and result["duplicates_skipped"] == 1 and result["invalid"] == 1
    u = store.usage("home", "2026-10-01T00:00:00", "2026-10-02T00:00:00")
    assert u["kwh_measured"] == 3.0 and u["cost_estimate"] is not None
    assert "ESTIMATE" in u["note"] or "estimate" in u["note"].lower()
