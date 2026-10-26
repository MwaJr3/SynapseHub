# AssetWatch — Authorized Asset Inventory & Exposure Monitor

**See the asset. Understand the exposure. Track the change.** A working
React/TypeScript + FastAPI application. Asset management and security-monitoring
actions are validated, limited, and visible — every scan is checked against an
explicit authorization allowlist server-side before it runs.

## What is implemented

| Area | Working functionality | Important boundary |
|---|---|---|
| Inventory | Asset CRUD (hostname/IP, kind, environment, owner, importance), per-user records | Inventory alone proves nothing about security — stated in the UI |
| Authorization | Explicit allowlist of exact hosts, IPs, and CIDR ranges; **backend target validation on every scan**; target and port count limits; refusals audited | There is no override flag. Non-allowlisted targets are refused, period |
| Scanning | Modular adapters: **import** (manually supplied results from your own approved tooling — primary offline path), **simulated** (deterministic demo data, labelled), **nmap** (opt-in, requires installed binary, service/version detection only, no scripts, hard timeout) | No exploitation, credential attacks, stealth, or unrestricted public-target scanning is implemented |
| Exposure diffing | Per-run normalized observations; comparison of any two runs: **newly observed / no longer observed / version changed** | Diffs are described as indicators of change, not confirmed attacks |
| Findings & remediation | Findings classified by severity + exposure + business importance; remediation tasks with owners and status (todo/in_progress/done) | Observed services are indicators to assess, not proof of vulnerability |
| Audit | Append-style audit log of logins, allowlist changes, scans (including refusals), findings, and remediation actions | Retention is per-deployment |

## Screens
Dashboard (live counts: assets, scan runs, open findings, configured mode),
Assets (inventory + allowlist management), Scans (run, list, compare runs),
Findings (classify + assign remediation), Audit. Loading, empty, error and
success states throughout.

## Architecture
```
backend/app/
  authorization.py    # target validation — tested refusal paths
  scanners/           # base normalization, simulated, import, opt-in nmap
  diffing.py          # run comparison engine
  models.py           # assets, allowlist, scan_runs, observations,
                      # findings, remediation, audit
  main.py             # FastAPI routes
frontend/src/
  pages/              # Dashboard, Assets, Scans, Findings, Audit, Login
```

## Run

```bash
# backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp ../.env.example ../.env          # defaults: SQLite + import mode
uvicorn app.main:app --reload --port 8012

# frontend
cd frontend
npm install --legacy-peer-deps
npm run dev                          # http://localhost:5175 (proxies /api to 8012)
```

## Test
```bash
cd backend && python3 -m pytest tests/ -q     # 11 tests: authorization refusals & limits,
                                              # normalization, deterministic sim adapter,
                                              # diff engine, API flows, role enforcement
cd frontend && npm run typecheck && npm test  # 2 tests: UI + diff formatting
```

## Security posture
- Authorized management and monitoring only — this is **not a scanning
  framework**. Every scan request passes `validate_targets()` first; failures
  are refused and audited.
- Scan shape is bounded: max targets per scan, max ports per scan, hard
  subprocess timeout for the optional nmap adapter.
- Roles (admin/analyst/viewer) gate allowlist mutation; audit log records
  refusals as well as successes.
- No secrets in the frontend; no fake integrations; simulated data labelled
  `SIMULATED` everywhere it appears.

## Known limitations
- The simulated adapter's results are deterministic demo data, not real
  network observations; the import path depends on externally produced data
  (none bundled).
- The nmap adapter's live verification is automated in `backend/tests/test_nmap_live.py` (authorized **loopback** target only). It skips where the nmap binary is unavailable; `scripts/verify-nmap.sh` runs it on any machine with nmap and lifts this limitation.
- No background scheduled scans; scans run on request.
- Screenshots and Playwright e2e specs ship ready to run: `scripts/run-e2e.sh <project>` boots backend + frontend, runs the core-flow spec, and writes documentation screenshots to `docs/screenshots/<project>/`. They are **pending in this build environment** (browser downloads are network-blocked here); run the script once on any normal machine to capture them.
- The nmap adapter's live verification is automated in `backend/tests/test_nmap_live.py` (authorized **loopback** target only). It skips where the nmap binary is unavailable; `scripts/verify-nmap.sh` runs it on any machine with nmap and lifts this limitation.
