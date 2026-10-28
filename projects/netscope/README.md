# NetScope — Offline Packet-Capture Analysis

**See the shape of the traffic. Never the contents.** A working
React/TypeScript + FastAPI application wrapping the tested NetScope engine
(reused from `apps/netscope-cli` — dependency-free struct-based pcap parsing).

## What is implemented

| Area | Working functionality | Important boundary |
|---|---|---|
| Parsing | Classic pcap (Ethernet/IPv4/TCP/UDP/ICMP), bounded reads, malformed files fail cleanly | Payloads are **never inspected or exported** (tested against planted payload markers) |
| Analysis | Protocol distribution, top talkers, per-minute volumes, malformed counts | — |
| Volume flags | Configurable per-minute threshold heuristics | "Flagged for review — not proof of an attack" (stated everywhere) |
| Background jobs | Uploads larger than the inline threshold are analyzed in a worker thread with status polling | Temp files deleted after analysis |
| Comparison | Capture-to-capture diff: protocol volume deltas, new/resolved flags | Differences are "indicators to review, not confirmed attacks" |
| Reports | JSON export **pseudonymised by default** (stable pseudonyms — same IP maps to the same token) | Raw IPs available only on explicit unredacted reads |
| Accounts | Gold auth: PBKDF2 sessions, password reset (dev-token delivery), TOTP MFA, session revocation | Generic sign-in errors |

## Screens
Captures (upload + status list), Capture detail (protocol bars, talkers,
volume flags, label/edit/delete, export, compare). Loading, empty, error and
success states throughout.

## Run

```bash
cd backend
pip install -r requirements-dev.txt
cp ../.env.example ../.env
alembic upgrade head
uvicorn app.main:app --reload --port 8016

cd ../frontend
npm install --legacy-peer-deps
npm run dev                          # http://localhost:5304
```

## Test
```bash
cd backend && python3 -m pytest tests/ -q     # 11 tests: engine (summary, redaction
                                              # stability, payload-never-exported,
                                              # malformed, threshold), API (upload,
                                              # background path, compare, CRUD), migrations
cd frontend && npm run typecheck && npm test  # 2 tests
```
E2E + screenshots: `scripts/run-e2e.sh netscope` (needs Playwright browsers).

## Known limitations
- Classic pcap only (no pcapng), Ethernet/IPv4 only — same boundary as the engine.
- No live capture by design.
- Screenshots via `scripts/run-e2e.sh netscope`; pending in the build sandbox.
