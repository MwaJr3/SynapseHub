# HostWatch — endpoint security monitoring (CLI)

Cybersecurity catalogue **Project 18** (Expert, delivered at scope-appropriate
simplicity).

## Overview
Observes **explicitly selected** file locations and process metadata, maintains
observation facts, and produces alerts with the evidence behind them.

## Security requirements (enforced + tested)
- **Least privilege / read-only:** the monitor never terminates processes,
  never deletes or alters files, and collects no command lines (they can
  contain secrets) — stated in-product.
- **Explicit scope:** only `--watch` paths are observed; missing paths produce
  an explicit marker, never silence.
- **Unsupported platform features are reported**, not hidden (collector
  limitations surface as informational alerts).
- **Alert honesty:** an unusual process or file change is **NOT proof** of
  malicious activity; alerts are review signals with evidence.

## Architecture
```
collectors.py (psutil-based, mockable interface)
files.py      (scoped file facts, optional hashing)
rules.py      (evidence-backed review alerts)
cli.py        (thin wrapper)
```

## Usage
```bash
python3 -m app.cli --watch ./important --hash --json
```

## Testing
`python3 -m pytest tests/ -q` — file facts/missing markers, optional hashing,
informational high-memory alerts, change detection, unsupported-feature
reporting, disclaimer honesty.

## Limitations
Polling observations (no event streaming yet); psutil optional (documented
degradation). Event correlation across process+file activity is a roadmap item.

## Future improvements
Watchdog event streaming, configurable rule engine with correlated evidence,
retained-history timeline.
