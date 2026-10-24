#!/usr/bin/env bash
# Authorized nmap verification runbook (one command on any machine with nmap).
# Scans 127.0.0.1 only — a self-owned target. Never scans anything else.
set -euo pipefail
command -v nmap >/dev/null || { echo "nmap not installed. Install it, then re-run."; exit 1; }
cd "$(dirname "$0")/../projects/assetwatch/backend"
python3 -m pytest tests/test_nmap_live.py -q
echo "nmap adapter verified against an authorized loopback target."
