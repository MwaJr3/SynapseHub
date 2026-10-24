# SecOps Dash — security-operations triage dashboard (FastAPI)

Cybersecurity catalogue **Project 20**.

## Overview
An **offline-first triage console** for security operations: simulated events
ingested from local fixtures, asset-criticality-weighted incident scoring,
collection-timestamped timelines, and **manual response playbooks** mapped to
event categories.

## What this tool does NOT do (stated in-product + tested)
- **No live telemetry** — data comes from local fixture files with provenance
  recorded (source file, collection timestamp).
- **No containment/remediation** — playbooks are manual runbook steps for an
  analyst to follow in their own tooling.
- Findings/timelines are **discussion starting points, not proof**; timestamps
  are **integrity since collection only — not proof of chronology**.

## Triage design (transparent)
Incident score = Σ `severity × (1 + criticality weight)`; the formula and the
asset inventory are shown in-product. Status advances (new → triaged →
contained → closed) are **human decisions** with illegal jumps refused (409).

## DSA/performance note
Ingest validation is linear in rows `O(n)` with per-row rejection lists;
scoring is `O(events)`; incident lookup is linear over an in-memory list
(bounded demo scale).

## Run
```bash
uvicorn app.main:app --port 8023
```

## Testing
`python3 -m pytest tests/ -q` — ingest rejection reasons, criticality
scoring, playbook mapping with manual-step language, status machine,
export integrity note, simulation labels.

## Limitations
Simulated data; state resets on restart; no connectors (by design).

## Future improvements
Optional allowlisted connectors with schema validation, correlation rules
with documented heuristics, role-based analyst workspaces, report exports.
