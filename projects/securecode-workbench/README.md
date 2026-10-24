# SecureCode Workbench — SAST Orchestration & Triage

**Review the code. Understand the finding. Decide deliberately.** A working
React/TypeScript + FastAPI application that orchestrates static security
review: it ingests untrusted project archives or pasted source, runs modular
rules, normalizes findings into a common schema, and puts a human review
workflow around the results.

## What is implemented

| Area | Working functionality | Important boundary |
|---|---|---|
| Ingest | Zip archives (sandboxed extraction), pasted source, Bandit JSON import | Path traversal, zip bombs, oversized archives and file-count abuse are **refused** (tested). Uploaded code is **never executed** |
| Rules | Modular rule sets separate from presentation: Python security heuristics (dynamic execution, shell=True, pickle, yaml.load, weak hashes, hardcoded secrets, verify=False, assert-guard) + secret detection (AWS key, private key, generic credential) | Heuristic indicators — findings are not proof of vulnerabilities, and no findings is not proof of security |
| Parsers | Bandit JSON → common finding schema (severity, CWE, path, line, evidence, explanation, suggested fix); tested against fixtures | Unknown fields preserved, never invented |
| Triage | Per-finding workflow: open / accepted / fixed / suppressed; suppressions become project **baselines** matched on later scans | Suggested fixes are guidance to review — never auto-applied |
| Evidence | Redacted by default (secret-shaped material masked) | Raw secrets are not displayed or exported |
| AI review | Configurable, **off by default**; requires config + explicit per-run consent; records the consent decision | No AI provider is configured in this deployment — the gate always blocks and states that source is never sent |
| Reports | JSON export: severity summary, per-finding disclaimers, limitations, AI-consent state | Every report carries the limitations statement |

## Screens
Projects (archive upload + paste scan, run list), Findings (filter by
severity/triage, detail with redacted evidence, explanation, suggested fix,
triage buttons), Architecture & security posture (module pipeline + hard
boundaries). Loading, empty, error and success states throughout.

## Architecture
```
backend/app/
  archive_guard.py     # sandboxed extraction — limits tested adversarially
  rules/               # python_rules, secrets_rules (data-driven Rule objects)
  parsers/             # bandit_parser → common schema
  redaction.py         # evidence masking + AI consent gate
  services.py          # fingerprints, baselines, report payloads
  main.py              # FastAPI routes
frontend/src/
  pages/               # Projects, Findings, Architecture, Login
```

## Run

```bash
# backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp ../.env.example ../.env
uvicorn app.main:app --reload --port 8013

# frontend
cd frontend
npm install --legacy-peer-deps
npm run dev                        # http://localhost:5176 (proxies /api to 8013)
```

## Test
```bash
cd backend && python3 -m pytest tests/ -q     # 14 tests: traversal/abs-path/bomb/count refusals,
                                              # rule detection + no false invent, redaction,
                                              # AI gate, Bandit parser accuracy, API + baseline flow
cd frontend && npm run typecheck && npm test  # 2 tests: UI boundaries + formatting
```

## Security posture
- Uploaded content is untrusted: enforced path-traversal, compression-ratio,
  uncompressed-size and file-count limits before any file is read.
- Code is only ever read as text — never imported, executed, or built.
- Evidence is redacted before display/export; no secrets in the frontend.
- Optional AI review cannot send anything without double opt-in (configuration
  + explicit consent), and this deployment ships no AI provider at all.

## Known limitations
- Rules are heuristics with known false positives/negatives; the workbench
  makes triage easy but does not claim completeness. No SAST engine ships
  enabled out of the box beyond the built-in rule sets (Bandit JSON can be
  imported).
- No automatic fix application — by design.
- Baseline matching is per project, per fingerprint (rule|path|line|evidence).
- Screenshots pending capture.
