# PhishLens — phishing email analyzer (CLI)

Cybersecurity catalogue **Project 6** (Intermediate).

## Overview
Analyzes **saved** email content: sender/Reply-To relationships, displayed-link
vs actual-href mismatches, suspicious URL structures (userinfo, long labels,
deep subdomains), risky attachment extensions, and pressure language — each
warning with a plain-language explanation.

## Security design (enforced + tested)
- **Never visits extracted URLs. Never executes attachments.** No uploads.
- URLs in reports are **defanged** (`hxxp[://]…`) so accidental clicks are less
  likely.
- Malformed messages raise `ParseError` — they never crash the tool.
- **Honesty (in-product + reports):** a suspicious pattern is **NOT proof** a
  message is malicious; no warnings is **NOT proof** of safety. Findings are
  review aids.

## Architecture
```
Email input -> parse.py (headers/URLs/attachment metadata)
            -> rules.py (rule engine, findings with explanations)
            -> report.py / cli.py (text + JSON, defanged)
```

## Usage
```bash
python3 -m app.cli data/phishy.eml
python3 -m app.cli data/legit.eml --json
```

## Testing
`python3 -m pytest tests/ -q` — legitimate vs phishy fixtures, each rule,
defanging, disclaimer presence, malformed-input handling.

## Limitations
Rule-based only (an optional ML classifier is a documented future extension,
kept separate from rules). HTML is minimally sanitised for display (tags
stripped in link text extraction).

## Future improvements
Optional licensed-dataset classifier with a strict rules/ML separation,
internationalized-domain handling, header-authentication (SPF/DKIM) checks
where headers are present.
