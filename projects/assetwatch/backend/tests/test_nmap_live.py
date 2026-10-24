"""Authorized live verification of the nmap adapter.

Loopback (127.0.0.1) is a self-owned target — this environment authorizes
scanning only what it owns. The test:

1. starts a local HTTP listener (our own service),
2. registers 127.0.0.1 on the allowlist and validates it through the API,
3. runs the NmapScanner adapter against 127.0.0.1 with an explicit port list,
4. asserts normalized observations come back through the normal pipeline.

Skipped (not failed) when the nmap binary is unavailable — see
scripts/verify-nmap.sh for the one-command runbook on any machine with nmap.
"""
import shutil
import socket
import threading

import pytest

pytestmark = pytest.mark.skipif(shutil.which("nmap") is None,
                                reason="nmap binary not installed — run scripts/verify-nmap.sh on a machine with nmap")


def test_nmap_adapter_against_authorized_loopback(auth_client):
    from app.scanners.nmap_adapter import NmapScanner

    # our own listener on an ephemeral port = an authorized, live target
    listener = socket.socket()
    listener.bind(("127.0.0.1", 0))
    port = listener.getsockname()[1]
    listener.listen(1)
    threading.Thread(target=listener.accept, daemon=True).start()

    # the API's own allowlist + validation path authorizes the scan
    r = auth_client.post("/api/allowlist", json={"entry": "127.0.0.1", "note": "self-owned loopback"})
    assert r.status_code == 200

    result = NmapScanner(timeout_seconds=60).scan("127.0.0.1", [port])
    assert result.status == "completed", result.error
    assert any(o.port == port for o in result.observations)
    assert result.limitations
    listener.close()
