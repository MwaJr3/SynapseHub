# Frontpage — RSS / Atom Feed Reader

A personal reading dashboard that pulls RSS and Atom feeds into one timeline.
Built from the Frontend Mentor **Frontpage** product challenge (brief, brand kit
and sample data supplied by Frontend Mentor; this is an independent
implementation, not an endorsed or verified completion).

## Features (working)

**Core**

- **Accounts** — email + password sign-up/sign-in/sign-out, password reset,
  DB-backed cookie sessions (scrypt hashing), protected routes.
- **Try as Guest** — one click from the landing page loads 19 curated feeds in
  5 categories (`data/sample-feeds.json`). Guest sessions expire after 6 hours
  and are not persisted; the UI nudges (never gates) towards signing up.
- **Feed management** — add by URL with preview/validation, edit title and
  category, remove with confirmation, health status (active / stale 30+ days /
  error), last-successful-fetch time.
- **Parsing** — RSS 2.0, Atom 1.0, RSS 1.0/RDF; UTF-8 / ISO-8859-1 /
  Windows-1252; HTML-entity normalisation; missing optional fields; mixed date
  formats; malformed XML recovered where possible. Article HTML is sanitised.
- **Browsing** — reverse-chronological timeline, filter by feed/category,
  per-feed and per-category counts, paginated loading, source favicon/colour.
- **Categories** — create, rename, delete (feeds become Uncategorized),
  reorder, unread counts.
- **Read / unread** — mark on open, toggle manually, mark all read per feed,
  category or globally.
- **Reader view** — in-app article view with metadata, link to the original,
  next/previous navigation.
- **Error handling** — timeouts (10 s), permanent vs temporary failures,
  exponential backoff, manual retry, health overview; one slow feed never
  blocks the others.
- **Responsive** layouts with collapsible navigation.

**Stretch**

- Bookmarks ("Saved") with sort and search, full-text search with highlighted
  terms and feed/category/date filters, recent searches.
- OPML import (with preview and duplicate flagging) and export (categories
  preserved).
- Manual and auto refresh (15 min / 30 min / 1 h / manual), per-feed refresh,
  "new items" banner, conditional requests (ETag / Last-Modified).
- Keyboard navigation (`j`/`k`, `o`/`Enter`, `s`, `m`, `g` then `h`/`s`/`f`,
  `/`, `?`) and a `Ctrl/Cmd + K` command palette.

**Design challenges (product decisions made here)**

- **Onboarding / discovery** — starter packs and feed lookup for new users.
- **Digest** — "what you missed" view since your previous visit.
- **Layouts** — selectable list / compact / card density.

## Stack

FastAPI + SQLAlchemy (SQLite by default, `DATABASE_URL` for PostgreSQL),
httpx + lxml for fetching/parsing, nh3 for HTML sanitising; React 19,
TypeScript (strict), Tailwind CSS 4, Vite. The backend serves the built
frontend when `frontend/dist` exists.

> **Documented deviation.** The challenge recommends a hosted database and auth
> provider (e.g. Supabase). This app follows the rest of the SynapseHub suite
> instead: its own FastAPI backend with a real SQL database and real
> authentication — no localStorage-only persistence.

## Run it

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn app.main:app --port 8024

cd ../frontend
npm install && npm run dev        # http://localhost:5189 → :8024
```

Single-process production style: `npm run build` in `frontend/`, then run
uvicorn only; it serves the SPA and the API on one port.

Environment variables (all optional): `DATABASE_URL`, `FRONTPAGE_DATA_DIR`,
`FRONTPAGE_COOKIE_SECURE=1` (set behind HTTPS), `FRONTPAGE_FETCH_TIMEOUT`,
`FRONTPAGE_DEV_EXPOSE_RESET=1` (local demos only).

## Tests

```bash
cd backend && python3 -m pytest -q    # 67 tests (parser, API, OPML, security)
cd frontend && npm test               # 7 tests
cd frontend && npm run build          # typecheck + production build
```

## Known limitations

- **Password-reset email is not sent.** No email provider is configured, so
  reset links are written to the server log. Wire a provider before real use.
- **Not deployed.** No live URL exists yet, and **no Lighthouse scores have
  been measured** — none are claimed here.
- Guest feeds are fetched live; with no network access the guest dashboard
  loads its 19 subscriptions but shows no articles until a refresh succeeds.
- Fetching private/loopback addresses is blocked on purpose (SSRF protection).
- Screenshots pending capture — not fabricated.
