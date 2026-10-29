---
name: verify-tessera
description: >
  Reproduce every claim Tessera's README makes, from a clean checkout, in the
  order that catches breakage earliest. Use before claiming a change is done,
  after touching the learner model, the scheduler, the competency model or the
  migrations, or when a reviewer asks "does this actually run?".
---

# Verify Tessera

Five layers, cheapest first. Each command below has been run in this repository;
the expected output is what it produced, not what it should produce. If a number
here disagrees with the code, the skill is stale and the skill is wrong.

Do not report success from a layer you skipped. A green unit suite says nothing
about migrations, a green migration says nothing about the server, and a green
build says nothing about the API.

## 1. Suites (about 60 s)

```sh
cd companies/tamuzi/tessera/backend  && python3 -m pytest -q          # 308 passed, 7 skipped
cd companies/tamuzi/tessera/frontend && npm test && npm run build      # 85 passed in 7 files, tsc + vite
```

The 7 skips are `tests/test_postgres.py`, which refuses to pass without a server.
That is the correct behaviour: layer 3 is where they run.

`npm test` at `apps/` runs the whole workspace; run it from
`companies/tamuzi/tessera/frontend` to keep it scoped.

## 2. Schema, SQLite (about 15 s)

The migration history, not `create_all()`, is the source of truth.

```sh
cd companies/tamuzi/tessera/backend
rm -f /tmp/verify.db
DATABASE_URL=sqlite:////tmp/verify.db python3 -m alembic upgrade head   # 4 revisions
DATABASE_URL=sqlite:////tmp/verify.db python3 -m alembic check          # "No new upgrade operations detected."
```

`alembic check` failing means a model changed without a revision. Do not delete
the test that says so; write the revision.

A SQLite migration runs with foreign keys suspended, because Alembic's batch mode
rebuilds tables by dropping them and `ON DELETE CASCADE` would empty the children
first. The migration then checks `PRAGMA foreign_key_check` and commits. If you
see dangling keys reported, the migration is wrong, not the pragma.

## 3. PostgreSQL, live (about 30 s)

Only run this if you are willing to report what it says. It is the layer that
found five `json` columns and zero CHECK constraints.

```sh
pip install --user --break-system-packages pgserver alembic psycopg2-binary
python3 - <<'PY'
import pathlib, pgserver, psycopg2
srv = pgserver.get_server(pathlib.Path("/tmp/pgdata"), cleanup_mode=None)
print(srv.get_uri())          # postgresql://postgres:@/postgres?host=/tmp/pgdata
admin = psycopg2.connect(host="/tmp/pgdata", user="postgres", dbname="postgres")
admin.set_isolation_level(0)
admin.cursor().execute("create database tessera")   # fails harmlessly if it exists
PY

cd companies/tamuzi/tessera/backend
export DATABASE_URL='postgresql+psycopg2://postgres:@/tessera?host=/tmp/pgdata'
python3 -m alembic upgrade head        # 4 revisions, PostgreSQL 16.2
python3 -m alembic check               # "No new upgrade operations detected."
python3 -m app.seed                    # 10 concepts / 20 questions / 9 sources
python3 -m pytest -q                   # 308 passed + the 7 live-server tests = 315
```

Then inspect the server, not the models:

```python
import psycopg2
c = psycopg2.connect(host="/tmp/pgdata", user="postgres", dbname="tessera").cursor()
c.execute("select table_name, column_name, data_type from information_schema.columns "
          "where table_schema='public' and data_type in ('json','jsonb')")
c.fetchall()   # 5 rows, all 'jsonb' — any 'json' is a regression
c.execute("select conname from pg_constraint where contype='c' order by 1")
len(c.fetchall())   # 21 named checks from the two stage-4 revisions
```

`pgserver`'s own `db.psql()` always connects to the `postgres` database, so it
reports zero tables for a schema built in `tessera`. Use `psycopg2` with
`dbname="tessera"`, as above.

The opt-in file is the repeatable version of all of it:

