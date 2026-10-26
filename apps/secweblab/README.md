# SecWebLab — security code-review lab (CLI)

Cybersecurity catalogue **Project 16**.

## Overview
A training lab containing **deliberately insecure code/markup samples** with a
passive analyzer that produces findings with evidence, **reproduction steps
for local labs only**, candidate fixes, and explicit limitations.

## Honesty & ethics (enforced + tested)
- Analysis is **passive** — no execution, no exploitation, no traffic.
- Findings are **discussion starting points, NOT proof** of exploitability;
  severity labels are **indicative estimates**.
- **Absence of findings is NOT proof of safety** (stated in every report).
- All samples are in-repo; the tool is for reviewing **your own code** in
  local labs only.

## Coverage (deliberately small)
DOM-XSS indicators in markup; `eval`/`exec`; unsafe `pickle`; `subprocess
shell=True`. Each maps to an OWASP Top 10 (2021) style class label.

## Usage
```bash
python3 -m app.cli data/                 # scan all lab samples
python3 -m app.cli data/sample_unsafe.py --json
```

## Testing
`python3 -m pytest tests/ -q` — every pattern class detected, safe sample
clean, findings carry repro steps + fixes + indicative severity + limitations.

## Limitations
Regex/pattern-based; misses novel vulnerability classes entirely; no data-flow
analysis.

## Future improvements
Taint-style data-flow tracing, markdown report export, comparison walkthroughs
(safe vs unsafe implementation).
