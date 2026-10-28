"""Flow aggregation, statistical summaries, configurable unusual-volume rules."""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field

from .pcap import Packet


@dataclass
class Summary:
    packets: int
    bytes_total: int
    by_protocol: dict[str, int]
    top_sources: list[tuple[str, int]]
    top_destinations: list[tuple[str, int]]
    per_minute: dict[str, int]
    anomalies: list[str] = field(default_factory=list)
    malformed_packets: int = 0


def summarise(packets: list[Packet], alert_threshold_per_minute: int = 120) -> Summary:
    by_proto: Counter[str] = Counter()
    srcs: Counter[str] = Counter()
    dsts: Counter[str] = Counter()
    per_minute: Counter[str] = Counter()
    total_bytes = 0
    malformed = 0
    for p in packets:
        by_proto[p.protocol] += 1
        total_bytes += p.length
        if p.malformed:
            malformed += 1
            continue
        if p.src_ip:
            srcs[p.src_ip] += 1
        if p.dst_ip:
            dsts[p.dst_ip] += 1
        minute = f"{int(p.timestamp // 60) * 60}"
        per_minute[minute] += 1
    anomalies = [
        f"minute {minute}: {count} packets exceeds the configured threshold of {alert_threshold_per_minute}"
        for minute, count in sorted(per_minute.items()) if count > alert_threshold_per_minute
    ]
    return Summary(len(packets), total_bytes, dict(by_proto), srcs.most_common(5), dsts.most_common(5),
                   dict(sorted(per_minute.items())), anomalies, malformed)


def protocol_chart(by_protocol: dict[str, str]) -> str:
    """ASCII bar chart with an implicit text summary (values printed alongside)."""
    if not by_protocol:
        return "no packets"
    top = max(by_protocol.values())
    lines = []
    for proto, count in sorted(by_protocol.items(), key=lambda kv: -kv[1]):
        bar = "#" * max(1, int(count / top * 30))
        lines.append(f"{proto:6} {count:6} {bar}")
    return "\n".join(lines)


def anonymise(ip: str, salt: str = "demo") -> str:
    """Stable pseudonymisation for shareable examples (not cryptographic anonymity)."""
    import hashlib
    return "host-" + hashlib.sha256((salt + ip).encode()).hexdigest()[:8] if ip else ""
