# PhishLens — Email Phishing Indicator Analysis

**See the signal. Review the evidence. Decide for yourself.** A working
React/TypeScript + FastAPI application wrapping the tested PhishLens rule
engine (reused from `apps/phishlens-cli`). Paste a raw message, get structured
indicator warnings with explanations — never a verdict.

## What is implemented

| Area | Working functionality | Important boundary |
|---|---|---|
| Parsing | Headers, body, HTML links, attachments (structure only) | Malformed input raises a clean parse error, never crashes |
| Rules | Reused engine: From/Reply-To mismatch, displayed-link mismatch, URL userinfo, long labels, deep subdomains, risky attachments, pressure language — each with plain-language explanation + evidence | Findings are suspicious-pattern warnings, **never proof** of maliciousness; no findings is **never proof** of safety |
| Link safety | URLs defanged in all evidence/reports | Links are **never visited** |
| Casework | Analysis history with search/filter, dispositions (phishing/suspicious/legitimate/false-positive), investigation notes, JSON report export, per-record delete | Every response carries the review disclaimer |
| Accounts | Register/login (PBKDF2 200k, HttpOnly sessions, generic errors), **password reset** (dev-token delivery labelled; SMTP at deployment), **TOTP MFA** (RFC 6238, stdlib), session listing + revocation | No password is ever emailed in this environment |

## Screens
Analyze (paste → progress → severity + count), History (searchable),
Message detail (findings with evidence, review workflow, export),
Login/Register/Reset/MFA. Loading, empty, error and success states throughout.

## Architecture
```
backend/app/
  engine/          # parse.py, rules.py, report.py — reused from apps/phishlens-cli
  security.py      # PBKDF2 + TOTP MFA + reset tokens + sessions
  models.py        # users, sessions, reset_tokens, messages, findings, notes
  main.py          # FastAPI routes
alembic/           # migrations (alembic upgrade head)
frontend/src/
  pages/           # Login, Analyze, History, Message
```

## Run

```bash
cd backend
pip install -r requirements-dev.txt
cp ../.env.example ../.env
alembic upgrade head                 # or let dev create_all handle SQLite
uvicorn app.main:app --reload --port 8015

cd ../frontend
npm install --legacy-peer-deps
npm run dev                          # http://localhost:5305
```

## Test
```bash
cd backend && python3 -m pytest tests/ -q     # 12 tests: engine fixtures (legit/phishy/
                                              # attachment), auth incl. reset+MFA+sessions,
                                              # analysis workflow, migrations
cd frontend && npm run typecheck && npm test  # 2 tests
```
E2E + screenshots: `scripts/run-e2e.sh phishlens` (needs Playwright browsers).

## Known limitations
- Rule-based only — no ML classifier; warnings carry false positives/negatives.
- Password-reset email delivery is stubbed (dev token in response); SMTP is a
  deployment step (`RESET_DELIVERY=smtp`).
- Screenshots via `scripts/run-e2e.sh phishlens`; pending in the build sandbox
  (browser downloads blocked there).
