# apps/ — Portfolio application suite

Self-contained, working full-stack implementations of the portfolio products
built in this workspace. Each app is independent: its own backend, frontend,
examples, tests, and README.

**Common stack:** FastAPI + SQLAlchemy (SQLite by default, PostgreSQL-ready) +
React 19 / TypeScript (strict) / Tailwind CSS 4 / Vite. Auth uses DB-backed
cookie sessions with stdlib scrypt hashing. Demo data is **simulated and
fictional** and labelled as such in-product. Screenshots are pending capture —
never fabricated.

| App | Product | Backend | Frontend | Tests (API + UI) | Status |
| --- | --- | --- | --- | --- | --- |
| [sentinellog](sentinellog/) | SentinelLog (Velaqori) | :8000 | :5173 | 29 + 5 | complete |
| [fileguard](fileguard/) | FileGuard (Velaqori) | :8001 | :5174 | 16 + 3 | complete |
| [dependsecure](dependsecure/) | DependSecure (Velaqori) | :8002 | :5175 | 20 + 2 | complete |
| [campusflow](campusflow/) | CampusFlow (Tamuzi) | :8003 | :5176 | 19 + 2 | complete |
| [circuitlab-calc](circuitlab-calc/) | CircuitLab Calc (Velaqori) | :8004 | :5177 | 12 + 3 | complete |
| [chessscope](chessscope/) | ChessScope (Velaqori) | :8005 | :5178 | 12 + 3 | complete |
| [sentinelcore](sentinelcore/) | SentinelCore (Velaqori, flagship) | :8006 | :5179 | 17 + 3 | complete |
| [frontpage](frontpage/) | Frontpage (Frontend Mentor challenge) | :8007 | :5180 | 67 + 7 | complete |

Each `README.md` documents setup, demo credentials, test commands, and the
app's honesty/limitation statements. Backend seeds run with
`python3 -m app.seed` and label all demo data as simulated.

> Honesty note that applies suite-wide: analytical output (detections, scans,
> flags, alerts) marks patterns **for review** — it is never presented as proof
> of an attack or of safety, and missing data is reported as missing.
