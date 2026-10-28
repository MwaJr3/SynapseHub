# Engine module reused from apps/netscope-cli (tested CLI engine) — behavior preserved.
"""Minimal libpcap-format reader (offline files only).

Parses just enough structure for analysis: link-layer/IP/TCP/UDP/ICMP headers
and packet metadata. **Payload contents are never inspected** beyond the
transport header — minimising sensitive-data exposure by design.
"""
from __future__ import annotations

import struct
from dataclasses import dataclass
from pathlib import Path


class PcapError(ValueError):
    pass


@dataclass
class Packet:
    timestamp: float
    src_ip: str
    dst_ip: str
    protocol: str        # tcp | udp | icmp | other | arp
    src_port: int | None
    dst_port: int | None
    length: int
    malformed: bool = False


def read_pcap(path: str | Path) -> list[Packet]:
    data = Path(path).read_bytes()
    if len(data) < 24:
        raise PcapError("File is too short to be a pcap capture.")
    magic = struct.unpack("<I", data[:4])[0]
    if magic == 0xA1B2C3D4:
        endian, nano = "<", False
    elif magic == 0xD4C3B2A1:
        endian, nano = ">", False
    elif magic in (0xA1B23C4D, 0x4D3CB2A1):
        endian, nano = ("<" if magic == 0xA1B23C4D else ">"), True
    else:
        raise PcapError(f"Unrecognised capture format (magic {magic:#x}).")
    linktype = struct.unpack(endian + "I", data[20:24])[0]
    if linktype != 1:
        raise PcapError(f"Unsupported link type {linktype} (only Ethernet is supported).")
    packets: list[Packet] = []
    offset = 24
    while offset + 16 <= len(data):
        ts_sec, ts_frac, incl_len, _orig_len = struct.unpack(endian + "IIII", data[offset:offset + 16])
        offset += 16
        frame = data[offset:offset + incl_len]
        offset += incl_len
        if len(frame) < incl_len:
            packets.append(Packet(ts_sec + ts_frac / (1e9 if nano else 1e6), "", "", "other", None, None, 0, True))
            break
        packets.append(_decode(ts_sec + ts_frac / (1e9 if nano else 1e6), frame))
    return packets


def _decode(ts: float, frame: bytes) -> Packet:
    if len(frame) < 14:
        return Packet(ts, "", "", "other", None, None, len(frame), True)
    ethertype = struct.unpack(">H", frame[12:14])[0]
    if ethertype == 0x0806:
        return Packet(ts, "", "", "arp", None, None, len(frame))
    if ethertype != 0x0800:
        return Packet(ts, "", "", "other", None, None, len(frame))
    ip = frame[14:]
    if len(ip) < 20:
        return Packet(ts, "", "", "other", None, None, len(frame), True)
    ihl = (ip[0] & 0x0F) * 4
    proto = ip[9]
    src = ".".join(str(b) for b in ip[12:16])
    dst = ".".join(str(b) for b in ip[16:20])
    transport = ip[ihl:]
    if proto == 6 and len(transport) >= 4:
        sport, dport = struct.unpack(">HH", transport[:4])
        return Packet(ts, src, dst, "tcp", sport, dport, len(frame))
    if proto == 17 and len(transport) >= 4:
        sport, dport = struct.unpack(">HH", transport[:4])
        return Packet(ts, src, dst, "udp", sport, dport, len(frame))
    if proto == 1:
        return Packet(ts, src, dst, "icmp", None, None, len(frame))
    return Packet(ts, src, dst, "other", None, None, len(frame))
