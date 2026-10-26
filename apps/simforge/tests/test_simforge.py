"""Tests: model validation, reference cases, bounds, reproducible exports."""
from __future__ import annotations

import json
import math

import pytest

from app.models import ModelError, RCDischarge, ResistorNetwork, SpringMass
from app.report import export
from app.solvers import SolverError, sensitivity, sweep


def test_rc_reference_case():
    # tau = 2*3 = 6 s; v(6) = 10/e
    m = RCDischarge(10.0, 2.0, 3.0)
    m.validate()
    assert m.tau_seconds == 6.0
    assert m.voltage_at(6.0) == pytest.approx(10.0 / math.e)


def test_rc_validation():
    for bad in (RCDischarge(-1, 1, 1), RCDischarge(1, 0, 1), RCDischarge(1, 1, -1)):
        with pytest.raises(ModelError):
            bad.validate()
    with pytest.raises(ModelError):
        RCDischarge(1, 1, 1).voltage_at(-1)


def test_spring_reference_case():
    m = SpringMass(4.0, 16.0, 1.0)   # omega = 2, period = pi
    m.validate()
    assert m.omega_rad_s == pytest.approx(2.0)
    assert m.period_seconds == pytest.approx(math.pi)


def test_resistor_networks():
    net = ResistorNetwork((10.0, 10.0, 10.0))
    assert net.series() == 30.0
    assert net.parallel() == pytest.approx(10.0 / 3)
    with pytest.raises(ModelError):
        ResistorNetwork((0.0,)).validate()
    with pytest.raises(ModelError):
        ResistorNetwork(tuple(range(70))).validate()


def test_sweep_bounded_and_validated():
    rows = sweep(SpringMass, "mass_kg", [1.0, 2.0, 3.0], stiffness_n_per_m=8.0, amplitude_m=1.0)
    assert len(rows) == 3
    with pytest.raises(SolverError):
        sweep(SpringMass, "mass_kg", range(2000), stiffness_n_per_m=8.0, amplitude_m=1.0)
    with pytest.raises(ModelError):
        sweep(SpringMass, "mass_kg", [-1.0], stiffness_n_per_m=8.0, amplitude_m=1.0)


def test_sensitivity_estimate():
    s = sensitivity(SpringMass, "mass_kg", 4.0, 10.0, stiffness_n_per_m=16.0, amplitude_m=1.0)
    assert s["param"] == "mass_kg" and "linear approximation" in s["note"]


def test_export_includes_assumptions_and_versions(tmp_path):
    path = tmp_path / "report.json"
    export(path, "RC", {"v0_volts": 10}, ["ideal components"], {"tau_seconds": 6.0}, ["tau = R*C"])
    payload = json.loads(path.read_text())
    assert payload["assumptions"] and payload["environment"]["python"]
    assert "not real-world measurements" in payload["disclaimer"]
