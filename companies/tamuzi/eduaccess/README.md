# EduAccess — Affordable Learning, Scholarships and Sponsored Seats

Manages affordable access to learning through free, subsidized,
scholarship-funded, sponsor-funded and paid plans — with transparent review
workflows, capped seat allocation and an auditable manual reconciliation
ledger. Part of the portfolio education suite (Tamuzi Learning).

> **Fairness & financial honesty (in-product).** Consequential decisions
> require **recorded human review** — no opaque scoring, no sensitive personal
> attributes. **Pending payments are NOT settled funds**; refunds and
> reversals are distinct ledger entries. Sponsors see **aggregate-only**
> reports and only their own pools.

## What is implemented

- **Access plans** (free / subsidized / scholarship / sponsor / paid) with
  evidence requirements that minimise collected data (short statements only).
- **Application workflow (tested):** submitted → needs_info → under_review →
  approved / waitlisted / declined → enrolled → completed, plus withdrawn.
  Illegal transitions rejected; **every decision requires a recorded reason**
  (server-enforced, tested).
- **Seat allocation (tested):** hard pool caps — never over-allocates; partial
  allocation and waitlist behaviour documented.
- **Funding pools** with eligibility criteria written as transparent,
  documented rules (tested — mismatch reasons are plain-language).
- **Ledger (tested):** pending vs settled vs reversed states; balance math
  excludes pending; reversal/refund rows are distinct.
- **Sponsor isolation (tested):** sponsors cannot see other sponsors' pools or
  reports; reports never expose applicant details.
- **Appeals** for declined/waitlisted decisions; audit log of decisions and
  transactions.

## What is simulated or out of scope (documented, not hidden)

- **No payment provider is configured in the demo** — the manual/offline
  reconciliation workflow is used instead of faking successful payments
  (explicitly labelled in-product).
- Notification emails and background report jobs are deployment steps.

## Stack

FastAPI, SQLAlchemy (SQLite default, PostgreSQL-ready), React 19, TypeScript
(strict), Tailwind CSS 4, Vite. Tests: pytest (9) + Vitest (3).

## Run it

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python3 -m app.seed
python3 -m uvicorn app.main:app --port 8015

cd ../frontend
npm install && npm run dev               # http://localhost:5188 → :8015
```

### Demo accounts (fictional, simulated data)

| Role | Email | Password |
| --- | --- | --- |
| Learner | `demo.learner@eduaccess.example` | `demo-password-123` |
| Reviewer | `demo.reviewer@eduaccess.example` | `demo-password-123` |
| Finance | `demo.finance@eduaccess.example` | `demo-password-123` |
| Sponsor | `demo.sponsor@eduaccess.example` | `demo-password-123` |
| Admin | `demo.admin@eduaccess.example` | `demo-password-123` |

## Portfolio

See `portfolio.json`. Screenshots pending capture (not fabricated).
