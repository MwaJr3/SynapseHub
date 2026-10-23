"""Independently checked tests for the CircuitLab calculation core."""
import math
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "python-reference"))

from circuit_math import (  # noqa: E402
    CircuitError,
    convert,
    divider,
    ohm_current,
    ohm_resistance,
    ohm_voltage,
    parallel,
    power_ir,
    power_vi,
    power_vr,
    series,
    two_mesh,
)


def test_ohm_basics():
    assert ohm_voltage(2, 10)[0] == pytest.approx(20.0)
    assert ohm_current(12, 4)[0] == pytest.approx(3.0)
    assert ohm_resistance(9, 3)[0] == pytest.approx(3.0)


def test_ohm_led_example():
    # 20 mA through 220 ohm -> 4.4 V (matches seeded demo + browser)
    assert ohm_voltage(0.02, 220)[0] == pytest.approx(4.4)


def test_ohm_rejects_undefined():
    with pytest.raises(CircuitError):
        ohm_current(5, 0)  # short
    with pytest.raises(CircuitError):
        ohm_resistance(5, 0)  # open
    with pytest.raises(CircuitError):
        ohm_voltage(-1, 10)  # negative magnitude


def test_power_identities():
    # P = VI = I^2 R = V^2/R must agree: V=12, R=6 -> I=2, P=24
    assert power_vi(12, 2)[0] == pytest.approx(24.0)
    assert power_ir(2, 6)[0] == pytest.approx(24.0)
    assert power_vr(12, 6)[0] == pytest.approx(24.0)
    with pytest.raises(CircuitError):
        power_vr(5, 0)


def test_series_parallel():
    assert series(100, 150, 220)[0] == pytest.approx(470.0)
    assert parallel(100, 150)[0] == pytest.approx(60.0)
    assert parallel(100, 0)[0] == 0.0  # short detected, stated
    with pytest.raises(CircuitError):
        series(100)  # need >= 2
    with pytest.raises(CircuitError):
        parallel(100, -5)


def test_divider():
    assert divider(5, 10_000, 10_000)[0] == pytest.approx(2.5)
    assert divider(12, 2000, 1000)[0] == pytest.approx(4.0)
    with pytest.raises(CircuitError):
        divider(5, 0, 0)


def test_two_mesh_known_solution():
    # V1=10, V2=5, R1=R2=R3=10 -> I1=0.5, I2=0.0 (hand-verified:
    # 20(0.5)-10(0)=10 and -10(0.5)+20(0)=-5)
    sol, steps = two_mesh(10, 5, 10, 10, 10)
    assert sol["I1"] == pytest.approx(0.5)
    assert sol["I2"] == pytest.approx(0.0)
    assert sol["I_R3"] == pytest.approx(0.5)
    assert any("det" in s for s in steps)


def test_two_mesh_singular_rejected():
    with pytest.raises(CircuitError):
        two_mesh(5, 5, 0, 0, 0)  # degenerate: det = 0


def test_kirchhoff_residual():
    # Random-ish case: verify equations hold for the returned solution.
    v1, v2, r1, r2, r3 = 9, 3, 100, 220, 47
    sol, _ = two_mesh(v1, v2, r1, r2, r3)
    assert (r1 + r3) * sol["I1"] - r3 * sol["I2"] == pytest.approx(v1)
    assert -r3 * sol["I1"] + (r2 + r3) * sol["I2"] == pytest.approx(-v2)


def test_units_round_trip():
    assert convert(2500, "V", "mV", "V") == pytest.approx(2.5)
    assert convert(2.5, "V", "V", "mV") == pytest.approx(2500.0)
    assert convert(4.7, "R", "kohm", "ohm") == pytest.approx(4700.0)
    assert convert(50, "F", "Hz", "kHz") == pytest.approx(0.05)
    with pytest.raises(CircuitError):
        convert(1, "V", "parsecs", "V")
    with pytest.raises(CircuitError):
        convert(math.nan, "V", "V", "mV")
