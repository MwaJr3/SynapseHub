from app.diffing import diff_runs
from app.scanners.base import normalize
from app.scanners.simulated import SimulatedScanner


def test_normalize_drops_invalid_rows_and_bounds_values():
    rows = [{"port": "not-a-port", "service": "ssh"},
            {"port": 99999, "service": "ssh"},
            {"port": 22, "service": "SSH ", "version": "x" * 200},
            {"port": 80}]
    out = normalize(rows, "t")
    assert [(o.port, o.service) for o in out] == [(22, "ssh"), (80, "http")]
    assert len(out[0].version) <= 80
    assert out[1].service == "http"      # known-port fallback, not invented


def test_simulated_scanner_is_deterministic_and_labelled():
    a = SimulatedScanner().scan("lab.internal.example")
    b = SimulatedScanner().scan("lab.internal.example")
    assert a.status == "completed"
    assert [(o.port, o.service) for o in a.observations] == [(o.port, o.service) for o in b.observations]
    assert "SIMULATED" in a.limitations


def test_diff_reports_new_gone_and_changed():
    prev = [{"target": "a", "port": 22, "service": "ssh", "version": "1.0"},
            {"target": "a", "port": 80, "service": "http", "version": "1.0"}]
    cur = [{"target": "a", "port": 22, "service": "ssh", "version": "1.1"},
           {"target": "a", "port": 443, "service": "https", "version": ""}]
    d = diff_runs(cur, prev)
    assert [(r["port"]) for r in d["newly_observed"]] == [443]
    assert [(r["port"]) for r in d["no_longer_observed"]] == [80]
    assert d["version_changed"][0] == {"target": "a", "port": 22, "before": "1.0", "after": "1.1"}
    assert "not confirmed attacks" in d["note"]
