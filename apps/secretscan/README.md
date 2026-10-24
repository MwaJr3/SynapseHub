# SecretScan — secret & API-key scanner (CLI)

Cybersecurity catalogue **Project 8** (Intermediate).

## Overview
Scans an **explicitly selected** source directory for candidate API keys,
tokens, password assignments, PEM private keys, JWTs and credential-bearing
database URLs. Reports show file + line with **redacted** values and
remediation guidance.

## Security design (enforced + tested)
- **Complete suspected secrets never appear in reports** (redaction is
  test-enforced end to end).
- Scanned content is never transmitted anywhere.
- Irrelevant directories (`.git`, `venv`, `node_modules`, `dist`, …) and binary
  files are skipped.
- **Matches are candidates, not confirmed credentials** — stated in every
  report. The scanner introduces no secrets into its own logs.

## Usage
```bash
python3 -m app.cli ./my-repo --json report.json
python3 -m app.cli ./my-repo --fail-on-findings   # pre-commit mode
```

## Testing
`python3 -m pytest tests/ -q` — synthetic fake credentials only; matching, exact
line numbers, exclusion rules, binary skipping, redaction, scope validation.

## Limitations
Pattern matching cannot verify whether a credential is live; rules live in
`app/rules.py` (configurable, but no plugin system yet).

## Future improvements
Configurable rule packs, pre-commit hook packaging, entropy-based detection,
baseline files for acknowledged findings.
