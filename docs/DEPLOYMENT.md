# Deploying Tessera

Stage 6 adds the production build: one container serving the API, the compiled
frontend and the migrations, with a preflight that refuses an unsafe configuration.

**What has been executed here:** the image's *contents* are checked by tests
(`apps/tessera/backend/tests/test_deployment.py`), the migrations have been run
against a real PostgreSQL server, and the whole test suite passes on both engines.
**What has not:** `docker build` and `docker compose up`, because this environment
has no Docker daemon. Nothing below is claimed to have been observed running except
where a command was actually run.

## The pieces

| Piece | Where | Notes |
| --- | --- | --- |
| Image | `apps/tessera/Dockerfile` | Two stages: Node builds the frontend, Python runs the API and serves the build |
| Compose | `apps/tessera/docker-compose.yml` | `db` (PostgreSQL 16) + `app`, app waits for the database healthcheck |
| Configuration | `apps/tessera/.env.example`, `apps/tessera/backend/.env.example` | Every variable the backend reads is documented; a test fails if that drifts |
| Preflight | `backend/app/preflight.py` | `python3 -m app.preflight [--json]`, exit 1 on any failure |
| Migrations | `backend/alembic/` | 7 revisions, head `b7d3e14f2c80` |

Build context is `apps/`, not the repository root, because the frontend is a
workspace of `apps/package.json`:

```bash
docker build -f apps/tessera/Dockerfile -t tessera apps/
```

## What the container does, in order

1. **`alembic upgrade head`** — the schema comes from the migration history. The
   app's own `create_all` is a SQLite convenience for a laptop and is never the
   deployment path; a deployment whose schema came from `create_all` is reported as a
   warning by the preflight rather than being mistaken for a migrated one.
2. **`python -m app.preflight`** — and the container **exits** if this fails. The
   checks are: the database is reachable; the schema is at head; the curriculum,
   quests and sources are present with a fix hint per missing table; the production
   settings are coherent; the frontend build is where it claims to be; the SQLite
   data directory (where SQLite is in use) is writable.
3. **`uvicorn` on 0.0.0.0:8024** with `--proxy-headers`, so the scheme a TLS proxy
   terminated is visible to the HSTS decision and to the session cookie.

## Configuration that matters

| Variable | Effect |
| --- | --- |
| `DATABASE_URL` | `postgresql://…` for anything real. A bare scheme is pinned to psycopg2, which the requirements ship |
| `TESSERA_PRODUCTION=1` | Secure session cookie, HSTS, and the preflight refuses SQLite or a localhost origin |
| `TESSERA_COOKIE_SECURE` | Defaults to the production flag. Set `0` only behind a proxy that terminates TLS |
| `TESSERA_COOKIE_SAMESITE` | `lax` (default), `strict`, or `none` — and `none` without `Secure` fails the preflight, because browsers reject that pair and learners would appear signed out on every request |
| `TESSERA_FRONTEND_DIR` | Where the built frontend lives. Set by the image; unset means the API is deployed alone |
| `ALLOWED_ORIGINS` | Only needed when the browser talks to the API from another origin. Same-origin serving needs none |
| `TESSERA_PLANNER_REDIRECT_URIS` | Exact match, comma-separated; the study planner's callback |

Secrets are never written into these files. `TESSERA_TUTOR_API_KEY` and
`TESSERA_PLANNER_CLIENT_*` come from the environment.

## The check an operator runs before announcing anything

```bash
cd apps/tessera/backend
DATABASE_URL=postgresql://… python -m app.preflight
```

Sample output against a database whose schema is at head and seeded:

```
ok    database           reachable at …/tessera
ok    schema revision    at head (b7d3e14f2c80)
ok    curriculum         10 rows
ok    quests             7 rows
ok    sources            9 rows
ok    production config  no problems found
ok    frontend build     /app/frontend-dist
12 checks: 12 ok, 0 warning(s), 0 failure(s)
```

Against an empty SQLite file it fails, and says what to run:

```
FAIL  schema revision    no alembic_version table …
                         → run `python3 -m alembic upgrade head` against this database
FAIL  curriculum         table unreadable: (sqlite3.OperationalError) no such table: concepts
                         → upgrade the schema
```

`--json` prints the same checks as objects, for a pipeline that wants to gate on
them instead of reading prose.

## Security headers

Set once, in `app/headers.py`, so a new route cannot forget them: `nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`,
`Cross-Origin-Opener-Policy: same-origin`, a restrictive `Permissions-Policy`, HSTS
only over TLS or in production, and a `Content-Security-Policy` on documents —
`default-src 'self'`, with `'unsafe-inline'` for styles only because React writes
`style` attributes. Tests assert the policy is present on HTML and absent on JSON.

## Serving the frontend from the API

`app/static_site.py` mounts the build. Three rules, each with a test:

- an unknown **API** path is still a JSON 404 — the fallback must not answer a client
  parsing JSON with an HTML document;
- a path that resolves outside the build directory is never served;
- `index.html` is `no-cache`, while hashed assets are served as they are.

## Known gaps

- **Not run in Docker.** The Dockerfile and compose file are reviewed by tests that
  read them (migrations before the server, preflight before uvicorn, a non-root user,
  a healthcheck, no secret in the file), but no image was built.
- **No live TLS termination** was exercised, so the Secure-cookie and HSTS behaviour
  is tested through configuration and request scheme, not through a real proxy.
- **Backups, log shipping, metrics and rate limiting at the edge** are deployment
  concerns that are not implemented anywhere in this repository.
