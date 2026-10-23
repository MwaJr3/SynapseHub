"""Calculator correctness and validation tests (real formulas, transparent steps)."""
import pytest

from app import circuit_math as cm


def test_ohm_law_solves_each_quantity(client):
    r = client.post("/api/calc/ohm", json={"known": "v", "current_a": 2, "resistance_ohm": 10})
    assert r.status_code == 200 and r.json()["value"] == 20 and r.json()["unit"] == "V"
    assert "V = I x R" in r.json()["steps"][0]

    r = client.post("/api/calc/ohm", json={"known": "i", "voltage_v": 10, "resistance_ohm": 5})
    assert r.json()["value"] == 2 and r.json()["unit"] == "A"

    r = client.post("/api/calc/ohm", json={"known": "r", "voltage_v": 10, "current_a": 2})
    assert r.json()["value"] == 5 and r.json()["unit"] == "ohm"


def test_power_formulas(client):
    assert client.post("/api/calc/power", json={"known": "vi", "voltage_v": 5, "current_a": 2}).json()["value"] == 10
    assert client.post("/api/calc/power", json={"known": "ir", "current_a": 3, "resistance_ohm": 4}).json()["value"] == 36
    assert client.post("/api/calc/power", json={"known": "vr", "voltage_v": 10, "resistance_ohm": 5}).json()["value"] == 20


def test_series_parallel_networks(client):
    s = client.post("/api/calc/network", json={"kind": "series", "resistors": [100, 220]}).json()
    assert s["value"] == 320
    p = client.post("/api/calc/network", json={"kind": "parallel", "resistors": [100, 100]}).json()
    assert p["value"] == pytest.approx(50.0)
    short = client.post("/api/calc/network", json={"kind": "parallel", "resistors": [0, 50]}).json()
    assert short["value"] == 0.0


def test_divider_states_assumption(client):
    r = client.post("/api/calc/divider", json={"supply_v": 5, "r1": 1000, "r2": 2000})
    assert r.status_code == 200
    assert r.json()["value"] == pytest.approx(5 * 2000 / 3000)
    assert "unloaded" in r.json()["assumption"].lower()


def test_two_mesh_solver(client):
    r = client.post("/api/calc/two-mesh", json={"v1": 10, "v2": 5, "r1": 100, "r2": 100, "r3": 100})
    assert r.status_code == 200
    currents = r.json()["value"]
    # Hand-solved: 200 I1 - 100 I2 = 10; -100 I1 + 200 I2 = -5 → I1 = 0.05 A, I2 = 0 A
    assert currents["I1"] == pytest.approx(0.05)
    assert currents["I2"] == pytest.approx(0.0)


def test_unit_conversion(client):
    r = client.post("/api/calc/convert", json={"value": 1, "kind": "R", "from_unit": "kohm", "to_unit": "ohm"})
    assert r.json()["value"] == 1000
    r = client.post("/api/calc/convert", json={"value": 5, "kind": "V", "from_unit": "V", "to_unit": "mV"})
    assert r.json()["value"] == 5000


def test_invalid_inputs_rejected_with_reason(client):
    short = client.post("/api/calc/ohm", json={"known": "i", "voltage_v": 10, "resistance_ohm": 0})
    assert short.status_code == 400 and "Short circuit" in short.json()["detail"]

    open_circuit = client.post("/api/calc/ohm", json={"known": "r", "voltage_v": 10, "current_a": 0})
    assert open_circuit.status_code == 400 and "Open circuit" in open_circuit.json()["detail"]

    negative = client.post("/api/calc/ohm", json={"known": "v", "current_a": -1, "resistance_ohm": 10})
    assert negative.status_code == 400

    singular = client.post("/api/calc/two-mesh", json={"v1": 1, "v2": 1, "r1": 0, "r2": 0, "r3": 0})
    assert singular.status_code == 400 and "Singular" in singular.json()["detail"]

    one_resistor = client.post("/api/calc/network", json={"kind": "series", "resistors": [10]})
    assert one_resistor.status_code == 422  # schema min_length=2


def test_calculators_do_not_require_auth_but_saved_do(client, authed_client):
    assert client.post("/api/calc/ohm", json={"known": "v", "current_a": 1, "resistance_ohm": 1}).status_code == 200
    assert client.get("/api/calculations").status_code == 401
    assert authed_client.get("/api/calculations").status_code == 200


def test_core_module_matches_api(authed_client):
    value, steps = cm.divider(5.0, 1000.0, 2000.0)
    api_value = authed_client.post("/api/calc/divider", json={"supply_v": 5, "r1": 1000, "r2": 2000}).json()["value"]
    assert api_value == value
    assert steps