```sh
TESSERA_POSTGRES_URL='postgresql+psycopg2://postgres:@/scratch?host=/tmp/pgdata' \
  python3 -m pytest tests/test_postgres.py -q      # 7 passed
```

It creates a uniquely named database, migrates it, checks `jsonb`, checks the 21
constraints by name, refuses a raw `INSERT` of `score = 1.4`, round-trips the last
revision, and drops the database.

## 4. A real server and the product claims (about 90 s)

```sh
cd companies/tamuzi/tessera/backend
rm -rf /tmp/verify-data && mkdir -p /tmp/verify-data
DATABASE_URL=sqlite:////tmp/verify-data/t.db TESSERA_DATA_DIR=/tmp/verify-data \
  python3 -m alembic upgrade head
DATABASE_URL=sqlite:////tmp/verify-data/t.db TESSERA_DATA_DIR=/tmp/verify-data \
  python3 -m app.seed                       # 10 concepts, 20 questions, 9 sources
DATABASE_URL=sqlite:////tmp/verify-data/t.db TESSERA_DATA_DIR=/tmp/verify-data TESSERA_DEMO_BASELINE=1 \
  python3 -m uvicorn app.main:app --port 8024
```

Then, with the cookie jar from registration:

| Check | Expected |
| --- | --- |
| `GET /api/review` as a new account | `overdue_count 0`, an `empty_state` sentence, `recovery.active false` |
| Answer one question, then `GET /api/review` | still nothing due; the concept appears in `upcoming` |
| `GET /api/review/py.variables/prompt?format=cloze` | `_____` in the prompt, **no** `expected` field |
| `GET .../prompt?format=free_recall` | `criteria` empty and `criteria_hidden true`; add `&reveal=true` and 5 criteria appear |
| `POST /api/review/attempts` with a wrong word | `score 0.0`, and the response *then* names the expected term |
| `POST /api/review/attempts` with `checked: []` | `201`, `score 0.0` — an honest zero is accepted, not blocked |
| Second account, same prompt id | `404` |
| `GET /api/competency` on a new account | every row `no_evidence`, `evidence.score null`, `counts.without_evidence == counts.concepts`, one `unmeasured_axes` gap |
| Answer 3 questions correctly, then `GET /api/competency` | that concept is `secure`, `auto 3`, `effective 3.0`, and `mastery` is a **separate** value |
| Practise `free_recall` with `checked: []` | that concept's newest observation has `weight 0.5` and `graded_by self`; a `self_graded_only` gap appears |
| `POST /api/profile/assessments/{id}/reassess` with one changed axis | `201`; `previous.archived true`, `previous.replaced_by` = the new id, the diff has `delta` only where both sides had a number |
| Reassess the **same** row again | `409`, `detail.current_id` is the successor |
| Second learner reassessing that row, or reading its history | `404` |

## 5. The scheduler claim

```sh
cd companies/tamuzi/tessera/backend && python3 -m app.evals.recall_eval
```

Expected, seed 7, 200 items, 90 days, 12 reviews per item allowed:

```
strategy    recall  reviews  per item
tessera      0.756     2200      11.0
fixed_7      0.430     2200      11.0
broken       0.073      200       1.0
```

The point is the equal `per item` column: placement, not frequency. `broken` must
stay below the threshold `tessera` passes; if it ever passes, the metric is wrong.

## What this does not verify

- **No model provider has ever been reached from the build environment.** The
  tutor's presets are configuration; a preset is not a connection.
- **The simulator is not a learner.** The eval compares two models; it does not
  measure human memory. For the same reason, the competency thresholds (3.0
  observations at 0.80, 30-day half-life, 0.25 disagreement band) are a stated
  policy, not a validated one.
- **PostgreSQL has been run on one local server, not a deployment.** No network
  server, TLS, pooling under load, backups, or `docker-compose.yml` (no Docker in
  this environment).
- **A reassessment is still a self-report.** The diff is auditable; the numbers are
  not measured.
- **No browser has rendered these screens.** UI behaviour is asserted in jsdom;
  layout, contrast, focus order and animation are reasoned about, not observed.
