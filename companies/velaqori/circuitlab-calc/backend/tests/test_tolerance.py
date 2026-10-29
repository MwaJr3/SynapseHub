"""Phase-B tests: tolerance ranges, divider worst-case vs RSS labels."""
from __future__ import annotations

import pytest

from app.tolerance import ToleranceError, divider_tolerance, sensitivity_table, tolerance_range


def test_tolerance_range():
    r = tolerance_range(100.0, 5)
    assert r["min"] == 95.0 and r["max"] == 105.0
    with pytest.raises(ToleranceError):
        tolerance_range(100.0, 90)


def test_divider_worst_case_exact_bounds():
    result = divider_tolerance(1000, 1000, 10, vin=10.0)
    assert result["nominal_vout"] == 5.0
    assert result["worst_case"]["min"] < 5.0 < result["worst_case"]["max"]
    # R1 low & R2 high raises Vout; R1 high & R2 low lowers it.
    assert abs(result["worst_case"]["max"] - 10 * (1100) / (900 + 1100)) < 1e-6
    assert abs(result["worst_case"]["min"] - 10 * (900) / (1100 + 900)) < 1e-6
    assert "exact bounds" in result["worst_case"]["basis"]


def test_rss_labelled_estimate():
    result = divider_tolerance(1000, 1000, 10)
    assert result["rss_estimate"]["classification"] == "STATISTICAL ESTIMATE"
    assert "not a hard bound" in result["rss_estimate"]["assumptions"]
    with pytest.raises(ToleranceError):
        divider_tolerance(-1, 10, 5)


def test_sensitivity_table():
    def vout(r1: float, r2: float) -> float:
        return 10 * r2 / (r1 + r2)
    rows = sensitivity_table(vout, {"r1": 1000.0, "r2": 1000.0}, perturb_pct=1.0)
    assert len(rows) == 2
    by_input = {r["input"]: r for r in rows}
    assert by_input["r2"]["delta_up"] > 0            # raising R2 raises Vout
    assert by_input["r1"]["delta_up"] < 0            # raising R1 lowers Vout
