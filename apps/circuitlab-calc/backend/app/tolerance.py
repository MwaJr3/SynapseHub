"""Tolerance sensitivity analysis (worst-case and statistical estimates).

Honesty: worst-case bounds are exact for independent component tolerances;
the RSS figure is a STATISTICAL ESTIMATE assuming independent normal
distributions — labelled as such in every result.
"""
from __future__ import annotations


class ToleranceError(ValueError):
    pass


def tolerance_range(nominal: float, tol_pct: float) -> dict:
    if tol_pct < 0 or tol_pct > 50:
        raise ToleranceError("tolerance percent must be within 0..50")
    delta = nominal * tol_pct / 100
    return {"nominal": nominal, "tol_pct": tol_pct,
            "min": round(nominal - delta, 6), "max": round(nominal + delta, 6)}


def divider_tolerance(r1: float, r2: float, tol_pct: float, vin: float = 1.0) -> dict:
    """Vout = Vin * R2/(R1+R2) under resistor tolerances.

    Worst-case: R1 low & R2 high (Vmax), R1 high & R2 low (Vmin) — exact
    bounds for independent resistors.
    RSS: statistical estimate for the combined variation (independence +
    normality assumed) — ESTIMATE, not a bound."""
    if r1 <= 0 or r2 <= 0:
        raise ToleranceError("resistances must be positive")
    if not 0 <= tol_pct <= 50:
        raise ToleranceError("tolerance percent must be within 0..50")
    d = tol_pct / 100
    nominal = vin * r2 / (r1 + r2)
    vmax = vin * (r2 * (1 + d)) / (r1 * (1 - d) + r2 * (1 + d))
    vmin = vin * (r2 * (1 - d)) / (r1 * (1 + d) + r2 * (1 - d))
    # Sensitivity coefficients: dV/V ≈ (∂V/∂R2)(R2/V)d - (∂V/∂R1)(R1/V)d
    s2 = r1 / (r1 + r2)      # ∂V/∂R2 * R2/V
    s1 = r2 / (r1 + r2)      # ∂V/∂R1 * R1/V
    rss = nominal * (tol_pct / 100) * (s1 + s2)   # combined independent variation
    return {"nominal_vout": round(nominal, 6),
            "worst_case": {"min": round(vmin, 6), "max": round(vmax, 6),
                           "basis": "exact bounds for independent resistor tolerances"},
            "rss_estimate": {"plus_minus": round(rss, 6),
                             "classification": "STATISTICAL ESTIMATE",
                             "assumptions": "independent tolerances, normal distributions; not a hard bound"},
            "inputs": {"r1": r1, "r2": r2, "tol_pct": tol_pct, "vin": vin}}


def sensitivity_table(func, nominal_inputs: dict[str, float], perturb_pct: float = 1.0) -> list[dict]:
    """±perturb one input at a time; report output deltas. O(k) evaluations."""
    if not 0 < perturb_pct <= 20:
        raise ToleranceError("perturb_pct must be within (0, 20]")
    base = func(**nominal_inputs)
    rows = []
    for key, value in nominal_inputs.items():
        up = dict(nominal_inputs); up[key] = value * (1 + perturb_pct / 100)
        down = dict(nominal_inputs); down[key] = value * (1 - perturb_pct / 100)
        rows.append({"input": key, "perturb_pct": perturb_pct,
                     "output_up": round(func(**up), 6), "output_down": round(func(**down), 6),
                     "delta_up": round(func(**up) - base, 6), "delta_down": round(func(**down) - base, 6)})
    return rows
