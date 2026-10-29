# WebWatch — automated web data collection (CLI + SQLite)

Engineering catalogue **Project 19** (Advanced).

## Overview
Collects records from **explicitly permitted** sources (job listings demo),
stores them with provenance, detects new/changed records with before/after
diffs, and keeps observable run history including partial/schema-drift states.

## Collection ethics (enforced + tested)
- Sources must be **allowlisted**; hosts outside a source's permitted host are
  refused. Unpermitted sources are refused outright.
- **robots.txt is evaluated** (offline from provided text in this environment);
  live runs must respect robots guidance, terms and privacy obligations.
- The HTTP adapter uses timeouts and **bounded reads (512 KB)**; conditional
  GETs (ETag/Last-Modified) avoid re-downloading unchanged resources.
- Nothing that would bypass authentication, paywalls, CAPTCHAs or access
  controls is implemented.
- Changing page structures produce **schema-drift reports** — never silently
  reported as "no change".

## DSA/performance note
Records dedupe by SHA-256 content hash (dict lookup `O(1)` average per record);
runs are bounded by `max_pages_per_run`; no unbounded queues.

## Usage
```bash
python3 -m app.cli collect demo-jobs                 # fixture transport (default)
python3 -m app.cli records demo-jobs
python3 -m app.cli history demo-jobs
```

## Testing
`python3 -m pytest tests/ -q` — host/allowlist enforcement, robots evaluation,
extraction + drift, conditional fetch, change diffs, dedupe.

## Limitations
Simulated fixtures are fictional demo data; live HTTP is implemented but not
exercised here (no general network access).

## Future improvements
Scheduled runs with observability, multiple source connectors via documented
APIs, configurable notifications.
