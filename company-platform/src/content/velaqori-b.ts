/** Velaqori Systems — product catalogue 07–13. */
import type { ProductContent } from './types';

export const velaqoriProductsB: ProductContent[] = [
  {
    slug: 'threatintel-desk',
    name: 'ThreatIntel Desk',
    companySlug: 'velaqori-systems',
    category: 'Cybersecurity',
    categories: ['Cybersecurity', 'Data Analysis'],
    purpose:
      'Collects, normalizes, searches, and correlates indicators from configurable legitimate threat-intelligence sources.',
    summary:
      'A threat-intelligence aggregation platform: feed ingestion, indicator normalization and deduplication, source attribution, relationships, analyst notes, feed-health monitoring, and reports.',
    status: 'CASE_STUDY_ONLY',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed.',
    technologies: ['Python', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL', 'Background jobs'],
    features: [
      {
        title: 'Feed ingestion and normalization',
        description:
          'Configurable legitimate sources ingest into one indicator schema with source attribution preserved.',
      },
      {
        title: 'Deduplication and relationships',
        description:
          'Duplicate indicators merge with provenance intact; relationships link related indicators.',
      },
      {
        title: 'Feed-health monitoring',
        description:
          'Ingestion health (freshness, failures) is visible — stale feeds are a finding of their own.',
      },
      {
        title: 'Search, notes, and reports',
        description:
          'Analyst search over indicators, contextual notes, and report generation with provenance.',
      },
    ],
    keywords: ['threat intelligence', 'indicators', 'ioc', 'feeds', 'provenance'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. One indicator match does not prove a malicious event; feed coverage is bounded by configured sources.',
    featured: false,
    caseStudy: {
      title: 'ThreatIntel Desk: aggregation with provenance intact',
      problem:
        'Threat intelligence arrives from many legitimate feeds in different formats; the failure mode is a flat list of indicators with no memory of where each came from. ThreatIntel Desk was designed to collect, normalise, search, and correlate indicators from configurable sources — keeping attribution, confidence, and time metadata with every record, and making feed reliability itself visible.',
      users: [
        'Small security teams tracking relevant threats',
        'Analysts correlating indicators across sources',
        'Students practising intelligence-analysis discipline',
      ],
      constraints: [
        'Configured legitimate sources only',
        'Provenance mandatory on every indicator',
        'One match ≠ malicious event: the product must say so',
        'Feed staleness and failures surfaced, not hidden',
      ],
      solution:
        'ThreatIntel Desk ingests configured feeds through connector boundaries into a normalised indicator schema with deduplication that preserves all source attributions. Search and relationship views support pivoting; analyst notes attach context; feed-health monitoring shows ingestion freshness and failures; reports compile indicator sets with their provenance.',
      workflow: [
        {
          step: 'Ingest',
          description:
            'Connectors pull configured sources; records normalise with attribution, confidence, and time metadata where available.',
        },
        {
          step: 'Normalise',
          description:
            'Duplicates merge without losing provenance; relationships link indicators across sources.',
        },
        {
          step: 'Analyse',
          description:
            'Analysts search, pivot through relationships, and attach notes; matches are context, not verdicts.',
        },
        {
          step: 'Report',
          description:
            'Reports compile findings with source attribution and feed-health status.',
        },
      ],
      architecture:
        'A Python/FastAPI platform with connector plugins at a strict boundary (each source’s format stays in its connector), background processing for feed pulls, PostgreSQL storage, and a React/TypeScript workspace. Normalisation and deduplication are domain services with provenance-preserving merges.',
      dataModel:
        'Feeds (source, config, health) → IngestRuns (time, outcome) → Indicators (type, value, confidence, time) → Sources (attribution per indicator) → Relationships → Notes → Reports.',
      engineeringDecisions: [
        {
          decision: 'Connector boundary keeps source formats out of the core',
          rationale:
            'Feed formats churn; the core indicator schema must not churn with them.',
        },
        {
          decision: 'Deduplication merges records but accumulates attributions',
          rationale:
            'A deduplicated indicator that forgets its sources is weaker evidence than the originals.',
        },
      ],
      testing:
        'Connector fixture tests per source format, normalisation and deduplication semantics (attribution accumulation), feed-health state tests, and search/relationship queries over seeded fixtures. No live feeds are required for the suite.',
      securityPrivacy:
        'Indicator data describes real infrastructure and third parties; access is role-scoped, reports carry handling notes, and only configured legitimate sources are contacted.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Coverage bounded by configured sources; incomplete by nature',
        'Indicator matches are context, never proof of malicious events',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Structured export formats for peer sharing',
        'Additional source connectors',
      ],
    },
  },
  {
    slug: 'incidentflow',
    name: 'IncidentFlow',
    companySlug: 'velaqori-systems',
    category: 'Cybersecurity',
    categories: ['Cybersecurity', 'Software Engineering'],
    purpose:
      'Organizes security incidents, response tasks, evidence references, timelines, affected assets, investigation notes, and remediation work.',
    summary:
      'Security incident response and case management: classification, severity/status lifecycle, task assignment, timelines, asset records, response templates, audit trail, and resolution reports.',
    status: 'CASE_STUDY_ONLY',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed.',
    technologies: ['Python', 'FastAPI', 'React', 'TypeScript', 'SQLAlchemy', 'PostgreSQL'],
    features: [
      {
        title: 'Incident lifecycle management',
        description:
          'Creation, classification, severity and status transitions with history preserved.',
      },
      {
        title: 'Tasks, timelines, and assets',
        description:
          'Response tasks are assigned and tracked; timelines and affected-asset records stay attached to the case.',
      },
      {
        title: 'Audit trail and resolution reports',
        description:
          'Accountable workflows: every action audited; resolution reports compile the record.',
      },
    ],
    keywords: ['incident response', 'case management', 'workflow', 'audit', 'remediation'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief; operational fit and deployment require verification.',
    featured: false,
    caseStudy: {
      title: 'IncidentFlow: accountable incident case management',
      problem:
        'Incident response fails on bookkeeping: who did what, which assets were affected, what is still open. IncidentFlow was designed as case management for security incidents — classification, severity and status lifecycle, task assignment, timelines, evidence references, affected-asset records, and remediation tracking — with an audit trail that makes the workflow accountable.',
      users: [
        'Response teams managing active incidents',
        'Team leads responsible for remediation tracking',
        'Students rehearsing incident-management process',
      ],
      constraints: [
        'Lifecycle transitions must preserve history',
        'Authorization scoped per case role',
        'Evidence referenced, not duplicated into the case store',
      ],
      solution:
        'IncidentFlow models incidents as cases: creation and classification set the record; severity and status move through defined transitions with history; tasks assign work with owners; timelines accumulate events; asset records link affected systems; response templates bootstrap common incident types; the audit trail records every action; resolution reports compile the case.',
      workflow: [
        {
          step: 'Create',
          description:
            'An incident is created and classified; templates can bootstrap tasks and fields.',
        },
        {
          step: 'Work',
          description:
            'Tasks assign and complete; timeline events and notes accumulate; evidence is referenced by pointer.',
        },
        {
          step: 'Resolve',
          description:
            'Status transitions to resolution; the resolution report compiles the record; the audit trail remains.',
        },
      ],
      architecture:
        'Python/FastAPI services with SQLAlchemy over PostgreSQL; a state-machine service enforces lifecycle transitions; authorization checks per case role; the React/TypeScript UI renders case workspaces. Background jobs handle report compilation.',
      dataModel:
        'Incidents (classification, severity, status) → StatusHistory → Tasks (owner, state) → TimelineEvents → AssetRecords (affected) → EvidenceRefs (pointers) → AuditEvents → Reports.',
      engineeringDecisions: [
        {
          decision: 'Explicit state machine for lifecycle transitions',
          rationale:
            'Incident records are read forensically; illegal transitions must be impossible, not merely discouraged.',
        },
        {
          decision: 'Evidence by reference',
          rationale:
            'Evidence lives in its own systems (logs, captures); duplicating it into case management breaks chains of custody.',
        },
      ],
      testing:
        'State-machine transition tests (legal and illegal paths), authorization matrix tests per case role, audit-completeness tests on sensitive actions, and report compilation over seeded cases. Cases in tests are synthetic.',
      securityPrivacy:
        'Incident records contain sensitive security and personal data; access is case-scoped and audited; evidence pointers avoid copies; exports are explicit.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Case management only — no alerting or paging in scope',
        'Evidence integrations are references, not ingestion',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Post-incident review templates',
        'Configured integrations with alert sources',
      ],
    },
  },
  {
    slug: 'hashsight',
    name: 'HashSight',
    companySlug: 'velaqori-systems',
    category: 'Cybersecurity',
    categories: ['Cybersecurity'],
    purpose:
      'Calculates local file hashes and optionally checks configured reputation sources.',
    summary:
      'A file hash reputation explorer: local hashing (SHA-256 plus compatibility hashes where required), configurable reputation lookups with source attribution, conflicting-result display, lookup history, and investigation cases.',
    status: 'CASE_STUDY_ONLY',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed.',
    technologies: ['Python', 'FastAPI', 'React', 'TypeScript', 'SQLite'],
    features: [
      {
        title: 'Local file hashing',
        description:
          'SHA-256 as standard, with compatibility hashes (e.g. MD5/SHA-1) labelled as weak where required.',
      },
      {
        title: 'Configurable reputation lookups',
        description:
          'Optional lookups against user-configured sources, with attribution and conflicting results shown side by side.',
      },
      {
        title: 'Investigation cases and reports',
        description:
          'Lookup history, analyst notes, and case records compile into reports.',
      },
    ],
    keywords: ['hashing', 'reputation', 'malware analysis', 'sha-256', 'investigation'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. “Unknown” is never presented as “safe”; submitted files are never executed.',
    featured: false,
    caseStudy: {
      title: 'HashSight: reputation answers that keep their uncertainty',
      problem:
        'Hash reputation is the fastest question in malware triage and the easiest to misread: “unknown” gets heard as “safe”, one source gets treated as truth, and lookups quietly leak what you are investigating. HashSight was designed to calculate hashes locally, consult only configured reputation sources, show conflicts instead of averaging them, and keep the privacy implications of lookups explicit.',
      users: [
        'Analysts triaging suspicious files',
        'Incident responders documenting indicators',
        'Students learning reputation-analysis limits',
      ],
      constraints: [
        'Never execute submitted files; never upload file contents — only hashes, and only with informed action',
        '“Unknown” must never render as “safe”',
        'Conflicting source results displayed, not reconciled by the tool',
        'Compatibility hashes labelled weak',
      ],
      solution:
        'HashSight calculates hashes locally (SHA-256 standard; MD5/SHA-1 for compatibility matching, labelled). Optional reputation lookups query user-configured sources; results display per source with attribution, and conflicts are shown side by side. Lookup history, notes, and investigation cases compile into reports that state what was checked and what remains unknown.',
      workflow: [
        {
          step: 'Hash',
          description:
            'A file is hashed locally; the hash set and file facts form the record.',
        },
        {
          step: 'Look up',
          description:
            'The analyst explicitly triggers lookups against configured sources (hash values only); results attach with attribution.',
        },
        {
          step: 'Interpret',
          description:
            'Conflicting results and absences render as-is; the analyst records conclusions; cases compile into reports.',
        },
      ],
      architecture:
        'A Python/FastAPI service with a pure hashing library (streaming), a lookup-adapter boundary for configured reputation sources, and case-management services; React/TypeScript UI renders hash records, source results, and cases. SQLite or PostgreSQL stores investigations.',
      dataModel:
        'Files (facts, hashes) → Lookups (source, hash sent, time, informed action) → SourceResults (per-source verdicts, attribution) → Cases (files, notes) → Reports.',
      engineeringDecisions: [
        {
          decision: 'Lookups send hashes only, behind an explicit informed action',
          rationale:
            'Querying a reputation service announces your investigation; doing it silently is a privacy failure.',
        },
        {
          decision: 'Per-source result display with no tool-side reconciliation',
          rationale:
            'The brief’s “unknown is not safe” rule extends to conflicts: the tool reports, the analyst concludes.',
        },
      ],
      testing:
        'Hashing library property tests (stability, streaming boundaries), lookup-adapter tests with recorded fixture responses, conflict-rendering tests, and report content tests. No live reputation services are contacted by the suite.',
      securityPrivacy:
        'Files are never executed or uploaded; only hash values leave the machine on explicit action; cases are access-scoped.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Reputation coverage bounded by configured sources',
        'Hash matches do not prove file behaviour; “unknown” remains unknown',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Batch hashing for directories with diffing',
        'Configured source-health display',
      ],
    },
  },
  {
    slug: 'assetwatch',
    name: 'AssetWatch',
    companySlug: 'velaqori-systems',
    category: 'Cybersecurity',
    categories: ['Cybersecurity', 'Software Engineering'],
    purpose:
      'Tracks authorized network assets, observed services, exposure findings, and remediation tasks over time.',
    summary:
      'An authorized network asset and exposure monitor: allowlisted inventory collection, service observations, scan history, change detection, exposure findings, ownership, and remediation tracking.',
    status: 'CASE_STUDY_ONLY',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed.',
    technologies: ['Python', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL'],
    features: [
      {
        title: 'Allowlisted, authorized collection',
        description:
          'Collection runs only against explicit allowlists; scope is a configuration, not a crawl.',
      },
      {
        title: 'Service observations and change detection',
        description:
          'Observed services accumulate history; changes between collections are surfaced.',
      },
      {
        title: 'Exposure findings and remediation',
        description:
          'Findings distinguish observed services from confirmed vulnerabilities; remediation tasks track to closure.',
      },
    ],
    keywords: ['asset management', 'exposure', 'authorized scanning', 'remediation', 'inventory'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. Only authorized targets may be collected; an observed service is not a confirmed vulnerability.',
    featured: false,
    caseStudy: {
      title: 'AssetWatch: exposure tracking that respects authorisation',
      problem:
        'You cannot defend assets you have not inventoried, and you cannot scan networks you do not own. AssetWatch was designed around that boundary: track authorized network assets and observed services over time, detect changes, record exposure findings, and drive remediation — with target authorization and bounded collection as first-class concepts, and the distinction between an observed service and a confirmed vulnerability kept explicit.',
      users: [
        'Small organisations managing their own networks’ security posture',
        'Administrators tracking remediation work',
        'Students learning authorised asset-management practice',
      ],
      constraints: [
        'Explicit allowlists: collection is bounded to authorised targets',
        'Observed service ≠ confirmed vulnerability — findings must reflect evidence strength',
        'Inventory history preserved for change detection',
      ],
      solution:
        'AssetWatch maintains an asset inventory populated by approved collection against allowlisted targets. Service observations accumulate per asset with scan history; change detection highlights differences between collections; exposure findings record evidence and strength (observed vs confirmed); ownership and remediation tasks track findings to closure; comparison reports summarise change over time.',
      workflow: [
        {
          step: 'Authorise',
          description:
            'Operators define allowlists and collection scope; nothing outside scope is ever collected.',
        },
        {
          step: 'Collect',
          description:
            'Approved collection records assets and service observations with time and method.',
        },
        {
          step: 'Find',
          description:
            'Exposure findings attach to assets with evidence-strength labels; changes surface in history.',
        },
        {
          step: 'Remediate',
          description:
            'Tasks track findings to closure; comparison reports document the change.',
        },
      ],
      architecture:
        'Python/FastAPI services with a collection module gated on allowlist checks, PostgreSQL inventory and history stores, remediation tracking services, and a React/TypeScript UI. Collection jobs run in background workers with scope enforcement at the job level.',
      dataModel:
        'Allowlists (targets, scope) → Assets (ownership) → Observations (service, time, method) → Findings (evidence strength, status) → RemediationTasks → ComparisonReports.',
      engineeringDecisions: [
        {
          decision: 'Allowlist enforcement at the collection-job level',
          rationale:
            'Authorisation is the ethical and legal boundary of the product; enforcing it centrally means no code path can exceed scope.',
        },
        {
          decision: 'Evidence-strength labels on findings',
          rationale:
            'The brief’s observed-vs-confirmed distinction prevents inflated exposure reports.',
        },
      ],
      testing:
        'Allowlist enforcement tests (attempts outside scope rejected and logged), observation and change-detection correctness over fixture collections, finding-classification tests, and remediation-state tests. Collection tests run against local fixture services only.',
      securityPrivacy:
        'Inventory describes an organisation’s infrastructure; access is role-scoped; collection is bounded to authorised targets and logged.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'No scanning outside explicit allowlists — by design',
        'Finding depth bounded by collection methods',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Scheduled collection windows with approval workflow',
        'Exportable remediation summaries for stakeholders',
      ],
    },
  },
  {
    slug: 'securecode-workbench',
    name: 'SecureCode Workbench',
    companySlug: 'velaqori-systems',
    category: 'Cybersecurity',
    categories: ['Cybersecurity', 'Software Engineering'],
    purpose:
      'Integrates established static-analysis tools to help developers understand and prioritize supported code-security findings.',
    summary:
      'Static application security review with Bandit (and optional Semgrep) integration: finding categories, source locations, rule references, remediation guidance, a false-positive workflow, and review history.',
    status: 'CASE_STUDY_ONLY',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed.',
    technologies: ['Python', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL', 'Bandit', 'Semgrep'],
    features: [
      {
        title: 'Scanner integration (Bandit, optional Semgrep)',
        description:
          'Established tools run behind adapters; the workbench interprets and organises their findings.',
      },
      {
        title: 'Findings with locations and rule references',
        description:
          'Categories, severity, source locations, and rule references presented for prioritisation.',
      },
      {
        title: 'False-positive workflow and review history',
        description:
          'Findings can be marked with justification; review history is preserved.',
      },
    ],
    keywords: ['SAST', 'bandit', 'semgrep', 'code review', 'application security'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. Automated analysis has known limits; uploaded projects are not executed as part of routine static analysis.',
    featured: false,
    caseStudy: {
      title: 'SecureCode Workbench: static findings developers can act on',
      problem:
        'Static analysers produce findings faster than developers can triage them. The Workbench was designed to integrate established tools (Bandit, optional Semgrep) and make their output reviewable: validated project-file processing, finding categories and severity, exact source locations, rule references, remediation guidance, a false-positive workflow with justification, and review history — while stating the limits of automated analysis.',
      users: [
        'Developers reviewing their own codebases',
        'Security champions triaging scanner output',
        'Teams building code-review discipline',
      ],
      constraints: [
        'Uploaded projects are untrusted input: validated file processing, and never executed as part of routine analysis',
        'Scanner findings carry rule references; guidance is separated from raw findings',
        'Automated analysis limits must be stated — silence is not safety',
      ],
      solution:
        'SecureCode Workbench accepts source submissions, validates and processes project files without execution, runs integrated scanners behind adapters, and normalises findings into a review model: category, severity, location, rule reference, and remediation guidance. Reviewers triage findings through a false-positive workflow that records justification; review history and reports compile the state of a codebase over time.',
      workflow: [
        {
          step: 'Submit',
          description:
            'A project is submitted; file handling validates structure and never executes code.',
        },
        {
          step: 'Analyse',
          description:
            'Scanner adapters run and normalise findings into the review model with rule references.',
        },
        {
          step: 'Review',
          description:
            'Findings are prioritised and triaged; false positives are marked with justification; reports compile the review state.',
        },
      ],
      architecture:
        'Python/FastAPI backend with scanner adapters (Bandit, optional Semgrep) at a boundary; untrusted-file handling isolates project processing; PostgreSQL stores findings and review state; the React/TypeScript UI renders triage views and reports.',
      dataModel:
        'Projects (submission, validation state) → Scans (tool, time) → Findings (category, severity, location, rule ref) → ReviewStates (triage, justification) → Reports.',
      engineeringDecisions: [
        {
          decision: 'File processing that never executes project code',
          rationale:
            'The brief’s untrusted-input rule: static analysis that runs the target is dynamic analysis and a hazard.',
        },
        {
          decision: 'Normalised findings model across scanners',
          rationale:
            'Tools change; the review workflow and history must remain stable across scanner generations.',
        },
      ],
      testing:
        'Untrusted-file handling tests (malicious filenames, oversized archives, symlink escapes), scanner-adapter fixture tests, finding-normalisation tests, false-positive workflow tests, and report rendering. Test projects are synthetic and labelled.',
      securityPrivacy:
        'Submitted code is untrusted input handled without execution; submissions are access-scoped; findings can expose vulnerable code locations and are handled accordingly.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Automated static analysis has documented blind spots (e.g. complex flows)',
        'Scanner coverage bounded by integrated tools and their rule sets',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'More scanner adapters behind the same model',
        'Team policy views (severity thresholds per project)',
      ],
    },
  },
  {
    slug: 'circuitlab-calc',
    name: 'CircuitLab Calc',
    companySlug: 'velaqori-systems',
    category: 'Engineering and Scientific Computing',
    categories: ['Engineering and Scientific Computing'],
    purpose:
      'Calculates supported electrical quantities with clear formulas, assumptions, units, and saved results.',
    summary:
      'An electrical engineering calculator: Ohm’s law, power, series/parallel resistance, voltage divider, supported Kirchhoff-law cases, unit conversion, validation, history, formula explanations, and exports.',
    status: 'BUILT',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed.',
    technologies: ['Python', 'FastAPI', 'React', 'NumPy', 'SymPy', 'SQLite'],
    features: [
      {
        title: 'Supported circuit models with explicit scope',
        description:
          'Ohm’s law, power, series/parallel resistance, voltage divider, and defined Kirchhoff cases — no arbitrary-circuit claims.',
      },
      {
        title: 'Units, validation, and assumptions',
        description:
          'Unit-aware inputs, dimensional validation, and stated assumptions with every result.',
      },
      {
        title: 'Formula explanations, history, exports',
        description:
          'Working shown step by step; results save to history and export.',
      },
    ],
    keywords: ['electronics', 'calculator', 'ohms law', 'kirchhoff', 'units', 'engineering'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. Supported circuit models are explicitly defined; the tool cannot solve arbitrary circuits.',
    featured: true,
    caseStudy: {
      title: 'CircuitLab Calc: calculation that shows its working',
      problem:
        'Circuit calculators that return bare numbers hide the formula, the units, and the assumptions — the parts a student or engineer actually needs. CircuitLab Calc was designed to calculate supported electrical quantities with clear formulas, assumptions, units, and saved results, and to say exactly which circuit models it supports instead of implying it can solve anything.',
      users: [
        'Electrical engineering students',
        'Technicians and hobbyists checking hand calculations',
        'Educators demonstrating fundamentals',
      ],
      constraints: [
        'Explicitly defined supported models — no arbitrary-circuit solver claims',
        'Unit validation mandatory; results state rounding and assumptions',
        'Numerical behaviour must be tested against hand-computed references',
      ],
      solution:
        'CircuitLab Calc implements supported relations — Ohm’s law, electrical power, series and parallel resistance, voltage dividers, and defined Kirchhoff-law cases — through SymPy-backed formula handling and NumPy-supported computation. Inputs are unit-aware with dimensional validation; every result renders formula, substitution, assumptions, and rounding. History saves results; exports include the working.',
      workflow: [
        {
          step: 'Enter',
          description:
            'Quantities with units; dimensional validation rejects inconsistent inputs with explanations.',
        },
        {
          step: 'Compute',
          description:
            'The formula engine evaluates the supported model with explicit precision handling.',
        },
        {
          step: 'Explain',
          description:
            'Working renders (formula → substitution → result); assumptions and rounding are stated.',
        },
      ],
      architecture:
        'A Python/FastAPI backend with a formula engine (SymPy for symbolic handling, NumPy for computation) over a units/quantity library; SQLite or PostgreSQL stores history; the React/TypeScript UI renders calculators and working. Each supported model is a registered, tested formula definition.',
      dataModel:
        'Models (formula, assumptions, supported cases) → Calculations (inputs with units, result, working) → History → Exports.',
      engineeringDecisions: [
        {
          decision: 'Registered formula definitions with declared assumptions',
          rationale:
            'The brief’s scope rule is structural: the tool computes only registered models and renders their assumptions.',
        },
        {
          decision: 'Dimensional validation at input time',
          rationale:
            'Unit errors are the classic calculator failure; rejecting them early with explanations turns mistakes into teaching moments.',
        },
      ],
      testing:
        'Formula implementations tested against hand-computed reference values for each supported model; unit-conversion and dimensional-validation tests; rounding-behaviour tests with documented expectations; working-render tests. Precision expectations are documented, not invented.',
      securityPrivacy:
        'Calculations run locally; history is user-scoped; no data leaves the service in calculator use.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Supported models only — not a general circuit solver',
        'No transient or AC analysis in the defined model set',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Additional supported Kirchhoff cases',
        'AC impedance models with declared assumptions',
      ],
    },
  },
  {
    slug: 'chessscope',
    name: 'ChessScope',
    companySlug: 'velaqori-systems',
    category: 'Data Analysis',
    categories: ['Data Analysis', 'AI and Intelligent Applications'],
    purpose:
      'Organizes chess games, enables move-by-move inspection, summarizes openings and performance, and identifies recurring patterns.',
    summary:
      'A chess game analyzer: PGN import, game library, move navigation, opening statistics, performance summaries, collections, filtering, study notes, exports, and optional Stockfish integration.',
    status: 'BUILT',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed.',
    technologies: ['Python', 'FastAPI', 'React', 'TypeScript', 'python-chess', 'Pandas', 'Stockfish'],
    features: [
      {
        title: 'PGN import and game library',
        description:
          'Games import from PGN into a searchable, filterable library with collections.',
      },
      {
        title: 'Move-by-move inspection',
        description:
          'Full move navigation over the board with study notes attached to positions.',
      },
      {
        title: 'Opening and performance summaries',
        description:
          'Statistical summaries over the library — distinguished clearly from engine evaluations.',
      },
      {
        title: 'Optional Stockfish integration',
        description:
          'Engine analysis available as a labelled, optional feature — reference, not truth.',
      },
    ],
    keywords: ['chess', 'pgn', 'analysis', 'openings', 'statistics', 'stockfish'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. Engine evaluations and statistical summaries are different things and are labelled as such.',
    featured: false,
    caseStudy: {
      title: 'ChessScope: a game library that keeps statistics and engines apart',
      problem:
        'Chess analysis mixes two very different kinds of information: statistical summaries (what openings you play, where games end) and engine evaluations (what a position objectively looks like). ChessScope was designed to organise games, enable move-by-move inspection, summarise openings and performance, and surface recurring patterns — while keeping engine evaluation and statistical summary explicitly distinct.',
      users: [
        'Club players studying their game collections',
        'Coaches reviewing learner games',
        'Students practising data analysis on a familiar domain',
      ],
      constraints: [
        'Engine evaluations ≠ statistical summaries — never blend the two',
        'Performance metrics have limits; summaries state their sample scope',
        'PGN is a messy real-world format — parsing must handle it defensively',
      ],
      solution:
        'ChessScope imports PGN games into a library with collections and filtering. Move-by-move inspection navigates the board with study notes attachable at positions. Opening statistics and performance summaries aggregate over the library with their sample scope stated. Optional Stockfish integration provides labelled engine analysis as reference material, visually and structurally separated from statistical views. Exports compile study notes and summaries.',
      workflow: [
        {
          step: 'Import',
          description:
            'PGN files parse defensively; malformed games report errors instead of corrupting the library.',
        },
        {
          step: 'Inspect',
          description:
            'Games replay move by move; notes attach to positions; engine reference is optional and labelled.',
        },
        {
          step: 'Summarise',
          description:
            'Opening and performance statistics aggregate over selected collections with scope stated.',
        },
      ],
      architecture:
        'Python/FastAPI backend with python-chess for PGN parsing and position representation, Pandas for statistical aggregation, optional Stockfish behind an engine-adapter boundary; PostgreSQL or SQLite stores the library; React/TypeScript UI renders board, statistics, and notes.',
      dataModel:
        'Games (PGN metadata, moves) → Positions (per move) → StudyNotes (position ref) → Collections → Statistics (scope, aggregates) → EngineAnalyses (labelled, optional).',
      engineeringDecisions: [
        {
          decision: 'Engine adapter isolated behind a boundary',
          rationale:
            'Engine analysis is optional and heavyweight; keeping it at a boundary keeps core library functions dependency-light and testable.',
        },
        {
          decision: 'Statistical views never include engine data',
          rationale:
            'The brief’s separation rule is structural: mixing evaluations and statistics misleads learners.',
        },
      ],
      testing:
        'PGN parser tests over messy real-world-format fixtures (with variations, comments, malformed entries), position-representation invariants via python-chess, statistical aggregation correctness over seeded game sets, and labelling tests asserting engine output always renders as labelled reference. No player-improvement claims are tested or made.',
      securityPrivacy:
        'Game collections are personal study data; access is user-scoped; optional engine analysis runs with the user’s explicit activation.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Performance metrics describe the imported sample only',
        'Engine strength depends on the configured Stockfish build',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Repertoire gap detection across collections',
        'Lesson export for coaches',
      ],
    },
  },
];
