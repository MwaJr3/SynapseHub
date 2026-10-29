"""Numerical utilities with explicit bounds and stability checks."""
from __future__ import annotations

import numpy as np


class SolverError(ValueError):
    pass


def sweep(model_factory, param_name: str, values, **fixed):
    """Parameter sweep with a bounded number of points (max 1000)."""
    values = list(values)
    if len(values) > 1000:
        raise SolverError("Sweep limited to 1000 points (bounded computation).")
    rows = []
    for v in values:
        model = model_factory(**{**fixed, param_name: v})
        model.validate()
        rows.append((v, model))
    return rows


def sensitivity(model_factory, param_name: str, nominal: float, delta_pct: float = 10.0, **fixed):
    """Central sensitivity estimate: (y(+d) - y(-d)) / (2d) for a chosen observable."""
    d = nominal * delta_pct / 100.0
    if d == 0:
        raise SolverError("Nominal value must be non-zero for sensitivity analysis.")
    low = model_factory(**{**fixed, param_name: nominal - d})
    high = model_factory(**{**fixed, param_name: nominal + d})
    low.validate(); high.validate()
    observable = lambda m: getattr(m, "tau_seconds", None) or getattr(m, "period_seconds")
    y_low, y_high = observable(low), observable(high)
    return {"param": param_name, "nominal": nominal, "delta_pct": delta_pct,
            "derivative_estimate": (y_high - y_low) / (2 * d),
            "note": "central difference estimate; linear approximation around the nominal point"}


def convergence_check(series, tolerance: float = 1e-6, max_points: int = 100) -> dict:
    """Detect whether an iterative sequence has converged (bounded iterations)."""
    series = list(series[:max_points])
    if len(series) < 2:
        return {"converged": False, "iterations": len(series), "reason": "not enough points"}
    deltas = [abs(series[i] - series[i - 1]) for i in range(1, len(series))]
    return {"converged": max(deltas) < tolerance, "iterations": len(series),
            "max_delta": max(deltas), "reason": "max step below tolerance" if max(deltas) < tolerance
            else "step size still above tolerance — increase iterations or investigate instability"}
