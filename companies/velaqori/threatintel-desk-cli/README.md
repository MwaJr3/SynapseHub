# ThreatIntel Desk — threat intelligence lookup & enrichment (CLI)

Cybersecurity catalogue **Project 17** (Advanced).

## Overview
Imports and normalises indicators (IP, domain, URL, file hashes), validates
formats, queries **configured** intelligence sources, caches results with
provenance and retrieval times, and consolidates reports that represent
unavailable and inconclusive results **explicitly**.

## Security design (enforced + tested)
- **External lookups are disabled by default** — they require `--external` and
  explicit `TI_PROVIDER_URL` configuration.
- **Private/internal indicators are refused** for external submission.
- API keys come from the environment and are never logged or committed.
- Bundled dataset is **synthetic demo data** (labelled in every detail string).
- **Honesty (in-product):** a provider response is unverified third-party
  information — **not conclusive proof** of maliciousness; `no-data` is **not a
  clearance**; unavailable sources are shown as unavailable, never as clean.

## Architecture
```
indicators.py -> providers.py (LocalDataset | HttpReputation adapters)
              -> cache.py (provenance-tracked results)
              -> report.py (consolidated verdicts + explicit consensus)
```

## Usage
```bash
python3 -m app.cli 203.0.113.66 evil-demo.example --json
python3 -m app.cli 203.0.113.9            # shows no-data explicitly
```

## Testing
`python3 -m pytest tests/ -q` — indicator parsing, local lookups, cache
provenance, private-indicator refusals, explicit unavailability, report honesty.

## Limitations
Synthetic dataset; single HTTP adapter shape; no evidence-file upload ever
(that would be a privacy hazard).

## Future improvements
More provider adapters, result reranking, integration into the SIEM-style
investigation workflow, rate limiting per provider.
