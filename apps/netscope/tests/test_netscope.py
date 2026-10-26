"""Tests: pcap parsing, summaries, anomalies, redaction, malformed input."""
from __future__ import annotations

import json
import struct

from app.analysis import anonymise, summarise
from app.pcap import PcapError, read_pcap
from app.report import to_dict, to_text


def build_pcap(packets_frames):
    out = struct.pack("<IHHiIII", 0xA1B2C3D4, 2, 4, 0, 0, 65535, 1)
    for i, frame in enumerate(packets_frames):
        out += struct.pack("<IIII", 1_760_000_000 + i, 0, len(frame), len(frame)) + frame
    return out


def eth_ip(src, dst, proto, payload=b"", sport=0, dport=0):
    eth = b"\x00" * 6 + b"\x11" * 6 + struct.pack(">H", 0x0800)
    ip = struct.pack(">BBHHHBBH", 0x45, 0, 20 + len(payload) + (4 if proto in (6, 17) else 0), 0, 0, 64, proto, 0) \
        + bytes(int(x) for x in src.split(".")) + bytes(int(x) for x in dst.split("."))
    transport = struct.pack(">HH", sport, dport) + b"\x00" * 4 if proto in (6, 17) else b""
    return eth + ip + transport + payload


def test_parse_protocols(tmp_path):
    frames = [
        eth_ip("10.0.0.1", "10.0.0.2", 6, sport=1234, dport=80),
        eth_ip("10.0.0.3", "10.0.0.2", 17, sport=53, dport=5353),
        eth_ip("10.0.0.4", "10.0.0.2", 1),
    ]
    p = tmp_path / "s.pcap"; p.write_bytes(build_pcap(frames))
    packets = read_pcap(p)
    assert [x.protocol for x in packets] == ["tcp", "udp", "icmp"]
    assert packets[0].src_ip == "10.0.0.1" and packets[0].dst_port == 80


def test_summary_counts_and_talkers(tmp_path):
    frames = [eth_ip("10.0.0.1", "10.0.0.2", 6, sport=1, dport=2) for _ in range(7)]
    frames += [eth_ip("10.0.0.9", "10.0.0.2", 1) for _ in range(3)]
    p = tmp_path / "s.pcap"; p.write_bytes(build_pcap(frames))
    s = summarise(read_pcap(p))
    assert s.packets == 10 and s.by_protocol == {"tcp": 7, "icmp": 3}
    assert s.top_sources[0] == ("10.0.0.1", 7)


def test_anomaly_threshold_is_configurable(tmp_path):
    frames = [eth_ip("10.0.0.1", "10.0.0.2", 6, sport=1, dport=2) for _ in range(30)]
    p = tmp_path / "s.pcap"; p.write_bytes(build_pcap(frames))
    assert summarise(read_pcap(p), alert_threshold_per_minute=10).anomalies
    assert summarise(read_pcap(p), alert_threshold_per_minute=100).anomalies == []


def test_payloads_never_exported(tmp_path):
    frames = [eth_ip("10.0.0.1", "10.0.0.2", 6, b"SECRET-PAYLOAD", sport=1, dport=2)]
    p = tmp_path / "s.pcap"; p.write_bytes(build_pcap(frames))
    payload = json.dumps(to_dict(summarise(read_pcap(p))))
    assert "SECRET-PAYLOAD" not in payload


def test_redaction_is_stable_pseudonymisation():
    assert anonymise("10.0.0.1") == anonymise("10.0.0.1")
    assert anonymise("10.0.0.1") != anonymise("10.0.0.2")
    assert anonymise("10.0.0.1").startswith("host-")


def test_malformed_capture_errors(tmp_path):
    import pytest
    p = tmp_path / "bad.pcap"; p.write_bytes(b"\x00" * 40)
    with pytest.raises(PcapError):
        read_pcap(p)
    q = tmp_path / "short.pcap"; q.write_bytes(b"\x01")
    with pytest.raises(PcapError):
        read_pcap(q)


def test_text_report_includes_disclaimer(tmp_path):
    frames = [eth_ip("10.0.0.1", "10.0.0.2", 6, sport=1, dport=2)]
    p = tmp_path / "s.pcap"; p.write_bytes(build_pcap(frames))
    assert "not proof of an attack" in to_text(summarise(read_pcap(p)))
