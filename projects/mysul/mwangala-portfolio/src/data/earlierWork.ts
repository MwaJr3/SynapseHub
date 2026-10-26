// Earlier work: case studies ported from the original standalone Mwangala static
// portfolio (projects/mysul/mwangala/js/projects.js). Kept in this dedicated module —
// deliberately separate from src/data/projects/ so the current project registry and its
// pinned tests are unaffected. Content is faithful to the archived source; GitHub links
// were never configured for these projects, so they stay honestly unavailable.

export interface EarlierStackEntry {
  name: string;
  desc: string;
}

export interface EarlierProject {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  status: string;
  difficulty: string;
  description: string;
  technologies: string[];
  features: string[];
  problem: string;
  objective: string;
  solution: string;
  architecture: string[];
  techStack: EarlierStackEntry[];
  decisions: string[];
  security: string[];
  testing: string[];
  challenges: string[];
  lessons: string[];
  future: string[];
}

export const earlierProjects: EarlierProject[] = [
  {
    id: "sentinellog",
    slug: "sentinellog",
    name: "SentinelLog",
    tagline: "Security Log Analyzer",
    category: "Cybersecurity · Security Monitoring",
    status: "Complete",
    difficulty: "Beginner – Intermediate",
    description: "A Python-powered security monitoring application that analyzes authentication and application logs, identifies suspicious patterns, and produces structured security reports.",
    technologies: ["Python", "FastAPI", "React", "TypeScript", "SQLite / PostgreSQL", "Pandas"],
    features: ["Log ingestion (.log, .txt, .csv)", "Authentication analysis", "Configurable detection rules", "Suspicious-pattern identification", "Severity grouping & timelines", "JSON / CSV security reports"],
    problem: "Small teams and students learning security monitoring have plenty of raw authentication logs but no practical way to turn them into structured, reviewable findings. Manual review does not scale and misses repeated-failure patterns.",
    objective: "Build a working log-analysis application that ingests common auth-log formats, normalises events, applies transparent detection rules, and produces reports an analyst can actually investigate — while never claiming a pattern proves an attack.",
    solution: "SentinelLog parses uploads into structured events (timestamp, user, source IP, event type, outcome), aggregates them by user/IP/time, runs configurable threshold rules over sliding windows, and records every detection with its triggering rule, evidence, severity, and recommended investigation steps.",
    architecture: ["Upload & validation (type, size, encoding)", "Parser (auth-log formats, CSV, error quarantine)", "Normalised event store", "Detection-rule engine (thresholds + time windows)", "Aggregation & timelines", "Reports (JSON / CSV export)"],
    techStack: [
      { name: "Python + FastAPI", desc: "Ingestion, parsing, detection engine, REST API." },
      { name: "React + TypeScript", desc: "Dashboard, event explorer, rule builder, charts." },
      { name: "SQLite / PostgreSQL", desc: "Users, datasets, events, rules, reports." },
      { name: "Pandas", desc: "Grouping, time-bucketing, frequency analysis." },
    ],
    decisions: ["Rules are plain threshold-plus-window definitions so every alert is explainable.", "Malformed lines are quarantined with reasons instead of silently dropped.", "Datasets are user-isolated; every protected operation checks ownership server-side.", "Exports embed dataset reference + generation time for reproducibility."],
    security: ["Uploads treated as untrusted: type/size validated, never executed, filenames sanitised.", "Private logs isolated per user; authorisation enforced on the server, not the UI.", "Passwords hashed with an established algorithm; sessions handled securely.", "Application security events recorded; demo data is synthetic and labelled simulated."],
    testing: ["Parser tests: valid formats, malformed lines, CSV edge cases.", "Rule tests: threshold boundaries, window edges, enable/disable.", "Authorisation tests: cross-user access denied.", "Report tests: counts reconcile with stored events."],
    challenges: ["Auth logs vary widely, so the parser needed a strict core plus graceful fallback.", "Sliding-window counting had to stay correct at window boundaries.", "Keeping every detection explainable without overloading the analyst."],
    lessons: ["How to model security events as data before writing any detection logic.", "Why transparent, boring rules beat clever black boxes for learning.", "That log analysis is mostly data cleaning plus careful counting."],
    future: ["Syslog/CEF parsers and scheduled imports.", "Allow-listed baselines per user to reduce noise.", "Rule packs with versioned documentation.", "PostgreSQL + background jobs for large files."],
  },
  {
    id: "fileguard",
    slug: "fileguard",
    name: "FileGuard",
    tagline: "File Integrity Monitoring System",
    category: "Cybersecurity · Defensive Security",
    status: "Complete",
    difficulty: "Beginner – Intermediate",
    description: "A defensive security application that establishes file-integrity baselines using cryptographic hashes and detects changes, additions, and missing files.",
    technologies: ["Python", "FastAPI", "React", "TypeScript", "SHA-256", "SQLite / PostgreSQL"],
    features: ["Monitoring workspaces", "SHA-256 file hashing", "Versioned integrity baselines", "Changed / missing / new detection", "Scan history & file timelines", "Manifest download + JSON / CSV reports"],
    problem: "Developers and students hear 'verify integrity' but rarely practise it: there is no simple tool that shows what a baseline is, how hashing detects change, and what a finding actually means.",
    objective: "Build an honest file-integrity monitor: register files, snapshot trusted hashes, re-scan, and explain every difference — without claiming to scan whole computers or detect malware.",
    solution: "FileGuard stores file metadata plus SHA-256 digests, versions baselines with timestamps, and compares current state against a chosen baseline to classify each file as matching, changed, missing, or newly registered, with a clear expected-vs-observed view.",
    architecture: ["Controlled upload workspace (validated, safely stored)", "Hashing service (SHA-256 via hashlib)", "Baseline store (versioned manifests)", "Comparison engine (match / changed / missing / new)", "Findings + review workflow", "Reports & manifest export"],
    techStack: [
      { name: "Python + FastAPI", desc: "Workspaces, baselines, scans, findings API." },
      { name: "hashlib (SHA-256)", desc: "Standard cryptographic hashing — nothing custom." },
      { name: "pathlib + safe storage", desc: "Generated internal IDs, no path traversal." },
      { name: "React + TypeScript", desc: "Workspaces, baselines, scan diffs, reports." },
    ],
    decisions: ["Browser demo operates only on files the user provides — no filesystem-access claims.", "Baselines are immutable versions; findings always cite which comparison produced them.", "Raw file contents are not exposed unnecessarily; hashes and metadata do the work.", "Severity is configurable per finding class with documented defaults."],
    security: ["Upload size/type validated; uploads never executed.", "Safe storage paths with generated identifiers; per-user authorisation.", "Baselines protected from silent modification; every scan is timestamped.", "A matching hash is presented as integrity-vs-baseline, never proof of safety."],
    testing: ["Hashing: known SHA-256 vectors.", "Baselines: versioning and immutability.", "Comparison: changed/missing/new/match matrix.", "Access control and report reconciliation."],
    challenges: ["Modelling 'new file' vs 'missing file' symmetrically across scans.", "Keeping the expected-vs-observed diff readable for large sets.", "Resisting every temptation to imply malware detection."],
    lessons: ["Integrity is a comparison against a protected baseline — the baseline's own protection is the whole game.", "Defensive tooling earns trust through precise, limited claims.", "Good findings read like evidence, not alarms."],
    future: ["Scheduled scans and signed baseline manifests.", "Directory-tree views and ignore rules.", "Integration export feeding SentinelCore as an event source.", "PostgreSQL deployment profile."],
  },
  {
    id: "dependsecure",
    slug: "dependsecure",
    name: "DependSecure",
    tagline: "Python Dependency Vulnerability Auditor",
    category: "Cybersecurity · Application Security",
    status: "Complete",
    difficulty: "Intermediate",
    description: "A software supply-chain security application that helps developers identify known vulnerabilities associated with Python dependencies and track remediation.",
    technologies: ["Python", "FastAPI", "React", "TypeScript", "pip-audit", "SQLite / PostgreSQL"],
    features: ["Project & manifest management", "requirements.txt + pyproject.toml parsing", "pip-audit integration (where permitted)", "Advisory tracking with sources", "Remediation workflow & risk exceptions", "Scan history + JSON / CSV reports"],
    problem: "Python projects accumulate dependencies, and known vulnerabilities hide in pinned versions. Developers need a calm workflow: see what is installed, what is reported, and what was decided about each finding.",
    objective: "Build a supply-chain auditing workflow that parses manifests safely (never installing them), runs an established auditor where the environment permits, and tracks each finding from Open to Resolved or Accepted Risk.",
    solution: "DependSecure validates manifests, resolves package names and versions, invokes pip-audit with timeouts and safe argument handling, preserves raw structured results, and layers an analyst workflow (notes, assignees, statuses, risk-exception reasons) strictly separated from scanner output.",
    architecture: ["Manifest upload + validation", "Parsers (requirements.txt, pyproject.toml)", "Audit runner (pip-audit, timeouts, no shell interpolation)", "Finding store (raw result preserved)", "Remediation workflow (status, notes, exceptions)", "Reports (JSON / CSV)"],
    techStack: [
      { name: "Python + FastAPI", desc: "Projects, manifests, scan orchestration, API." },
      { name: "pip-audit", desc: "Established auditing tool; network failures handled explicitly." },
      { name: "Manifest parsers", desc: "packaging/requirements parsing without executing code." },
      { name: "React + TypeScript", desc: "Projects, findings, remediation boards, reports." },
    ],
    decisions: ["Never install uploaded projects or execute their code to inspect a manifest.", "Subprocesses use argument vectors, timeouts, and controlled environments.", "Raw scan JSON is preserved for reproducibility and debugging.", "Scanner findings and analyst conclusions live in separate fields — always."],
    security: ["Upload limits, format validation, no shell construction from input.", "Per-user project isolation enforced server-side.", "Secrets in environment config, never source.", "Advisory sources documented; offline/scanner-down states are explicit, never silent."],
    testing: ["Manifest validation and unsupported-format handling.", "Result parsing and severity normalisation.", "Timeout handling and scan-failure vs clean-scan distinction.", "Authorisation and remediation state transitions."],
    challenges: ["Manifests are messier than they look (extras, markers, poetry vs PEP 621).", "Scanner unavailability had to be a first-class state, not an error page.", "Keeping demo findings honest: illustrative IDs, never invented CVEs."],
    lessons: ["Supply-chain security is mostly bookkeeping done rigorously.", "Separating observation (scanner) from judgement (analyst) clarifies everything.", "Timeouts and raw-result preservation are features, not chores."],
    future: ["Background scan queue with progress streaming.", "SBOM export (CycloneDX) and lockfile diffing.", "Policy gates (fail CI on critical) with documented rules.", "Feed results into SentinelCore as findings events."],
  },
  {
    id: "campusflow",
    slug: "campusflow",
    name: "CampusFlow",
    tagline: "University Management System",
    category: "Python Development · Full-Stack",
    status: "Complete",
    difficulty: "Intermediate",
    description: "A full-stack university management platform for managing students, lecturers, courses, enrolments, and academic records.",
    technologies: ["Python", "Django", "PostgreSQL", "HTML", "Tailwind CSS", "pytest"],
    features: ["Role-based access (Admin / Lecturer / Student)", "Student & lecturer records", "Courses, assignments & enrolments", "Assessments, weighting & grade boundaries", "Course rosters & performance summaries", "Exportable academic reports"],
    problem: "Academic administration is relational by nature — students, courses, enrolments, marks — yet many student projects model it with spreadsheets or disconnected forms, losing constraints and auditability.",
    objective: "Build a correct relational academic system: constrained enrolments, weighted assessments, configurable grading, and role-based access enforced on the backend.",
    solution: "CampusFlow models students, lecturers, courses, enrolments, assessments, and results with database constraints (unique IDs, no duplicate enrolments), computes totals from explicit weights and published grade boundaries, and gates every operation by role — admins manage, lecturers assess their courses, students read their own records.",
    architecture: ["Django auth + role permissions", "Relational models (students, staff, courses, enrolments, assessments, results)", "Constraint layer (uniqueness, enrolment rules, weight validation)", "Grading engine (weights → totals → published boundaries)", "Reports (rosters, summaries, exports)", "Admin dashboard + audit trail"],
    techStack: [
      { name: "Python + Django", desc: "Auth, ORM, migrations, admin, permissions." },
      { name: "PostgreSQL (SQLite dev)", desc: "Relational integrity with constraints." },
      { name: "Templates + Tailwind", desc: "Clean academic dashboard, tables, forms." },
      { name: "pytest", desc: "Permissions, CRUD, enrolment rules, grade math." },
    ],
    decisions: ["Django chosen for integrated auth/admin/migrations over assembling equivalents.", "Duplicate-enrolment prevention lives in constraints, not just form checks.", "Grade boundaries are data, not code — every report shows the rules used.", "Published results are guarded against unauthorised modification."],
    security: ["Backend permission checks on every operation; UI hiding is cosmetic only.", "Students can only read their own records; lecturers only their courses.", "Sensitive records protected; seeded demo data is fictional.", "Validation + transactions keep academic records consistent."],
    testing: ["Auth and role matrix tests.", "Enrolment validation and duplicate attempts.", "Weighted-total and boundary-grade calculations.", "Unauthorised-access attempts across roles."],
    challenges: ["Getting the enrolment state machine right (enrol, update, remove, re-enrol).", "Weight validation (must total 100) with clear errors.", "Different institutions grade differently — hence configurable boundaries."],
    lessons: ["Relational modelling repays upfront thought enormously.", "Constraints are documentation that the database enforces.", "Role design is a security feature, not a UI preference."],
    future: ["Semester scheduling and prerequisite chains.", "Transcript generation (PDF) with verification codes.", "Bulk CSV import with row-level error reports.", "Notification workflow for published results."],
  },
  {
    id: "circuitlab-calc",
    slug: "circuitlab-calc",
    name: "CircuitLab Calc",
    tagline: "Electrical Engineering Calculator",
    category: "Python · Engineering",
    status: "Complete",
    difficulty: "Intermediate",
    description: "A mathematical engineering application for solving common electrical engineering calculations with transparent formulas, units, assumptions, and results.",
    technologies: ["Python", "FastAPI", "React", "NumPy", "SymPy", "SQLite / PostgreSQL"],
    features: ["Ohm's law & power solvers", "Series / parallel networks", "Voltage divider (unloaded model)", "Supported Kirchhoff 2-mesh solver", "Unit conversion", "Workspaces + calculation history"],
    problem: "Introductory circuit problems are easy to get wrong silently: dropped units, divided-by-zero, or forgotten assumptions. Generic calculators show answers without showing reasoning.",
    objective: "Build calculators that show the formula, the substitution steps, the units, and the assumptions — and refuse implausible inputs with clear explanations. Never present approximations as exact.",
    solution: "CircuitLab Calc implements each module as a pure, tested function (inputs → validated quantities → result + steps + assumptions), keeps calculation logic independent of the web layer, and stores saved work with full context: inputs, formulas, assumptions, outputs, timestamps.",
    architecture: ["Pure calculation core (tested independently)", "Validation layer (units, zero/negative/implausible handling)", "Step explainer (formula → substitution → result)", "Workspace & history store", "Reference notes (assumptions, limitations)", "Export (calculation summaries)"],
    techStack: [
      { name: "Python + FastAPI", desc: "Calculation API, workspaces, history." },
      { name: "NumPy / SymPy", desc: "Numerical and symbolic computation where apt." },
      { name: "React + TypeScript", desc: "Module UIs, diagrams, step views." },
      { name: "SQLite / PostgreSQL", desc: "Users, workspaces, saved calculations." },
    ],
    decisions: ["Calculation functions are pure and UI-independent so pytest covers them directly.", "Every result carries units + assumptions; no naked numbers.", "Kirchhoff support is scoped to documented 2-mesh cases with explicit sign conventions.", "Visitors may try samples; saving requires authentication."],
    security: ["Inputs validated as quantities with ranges, not raw floats.", "Per-user workspaces; authorisation on save/read/delete.", "No expression eval() anywhere — parsers only.", "Exports contain only the owner's saved context."],
    testing: ["Independently checked worked examples per module.", "Edge cases: zero, negative, missing, implausible.", "Division-by-zero and underdetermined-circuit handling.", "Unit-conversion round trips and persistence/auth tests."],
    challenges: ["Sign conventions for mesh analysis had to be documented before coding.", "Keeping step explanations correct for every input combination.", "Drawing the line: an educational tool, not SPICE."],
    lessons: ["Engineering software is about assumptions management as much as math.", "Tested pure functions make the web layer almost boring — in a good way.", "Transparency (steps + units) is the feature."],
    future: ["AC phasor basics and RC/RL transient sketches.", "More topologies with per-topology assumption cards.", "Printable lab-style calculation sheets.", "Symbolic derivations via SymPy for selected modules."],
  },
  {
    id: "chessscope",
    slug: "chessscope",
    name: "ChessScope",
    tagline: "Chess Game Analyzer",
    category: "Python · Data Analysis",
    status: "Complete",
    difficulty: "Intermediate",
    description: "A Python application that analyzes chess games, extracts performance statistics, and helps players identify patterns across their games.",
    technologies: ["Python", "FastAPI", "React", "python-chess", "Pandas", "SQLite / PostgreSQL", "Stockfish (optional)"],
    features: ["PGN import (multi-game, validated)", "Move-by-move board review", "Opening & results statistics", "Material / capture / check analytics", "Collections, tags & notes", "Optional Stockfish analysis when configured"],
    problem: "Club players accumulate PGNs but rarely convert them into insight: which openings score, how results split by colour, where games are typically decided.",
    objective: "Build a deterministic-first game analyzer: parse PGNs robustly, compute honest descriptive statistics, and offer engine analysis only when a real engine is configured — heuristics are never labelled as engine truth.",
    solution: "ChessScope validates and stores games, replays them move-by-move on a board, and computes opening summaries, material/capture/check frequencies, length distributions, and results-by-opening/colour, with filters by date, colour, opening, opponent, and result.",
    architecture: ["PGN import + validation (malformed-safe)", "Game store (metadata, moves, tags, notes)", "Replay engine (board positions per ply)", "Descriptive analytics (Pandas aggregations)", "Optional engine adapter (Stockfish when present)", "Dashboards, collections, exports"],
    techStack: [
      { name: "python-chess", desc: "Parsing, legal move sequences, board logic." },
      { name: "Python + FastAPI", desc: "Library, analytics, collections API." },
      { name: "Pandas", desc: "Aggregations for openings, colours, trends." },
      { name: "Stockfish (optional)", desc: "Used only when installed; absence is a normal state." },
    ],
    decisions: ["Deterministic stats first; engine features degrade gracefully to fully-working non-engine mode.", "Heuristic labels are explicitly marked heuristic — no 'blunder' claims without validated analysis.", "Malformed PGNs produce per-record errors, never crashes.", "Charts only where they explain something a table cannot."],
    security: ["Upload validation (size, encoding, game-count caps).", "Per-user libraries and notes; server-side ownership checks.", "Engine subprocess (when used) sandboxed with timeouts.", "Sample games are synthetic/labelled, not presented as the user's."],
    testing: ["PGN parsing incl. multi-game and malformed inputs.", "Statistic correctness on hand-verified games.", "Access-control and persistence tests.", "Engine adapter: configured/missing/timeout states."],
    challenges: ["PGN in the wild is messy: comments, variations, NAGs, odd results.", "Keeping heuristic classifications visibly heuristic.", "Board replay must stay in sync with the move list at every ply."],
    lessons: ["Descriptive analytics done honestly beats flashy mislabelled 'insights'.", "Graceful degradation is a design discipline, not an afterthought.", "Good filters multiply the value of every statistic."],
    future: ["Configurable Stockfish depth/time with eval charts.", "Repertoire builder from opening stats.", "Mistake-pattern views backed by engine thresholds.", "Shareable annotated game links."],
  },
  {
    id: "sentinelcore",
    slug: "sentinelcore",
    name: "SentinelCore",
    tagline: "Mini-SIEM Security Dashboard",
    category: "Cybersecurity · Security Engineering",
    status: "Complete",
    difficulty: "Advanced",
    description: "A security monitoring platform that ingests events, normalizes security data, applies detection rules, correlates related events, and supports incident investigation.",
    technologies: ["Python", "FastAPI", "React", "TypeScript", "SQLite / PostgreSQL", "Pandas"],
    features: ["Event ingestion (CSV, JSON, auth logs)", "Normalization + validation quarantine", "Configurable detection rules", "Alert correlation & timelines", "Incident management + analyst notes", "RBAC + audit logging + reports"],
    problem: "SentinelLog proved single-source analysis; real defence needs many sources normalised into one model, with rules, correlation, and an investigation workflow that separates observations from conclusions.",
    objective: "Build a mini-SIEM: modular ingestion, a common event schema, transparent rules, alert correlation, incident management with audit logging — explicitly not a commercial SIEM replacement.",
    solution: "SentinelCore previews and validates imports, normalises them into a common event structure, runs documented threshold/window rules, groups related alerts with timelines, and manages incidents (New → Investigating → Resolved → Closed) with notes, assignees, actions, and full audit history.",
    architecture: ["Security events → ingestion (CSV / JSON / auth logs)", "Validation + preview (quarantine failures)", "Normalization (common schema)", "Detection rules (thresholds + windows)", "Correlation (grouped alerts + timelines)", "Alerts → incidents (workflow + notes + audit)", "Reports (JSON / CSV)"],
    techStack: [
      { name: "Python + FastAPI", desc: "Ingestion, rules, correlation, incidents, RBAC API." },
      { name: "React + TypeScript", desc: "SOC dashboard: explorer, alerts, incidents, reports." },
      { name: "SQLite / PostgreSQL", desc: "Events, rules, alerts, incidents, audit log." },
      { name: "Pandas", desc: "Windowing, grouping, trend aggregation." },
    ],
    decisions: ["Every import is previewable; malformed rows are inspectable, never silent.", "Rules carry purpose + limitations docs; matches are candidates, not verdicts.", "Correlation groups evidence; it never claims causation.", "Original detections are immutable; analyst conclusions are separate, timestamped records."],
    security: ["Imports treated as untrusted: size/time caps, never executed.", "RBAC (Admin / Analyst / Viewer) enforced on the backend.", "Rule and incident mutations require permission and are audit-logged.", "No credentials in source; access-controlled exports."],
    testing: ["Ingestion + normalisation incl. malformed rows.", "Each rule's trigger/no-trigger boundaries.", "Correlation grouping and incident transitions.", "Auth matrix, audit coverage, report generation."],
    challenges: ["Designing one schema that fits CSV, JSON, and auth logs without loss.", "Correlation that helps without inventing stories.", "Keeping analyst workflow fast while logging everything."],
    lessons: ["A SIEM is 80% data plumbing and workflow, 20% detection.", "Immutability of observations is what makes investigations trustworthy.", "Constraints (roles, audit, quarantine) are the product."],
    future: ["Documented connectors for SentinelLog / FileGuard / DependSecure finding formats.", "Scheduled ingestion and rule-pack versioning.", "Alert suppression / tuning with justification trails.", "PostgreSQL + background workers for scale."],
  },
];
