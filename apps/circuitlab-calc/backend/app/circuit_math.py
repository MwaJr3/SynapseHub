# CircuitLab Calc calculation core — vendored verbatim from
# projects/mysul/mwangala/python-reference/circuit_math.py (Mwangala Chisuse's
# tested Python reference for the portfolio demo). Formulas and validation
# behaviour are unchanged.
"""CircuitLab Calc — tested Python calculation core.

Pure functions (no web dependencies) mirroring the browser demo's equations and
validation rules. Import these from a FastAPI service in production.

All quantities are floats in base units (V, A, ohm, W, Hz) unless stated.
Each solver returns (value, steps, formula, assumptions) so callers can show
transparent working. Approximations are never presented as exact.
"""

from __future__ import annotations

import math


class CircuitError(ValueError):
    """Raised when inputs are invalid or the circuit is unsolvable."""


def _need(*vals: float | None) -> None:
    if any(v is None or (isinstance(v, float) and math.isnan(v)) for v in vals):
        raise CircuitError("Missing input: all required quantities must be numbers.")


def _nonneg(*vals: float, what: str = "Magnitudes") -> None:
    if any(v < 0 for v in vals):
        raise CircuitError(f"{what} must be non-negative for these DC quantities.")


# ---------------- Ohm's law ----------------

def ohm_voltage(current_a: float, resistance_ohm: float) -> tuple[float, list[str]]:
    _need(current_a, resistance_ohm)
    _nonneg(current_a, resistance_ohm)
    v = current_a * resistance_ohm
    return v, [f"V = I x R = {current_a} x {resistance_ohm} = {v} V"]


def ohm_current(voltage_v: float, resistance_ohm: float) -> tuple[float, list[str]]:
    _need(voltage_v, resistance_ohm)
    _nonneg(voltage_v, resistance_ohm)
    if resistance_ohm == 0:
        raise CircuitError("Short circuit: R = 0 with V != 0 gives undefined current.")
    i = voltage_v / resistance_ohm
    return i, [f"I = V / R = {voltage_v} / {resistance_ohm} = {i} A"]


def ohm_resistance(voltage_v: float, current_a: float) -> tuple[float, list[str]]:
    _need(voltage_v, current_a)
    _nonneg(voltage_v, current_a)
    if current_a == 0:
        raise CircuitError("Open circuit: I = 0 with V != 0 gives undefined resistance.")
    r = voltage_v / current_a
    return r, [f"R = V / I = {voltage_v} / {current_a} = {r} ohm"]


# ---------------- Power ----------------

def power_vi(voltage_v: float, current_a: float) -> tuple[float, list[str]]:
    _need(voltage_v, current_a)
    _nonneg(voltage_v, current_a)
    p = voltage_v * current_a
    return p, [f"P = V x I = {voltage_v} x {current_a} = {p} W"]


def power_ir(current_a: float, resistance_ohm: float) -> tuple[float, list[str]]:
    _need(current_a, resistance_ohm)
    _nonneg(current_a, resistance_ohm)
    p = current_a**2 * resistance_ohm
    return p, [f"P = I^2 x R = {current_a}^2 x {resistance_ohm} = {p} W"]


def power_vr(voltage_v: float, resistance_ohm: float) -> tuple[float, list[str]]:
    _need(voltage_v, resistance_ohm)
    _nonneg(voltage_v, resistance_ohm)
    if resistance_ohm == 0:
        raise CircuitError("Short circuit: R = 0 makes power undefined.")
    p = voltage_v**2 / resistance_ohm
    return p, [f"P = V^2 / R = {voltage_v}^2 / {resistance_ohm} = {p} W"]


# ---------------- Resistor networks ----------------

def series(*resistors: float) -> tuple[float, list[str]]:
    if len(resistors) < 2:
        raise CircuitError("Series needs at least two resistor values.")
    _need(*resistors)
    _nonneg(*resistors)
    total = sum(resistors)
    return total, [f"R = {' + '.join(map(str, resistors))} = {total} ohm"]


def parallel(*resistors: float) -> tuple[float, list[str]]:
    if len(resistors) < 2:
        raise CircuitError("Parallel needs at least two resistor values.")
    _need(*resistors)
    _nonneg(*resistors)
    if any(r == 0 for r in resistors):
        return 0.0, ["A 0 ohm branch is a short circuit: total = 0 ohm."]
    inv = sum(1.0 / r for r in resistors)
    total = 1.0 / inv
    return total, [f"1/R = {' + '.join(f'1/{r}' for r in resistors)} = {inv}", f"R = {total} ohm"]


# ---------------- Voltage divider (unloaded) ----------------

def divider(supply_v: float, r1: float, r2: float) -> tuple[float, list[str]]:
    _need(supply_v, r1, r2)
    _nonneg(supply_v, r1, r2)
    if r1 + r2 == 0:
        raise CircuitError("R1 + R2 = 0 shorts the supply.")
    out = supply_v * r2 / (r1 + r2)
    return out, [
        f"Vout = Vs x R2/(R1+R2) = {supply_v} x {r2}/({r1}+{r2}) = {out} V",
        "Assumption: unloaded divider (no load current).",
    ]


# ---------------- Kirchhoff 2-mesh solver ----------------
# Convention: both meshes clockwise sharing R3; V1 + to - clockwise in mesh 1.
#   (R1+R3)I1 - R3 I2 = V1
#   -R3 I1 + (R2+R3)I2 = -V2

def two_mesh(v1: float, v2: float, r1: float, r2: float, r3: float) -> tuple[dict, list[str]]:
    _need(v1, v2, r1, r2, r3)
    _nonneg(r1, r2, r3, what="Resistances")
    a, b, c, d = r1 + r3, -r3, -r3, r2 + r3
    e1, e2 = v1, -v2
    det = a * d - b * c
    if abs(det) < 1e-12:
        raise CircuitError("Singular system (determinant ~ 0): invalid or underdetermined circuit.")
    i1 = (e1 * d - b * e2) / det
    i2 = (a * e2 - e1 * c) / det
    steps = [
        f"({a})I1 + ({b})I2 = {e1}",
        f"({c})I1 + ({d})I2 = {e2}",
        f"det = {det}",
        f"I1 = {i1} A, I2 = {i2} A, I(R3) = {i1 - i2} A",
        "Negative current flows opposite to the assumed clockwise direction.",
    ]
    return {"I1": i1, "I2": i2, "I_R3": i1 - i2}, steps


# ---------------- Unit conversion ----------------

_PREFIX = {
    "V": {"V": 1.0, "mV": 1e-3, "kV": 1e3},
    "A": {"A": 1.0, "mA": 1e-3, "uA": 1e-6},
    "R": {"ohm": 1.0, "kohm": 1e3, "Mohm": 1e6},
    "P": {"W": 1.0, "mW": 1e-3, "kW": 1e3},
    "F": {"Hz": 1.0, "kHz": 1e3, "MHz": 1e6},
}


def convert(value: float, kind: str, from_unit: str, to_unit: str) -> float:
    _need(value)
    try:
        table = _PREFIX[kind]
        return value * table[from_unit] / table[to_unit]
    except KeyError as exc:
        raise CircuitError(f"Unknown unit or quantity: {exc}") from exc
