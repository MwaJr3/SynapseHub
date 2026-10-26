"""Phase-B feature tests: weights, what-if, boundary validation."""
from __future__ import annotations

import pytest

from app.features import FeatureError, apply_weights, validate_boundaries, what_if


def test_apply_weights():
    result = apply_weights({"math": 80, "eng": 60}, {"math": 0.5, "eng": 0.5})
    assert result["weighted_score"] == 70.0
    assert result["detail"]["math"]["contribution"] == 40.0


def test_apply_weights_validation():
    with pytest.raises(FeatureError):
        apply_weights({"a": 50}, {"a": 0.5})          # sums to 0.5
    with pytest.raises(FeatureError):
        apply_weights({}, {"a": 1.0})


def test_what_if_plan_estimate():
    r = what_if(80.0, 0.5, 75.0, 0.5)
    assert r["needed_average_on_remaining"] == 70.0
    assert r["classification"] == "PLAN ESTIMATE" and r["feasible"] is True
    r2 = what_if(40.0, 0.5, 90.0, 0.5)
    assert r2["feasible"] is False                       # needs 140 — refused as infeasible
    assert "Not a guarantee" in r2["assumptions"]


def test_what_if_input_validation():
    with pytest.raises(FeatureError):
        what_if(80, 0.5, 75, 0.6)                        # weights don't sum to 1
    with pytest.raises(FeatureError):
        what_if(80, 1.0, 75, 0.0)


def test_boundary_validation():
    assert validate_boundaries({"A": 70, "B": 60, "C": 50}) == []
    problems = validate_boundaries({"A": 60, "B": 70})
    assert any("strictly decrease" in p for p in problems)
    assert any("outside" in p for p in validate_boundaries({"A": 150}))
