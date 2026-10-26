# OpenLearn Commons — Open Educational Resource and Localization Hub

Discover, evaluate, adapt, translate and responsibly reuse open educational
resources — with **licensing, attribution, language, accessibility and source
provenance visible** at every step. Part of the portfolio education suite
(Tamuzi Learning).

> **Rights honesty (in-product).** A resource being publicly accessible does
> **not** make it openly licensed. Unknown licenses carry **no legal
> certainty** and never grant reuse. Adaptations are blocked when the license
> does not permit them, with the obligation explained.

## What is implemented

- **Searchable catalogue** with filters (subject, level, language, type,
  license) and full metadata: canonical source, creator, license, attribution
  text, source URL, import time, review status.
- **Provenance honesty:** entries are marked `hosted_local` or `link_only` —
  link-only entries state plainly that the file is not hosted here (tested).
- **License-aware reuse guidance** (tested matrix): per-license adapt /
  redistribute / commercial permissions + obligations; `Unknown` and
  unrecognized licenses are treated as uncertain and block adaptations.
- **Adaptations & translations:** adaptations link back to the source and its
  license obligations; translations run draft → in_review → approved/rejected
  (illegal direct approval rejected, tested). **Machine drafts stay labelled
  and unpublished translations are never exposed publicly** (tested).
- **Collections** with per-item attribution export.
- **Upload rights confirmation required** (tested), duplicate detection by
  normalized title / source URL (tested), rating display that separates
  community ratings from expert review, and a takedown/report workflow
  (tested — upheld takedowns remove access).

## What is simulated or out of scope (documented, not hidden)

- No scraping connectors are implemented (the product forbids scraping without
  permission; connectors are documented as explicit, rate-limited modules).
- Licensed file storage (S3) is deployment-configured; demo entries are text.
- Export formats: attribution text (JSON endpoint) — PDF pack export is a
  documented next step.

## Stack

FastAPI, SQLAlchemy (SQLite default, PostgreSQL-ready), React 19, TypeScript
(strict), Tailwind CSS 4, Vite. Tests: pytest (9) + Vitest (4).

## Run it

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python3 -m app.seed
python3 -m uvicorn app.main:app --port 8013

cd ../frontend
npm install && npm run dev               # http://localhost:5186 → :8013
```

### Demo accounts (fictional, simulated data; demonstration licenses stated)

| Role | Email | Password |
| --- | --- | --- |
| Contributor | `demo.contributor@openlearn.example` | `demo-password-123` |
| Translator | `demo.translator@openlearn.example` | `demo-password-123` |
| Reviewer | `demo.reviewer@openlearn.example` | `demo-password-123` |
| Admin | `demo.admin@openlearn.example` | `demo-password-123` |

## Portfolio

See `portfolio.json`. Screenshots pending capture (not fabricated).
