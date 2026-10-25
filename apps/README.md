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
| [chessscope](chessscope/) | ChessScope (Velaqori) | :8005 | :5178 | 16 + 3 | complete |
| [sentinelcore](sentinelcore/) | SentinelCore (Velaqori, flagship) | :8006 | :5179 | 17 + 3 | complete |
| [learnbridge](learnbridge/) | LearnBridge (Tamuzi) | :8007 | :5180 | 15 + 2 | complete |
| [pathwise](pathwise/) | PathWise (Tamuzi) | :8008 | :5181 | 11 + 3 | complete |
| [tutorspring](tutorspring/) | TutorSpring (Tamuzi) | :8009 | :5182 | 10 + 3 | complete |
| [teachcraft](teachcraft/) | TeachCraft (Tamuzi) | :8010 | :5183 | 9 + 2 | complete |
| [learnpulse](learnpulse/) | LearnPulse (Tamuzi) | :8011 | :5184 | 8 + 2 | complete |
| [classconnect](classconnect/) | ClassConnect (Tamuzi) | :8012 | :5185 | 9 + 3 | complete |
| [openlearn-commons](openlearn-commons/) | OpenLearn Commons (Tamuzi) | :8013 | :5186 | 9 + 4 | complete |
| [reachlearn](reachlearn/) | ReachLearn (Tamuzi) | :8014 | :5187 | 11 + 3 | complete |
| [eduaccess](eduaccess/) | EduAccess (Tamuzi) | :8015 | :5188 | 9 + 3 | complete |
| [tessera](tessera/) | Tessera (Tamuzi, adaptive engine) | :8024 | :5197 | 132 + 18 | complete |

Each `README.md` documents setup, demo credentials, test commands, and the
app's honesty/limitation statements. Backend seeds run with
`python3 -m app.seed` and label all demo data as simulated.

> Honesty note that applies suite-wide: analytical output (detections, scans,
> flags, alerts) marks patterns **for review** — it is never presented as proof
> of an attack or of safety, and missing data is reported as missing.

## Web app ports (this campaign)

| App | Backend port | Frontend port |
|-----|--------------|---------------|
| authgate | 8016 | 5189 (server-rendered UI on 8016) |
| quizarena | 8017 | 5190 (server-rendered UI on 8017) |
| prepwise | 8018 | 5191 (server-rendered UI on 8018) |
| shopdeck | 8019 | 5192 (server-rendered UI on 8019) |
| creadesk | 8020 | 5193 (server-rendered UI on 8020) |
| docsage | 8021 | 5194 (server-rendered UI on 8021) |
| stockmate | 8022 | 5195 (server-rendered UI on 8022) |
| secops-dash | 8023 | 5196 (server-rendered UI on 8023) |
| tessera | 8024 | 5197 |

The 8 apps above are FastAPI + server-rendered HTML + small JS (the catalogue
permits simpler interfaces where they teach the same concepts); their UIs run
on the backend port directly (`uvicorn app.main:app --port <backend>`).
