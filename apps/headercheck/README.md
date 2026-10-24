# HeaderCheck — HTTP security headers checker (CLI)

Cybersecurity catalogue **Project 10** (Intermediate).

## Overview
Evaluates HTTPS response headers against documented rules (HSTS, CSP,
X-Content-Type-Options, framing, Referrer-Policy, Permissions-Policy), with
explanations, remediation guidance and recorded redirects.

## Scoping & safety (enforced + tested)
- **Offline-first:** the CLI analyses saved JSON response fixtures; nothing is
  fetched.
- Live targets would require an explicit **allowlist file** (`assert_allowed`
  refuses everything else) — the tool never crawls or scans unrelated sites.
- **Context-aware severity:** "missing header" findings carry explanations that
  note architecture dependence (API vs web app). Not every missing header is an
  equal-weight vulnerability — in-product and in every report.
- TLS verification and finite timeouts apply to any live request (documented in
  `app/targets.py` policy for the opt-in path).

## Usage
```bash
python3 -m app.cli data/example_response.json
python3 -m app.cli data/strong_response.json --json
```

## Testing
`python3 -m pytest tests/ -q` — missing headers, weak HSTS, version disclosure,
clean strong fixture, malformed fixtures, allowlist enforcement.

## Limitations
Fixture-based in this environment (no general network access). Live scanning is
a deliberately gated capability.

## Future improvements
Configurable header policies, historical comparison reports, TLS configuration
review.
