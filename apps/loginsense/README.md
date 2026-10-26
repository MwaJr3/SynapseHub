# LoginSense — suspicious login detection (CLI)

Cybersecurity catalogue **Project 12** (Intermediate).

## Overview
Normalises authentication events from supported log formats and detects:
repeated failures, suspicious failure→success sequences, and one source failing
against multiple accounts — each with **transparent, documented risk scores**
and named contributing signals.

## Honest-detection requirements (enforced + tested)
- **Unsuccessful logins alone are NOT proof of malicious activity** — stated in
  every report. Findings are review signals with explicit weights
  (`app/detect.py`).
- **No geolocation inference** beyond the source address present in the log.
- Malformed lines never crash parsing (logs are untrusted input).
- A false-positive test proves legitimate-looking activity (same host, working
  hours, isolated failure) raises **no** findings.

## Usage
```bash
python3 -m app.cli data/sample_auth.log
python3 -m app.cli data/sample_auth.log --json
```

## Testing
`python3 -m pytest tests/ -q` — normalisation robustness, each rule, off-hours
risk bonus, legitimate-activity false positives, sample-log totals, disclaimer.

## Limitations
One supported log format (documented regex in `app/parse.py`); scores are
heuristic; thresholds configurable in code. Use synthetic or anonymised logs.

## Future improvements
Configurable scoring profiles, correlation with other event sources (feeds the
mini-SIEM concept), alert export.
