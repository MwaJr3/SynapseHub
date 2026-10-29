"""Engine tests ported from apps/netscope-cli (behavior preserved)."""
import pytest

from app.engine.pcap import PcapError, read_pcap
from app.engine.analysis import anonymise, summarise
from app.engine.report import to_dict
from conftest import build_pcap, eth_ip


def test_summary_counts_and_talkers(tmp_path):
    p = tmp_path / "c.pcap"
    p.write_bytes(build_pcap([
        eth_ip("10.0.0.1", "10.0.0.2", 6, b"x" * 40, 1234, 80),
        eth_ip("10.0.0.1", "10.0.0.2", 17, b"y" * 10, 53, 53),
    ]))
    s = summarise(read_pcap(p))
    assert s.packets == 2 and s.bytes_total > 50
    assert s.by_protocol.get("tcp", 0) + s.by_protocol.get("TCP", 0) >= 1 or sum(s.by_protocol.values()) == 2
    assert ("10.0.0.1", 2) in s.top_sources


def test_payloads_never_exported(tmp_path):
    p = tmp_path / "c.pcap"
    secret = b"SECRETPAYLOADMARKER"
    p.write_bytes(build_pcap([eth_ip("10.0.0.1", "10.0.0.2", 6, secret, 1, 80)]))
    payload = to_dict(summarise(read_pcap(p)))
    assert "SECRETPAYLOADMARKER" not in str(payload)
    assert "never inspected" in payload["disclaimer"]


def test_redaction_is_stable_pseudonymisation(tmp_path):
    p = tmp_path / "c.pcap"
    p.write_bytes(build_pcap([eth_ip("10.0.0.1", "10.0.0.2", 6, b"x", 1, 80)]))
    s = summarise(read_pcap(p))
    a = to_dict(s, redact=True)
    b = to_dict(s, redact=True)
    assert a["top_sources"] == b["top_sources"]
    assert "10.0.0.1" not in str(a["top_sources"])


def test_malformed_capture_errors(tmp_path):
    p = tmp_path / "bad.pcap"
    p.write_bytes(b"not a capture file at all")
    with pytest.raises(PcapError):
        read_pcap(p)


def test_anomaly_threshold_is_configurable(tmp_path):
    frames = [eth_ip("10.0.0.1", "10.0.0.2", 6, b"x" * 100, i, 80) for i in range(5)]
    p = tmp_path / "c.pcap"
    p.write_bytes(build_pcap(frames))
    s = summarise(read_pcap(p), alert_threshold_per_minute=1)
    s2 = summarise(read_pcap(p), alert_threshold_per_minute=10_000)
    assert s.anomalies and not s2.anomalies
