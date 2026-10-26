# NetScope — network traffic analyzer (CLI)

Cybersecurity catalogue **Project 11** (Intermediate).

## Overview
Loads **saved packet captures** supplied by the user, summarises
source/destination addresses and protocol counts, shows time-based volumes,
flags unusual volumes by configurable rules, and exports findings.

## Security design (enforced + tested)
- **Offline by default** — no live collection is implemented at all.
- **Payload minimisation:** only transport headers and packet metadata are
  parsed; payload contents are never inspected or exported (a test embeds a
  secret payload and proves it never appears in reports).
- Malformed captures fail with clear errors; truncated files are detected.
- Anomaly flags use **configurable thresholds** and are labelled heuristics
  for review — never proof of an attack.
- `--redact` produces stable pseudonyms (`host-xxxxxxxx`) for shareable
  examples (documented as pseudonymisation, not cryptographic anonymity).

## Implementation note
A minimal classic-libpcap reader was written in `app/pcap.py` (struct-based) so
the tool has no libpcap/scapy dependency and runs anywhere.

## Usage
```bash
python3 -m app.cli capture.pcap --threshold 120 --json report.json --redact
```

## Testing
`python3 -m pytest tests/ -q` — protocol parsing, counts/talkers, configurable
thresholds, payload non-export, redaction stability, malformed/short files,
disclaimers.

## Limitations
Classic pcap + Ethernet/IPv4 only (pcapng, IPv6 are roadmap). No live capture.

## Future improvements
pcapng/IPv6 support, flow session tracking, richer charts, configurable rule
packs.
