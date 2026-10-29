# companies/ — every product and build, filed under the company that publishes it

Two companies, one folder each. A directory's path names its owner, so ownership is
read from the tree rather than typed into a list that can disagree with it.

```
companies/
├── velaqori/    Velaqori Systems — cybersecurity, developer and engineering tooling
├── tamuzi/      Tamuzi Learning — learning platforms, campus operations, accessibility
├── package.json Workspace root: hoists the shared React/Vite toolchain
└── package-lock.json
```

## What is in each

Velaqori and Tamuzi each own **products** (they have a case study on the company
site) and **catalogue builds** (they have a `portfolio.json` card and are published
in the company site's `/catalogue`). Both are the company's work; the difference is
how they are presented, and `projects.json` records it as `kind`.

| Company | Directories | Products | Catalogue builds |
| --- | ---: | ---: | ---: |
| `velaqori/` | 43 | 13 products (17 directories — four exist as both a web app and a CLI) | 26 |
| `tamuzi/` | 20 | 12 products (12 directories) | 8 |

Which is which is recorded in `projects.json`, not here: that file is generated from
the tree and checked by `src/registry.test.ts`, so it cannot drift. This README
explains the arrangement; the registry states it.

## Why the catalogue builds are under a company

The 34 builds that were in `apps/` and owned by nobody were split by subject on
2026-10-29, at the owner's direction:

- **Tamuzi** — the build's primary user is a learner, a teacher, or an institution:
  `flashkit`, `gradeflow`, `prepwise`, `quizarena`, `quizbox`, `shelfwise`,
  `tessera`, `unicore`.
- **Velaqori** — security tooling and general engineering/utility builds: the other
  twenty-six.

The judgement calls worth re-checking, because they are judgement and not fact:
`prepwise` (interview preparation — career rather than school, filed with Tamuzi as
a learning tool), `unicore` (university administration — an institution, not a
learner), and `notekit` (personal knowledge management with lesson summaries —
filed with Velaqori as a general productivity tool). Moving any of them is a
`git mv` and one row in the registry.

## One CLI variant sits beside its product

Four products have both a web application and a CLI build of the same name. The CLI
takes the `-cli` suffix and records `variantOf` in the registry, so a slug names
exactly one directory:

```
companies/velaqori/phishlens/        the deployed product
companies/velaqori/phishlens-cli/    the catalogue build
```

## Running one

Each directory is self-contained. Frontends are npm workspaces of this folder, so
the shared toolchain is installed once:

```bash
cd companies
npm ci                    # installs every workspace

cd velaqori/phishlens/frontend
npm run dev               # proxies /api to the backend

cd ../backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8005
```

Backends that use SQLAlchemy run `alembic upgrade head` against `DATABASE_URL`
(SQLite by default, PostgreSQL for a real deployment). Every project ships
`.env.example` with no secrets.

Ports are allocated once and never reused: company products live in 5300–5399.
`projects.json` is the only place that records them.

## What is deliberately not here

- **`sites/portfolio/`** — the personal portfolio, published by neither company.
- **`coursework/cbu-assignments/`** — coursework.
- **`challenges/`** — the 60 interactive prototypes the portfolio renders.
- **`company-platform/`, `workniche/`, `vocal-separator/`** — standalone products
  at the repository root, each with its own build and deployment story.
