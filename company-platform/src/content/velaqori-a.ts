/** Velaqori Systems (working name) — company record and product catalogue 01–06. */
import type { CompanyContent, ProductContent, SolutionContent } from './types';

export const velaqoriCompany: CompanyContent = {
  slug: 'velaqori-systems',
  name: 'Velaqori Systems',
  workingNameNotice:
    'Velaqori Systems is a working name used while trademark checks are pending. Legal registration details will be added after official registration.',
  tagline: 'Practical software and cyber engineering, built to be understood.',
  overview:
    'Velaqori Systems is a software and cybersecurity company (working name). It designs and builds practical tools, applications, and engineering resources for individuals, students, developers, and small organisations — security operations tooling, developer utilities, and focused engineering applications.',
  focusAreas: [
    'Cybersecurity tooling and security operations',
    'Software engineering and developer tooling',
    'Engineering and scientific computing utilities',
    'Data analysis for technical work',
  ],
  aboutStory:
    'Velaqori Systems grew out of portfolio engineering work: a series of cybersecurity and software tools built to make serious engineering practice approachable. The company (working name) exists to turn that work into products that are honest about what they do, careful with user data, and documented well enough to be trusted. It is registered as a separate business and operates independently of any other company on this platform.',
  values: [
    'Explain what the tool actually does — no fear-based security claims',
    'Data minimisation by default',
    'Documentation is part of the product',
    'Verify before claiming',
  ],
  approach: [
    'Start from a concrete engineering problem and its constraints',
    'Build small, testable components with clear interfaces',
    'Document architecture and decisions alongside the code',
    'Label anything unverified instead of dressing it up',
  ],
  accentToken: 'vela',
  featuredProductSlugs: ['sentinelcore', 'phishlens', 'circuitlab-calc'],
  featuredCaseStudySlugs: [
    'sentinelcore-case-study',
    'phishlens-case-study',
  ],
};

export const velaqoriSolutions: SolutionContent[] = [
  {
    slug: 'security-operations-and-defensive-tooling',
    title: 'Security operations and defensive tooling',
    companySlug: 'velaqori-systems',
    problem:
      'Small teams and developers face real security work — monitoring events, reviewing logs, checking dependencies, analysing suspicious messages — but most tooling assumes a security operations centre. They need utilities that surface evidence, explain findings, and state their limits without exploiting fear.',
    approach:
      'A connected set of defensive tools (SentinelCore, SentinelLog, FileGuard, DependSecure, PhishLens, NetScope, ThreatIntel Desk, IncidentFlow, HashSight, AssetWatch, SecureCode Workbench) that each do one analysis job well: ingest real inputs, normalise and explain findings with provenance, and never claim certainty the evidence cannot support. Tools are built to be run by the people who own the systems they protect.',
    audiences: [
      'Small organisations without dedicated security staff',
      'Developers who want to understand their own risk surface',
      'Students learning defensive security practice',
    ],
  },
  {
    slug: 'software-engineering-and-scientific-tools',
    title: 'Software engineering and scientific tools',
    companySlug: 'velaqori-systems',
    problem:
      'Everyday engineering work — calculating circuit behaviour, studying chess games, building full applications — needs focused tools where the model matches the domain and the documentation tells the truth about scope.',
    approach:
      'Domain-shaped applications (CircuitLab Calc, ChessScope, and portfolio work such as WorkNiche) where formulas, data models, and analysis are explicit and tested. Deployment is separate from the build: products ship as documented, tested implementations first.',
    audiences: [
      'Engineering students and practitioners',
      'Chess players studying their games',
      'Developers evaluating full-stack build quality',
    ],
  },
];

export const velaqoriProducts: ProductContent[] = [
  {
    slug: 'sentinelcore',
    name: 'SentinelCore',
    companySlug: 'velaqori-systems',
    category: 'Cybersecurity',
    categories: ['Cybersecurity'],
    purpose:
      'A security monitoring and investigation application that collects, normalizes, and analyzes security events, creates alerts, and helps analysts manage incidents.',
    summary:
      'A mini-SIEM for small teams: event ingestion and normalization, configurable detection rules, alert lifecycle, correlation, and investigation workflows — explicitly not an enterprise SIEM.',
    status: 'BUILT',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed. No real intrusions were detected or claimed.',
    technologies: ['Python', 'FastAPI', 'React', 'TypeScript', 'SQLite', 'Pandas'],
    features: [
      {
        title: 'Event ingestion and normalization',
        description:
          'Raw events are parsed into a normalised schema with the original payload preserved for evidence.',
      },
      {
        title: 'Configurable detection rules',
        description:
          'Analyst-defined rules generate alerts with the rule text and matched events attached.',
      },
      {
        title: 'Alert and incident lifecycle',
        description:
          'Alerts triage into incidents with notes, status transitions, and report generation.',
      },
      {
        title: 'Role-based access and audit logging',
        description:
          'Analyst actions are permission-scoped and recorded in an audit trail.',
      },
    ],
    keywords: ['siem', 'security monitoring', 'alerts', 'incident management', 'detection rules'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Case study sourced from the project brief. Implementation details require verification before publication; no deployment status or detection-efficacy claims are made.',
    featured: true,
    caseStudy: {
      title: 'SentinelCore: a mini-SIEM that explains its alerts',
      problem:
        'Security monitoring for a small team usually means logs nobody reads until something breaks. SentinelCore was designed as a mini-SIEM: collect security events, normalise them, evaluate configurable rules, raise alerts, and carry an investigation through to a documented incident — at a scale a small team can operate.',
      users: [
        'Small-team analysts monitoring their own infrastructure',
        'Incident responders scoping and documenting events',
        'Students learning security-operations workflows',
      ],
      constraints: [
        'Not an enterprise SIEM — bounded ingest volume and rule set',
        'Findings are analyst-reviewed; the tool does not claim to detect intrusions',
        'Evidence chain: raw events must remain reachable from every alert',
        'Role-scoped access and auditability from the first version',
      ],
      solution:
        'SentinelCore ingests events from configured sources into a normalised event schema, evaluates detection rules over the normalised stream, and opens alerts with matched evidence attached. Analysts triage alerts into incidents, add notes, manage severity and status, and generate review reports. Correlation links related alerts; the audit log records who did what.',
      workflow: [
        {
          step: 'Ingest',
          description:
            'Configured sources deliver raw events; parsers normalise them while keeping the raw payload as evidence.',
        },
        {
          step: 'Detect',
          description:
            'Rule evaluation runs over normalised events; matches generate alerts citing the rule and the events.',
        },
        {
          step: 'Triage',
          description:
            'Analysts review alerts, correlate related ones, and either close them with a reason or promote to an incident.',
        },
        {
          step: 'Resolve',
          description:
            'Incidents accumulate notes, tasks, and status transitions; the resolution report summarises the record.',
        },
      ],
      architecture:
        'A Python/FastAPI backend with a React/TypeScript frontend. Ingestion adapters write to a normalised event store (SQLite or PostgreSQL); the rule engine is a modular evaluator over the event schema; alerts, incidents, and notes are domain services with role-based authorization; Pandas supports aggregation views. Background processing handles ingest batches so the API stays responsive.',
      dataModel:
        'Sources → RawEvents (payload, time) → Events (normalised fields, raw ref) → Rules → Alerts (rule, matched events, status) → Incidents (alerts, notes, tasks, status history) → AuditEvents (actor, action, resource).',
      engineeringDecisions: [
        {
          decision: 'Raw payload preserved beside every normalised event',
          rationale:
            'Normalisation is lossy; investigations must always reach the original evidence.',
        },
        {
          decision: 'Alerts carry rule text and matched events at creation',
          rationale:
            'An alert without its evidence forces analysts to reconstruct context later; attaching it at creation keeps triage honest.',
        },
        {
          decision: 'Bounded scope stated in-product',
          rationale:
            'The brief explicitly forbids enterprise-SIEM claims; the product documentation names its limits.',
        },
      ],
      testing:
        'Test areas cover parser and normalisation fixtures, rule evaluation semantics, alert lifecycle transitions, and authorization boundaries. Actual test counts and coverage figures are recorded in the implementation repository and are not restated here without re-verification. No efficacy claims (detections of real intrusions) are made.',
      securityPrivacy:
        'Events can contain sensitive data (accounts, hosts); storage is access-scoped, actions are audited, and the tool never executes event content. Deployment hardening (TLS, secrets management) is deployment-specific and documented as required configuration.',
      walkthroughNote:
        'Representative concept visuals are labelled illustrative; genuine application screenshots should replace them when available.',
      limitations: [
        'Bounded ingest volume and rule complexity — not enterprise scale',
        'No claim of real intrusion detection or efficacy',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Additional ingestion adapters for common log sources',
        'Tunable rule packs with documented precision expectations',
      ],
    },
  },
  {
    slug: 'sentinellog',
    name: 'SentinelLog',
    companySlug: 'velaqori-systems',
    category: 'Cybersecurity',
    categories: ['Cybersecurity', 'Data Analysis'],
    purpose:
      'Helps users inspect security logs, identify potentially suspicious patterns, apply rules, and generate reports.',
    summary:
      'Log ingestion, parsing, and review with configurable rules and suspicious-pattern indicators — with the difference between a suspicious event and a confirmed incident kept explicit.',
    status: 'BUILT',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed.',
    technologies: ['Python', 'FastAPI', 'React', 'TypeScript', 'SQLite', 'Pandas'],
    features: [
      {
        title: 'Log ingestion and parsing',
        description:
          'Supported log formats parse into a common event schema; unparsed lines are preserved and counted.',
      },
      {
        title: 'Configurable rules and indicators',
        description:
          'Rules flag suspicious patterns as review prompts with the evidence attached.',
      },
      {
        title: 'Investigation summaries and reports',
        description:
          'Reviewed events compile into summaries that separate observations from conclusions.',
      },
    ],
    keywords: ['log analysis', 'security logs', 'detection rules', 'investigation', 'reporting'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief; detection efficacy and deployment require verification.',
    featured: false,
    caseStudy: {
      title: 'SentinelLog: reading security logs without over-reading them',
      problem:
        'Raw security logs answer questions only for people fluent in log syntax. SentinelLog was designed for the middle ground: parse and filter logs, apply configurable rules, flag suspicious patterns, and compile investigation summaries — while keeping the distinction between a suspicious event and a confirmed incident explicit.',
      users: [
        'Administrators reviewing their own systems’ logs',
        'Analysts doing first-pass triage',
        'Students learning log-based detection',
      ],
      constraints: [
        'Suspicious ≠ malicious: indicators are review prompts, not verdicts',
        'Unparsed lines preserved, never silently dropped',
        'Local processing; uploaded logs are sensitive material',
      ],
      solution:
        'SentinelLog ingests log files through format-aware parsers into a searchable event store. Configurable rules flag patterns (authentication failures, unusual sources, off-hours access); each indicator links to its events. Investigation summaries gather reviewed events, analyst conclusions, and the remaining open questions into reports.',
      workflow: [
        {
          step: 'Ingest',
          description: 'Parsers normalise events; coverage gaps (unparsed lines) are reported.',
        },
        {
          step: 'Review',
          description:
            'Search, filters, and rule indicators guide attention; each flag drills to its evidence.',
        },
        {
          step: 'Summarise',
          description:
            'The analyst writes a summary separating observed facts from interpretation; it exports as a report.',
        },
      ],
      architecture:
        'Python/FastAPI services (parsing pipeline, rule evaluator, search) behind a React/TypeScript UI; Pandas powers aggregation views; SQLite or PostgreSQL stores events and reviews. Parsing, detection, and reporting are separate modules so each can be tested in isolation.',
      dataModel:
        'Imports (source file, format, coverage) → Events (parsed fields, raw line) → RuleMatches (rule, events) → Reviews (analyst, conclusions) → Reports.',
      engineeringDecisions: [
        {
          decision: 'Coverage reporting on every import',
          rationale:
            'Knowing what fraction of a log parsed is part of honest analysis; silent drops would distort every downstream conclusion.',
        },
        {
          decision: 'Observation and interpretation stored separately',
          rationale:
            'The brief’s core distinction (suspicious event vs confirmed incident) is enforced by the data model.',
        },
      ],
      testing:
        'Parser fixtures per supported format, rule-evaluation tests, coverage-reporting tests, and summary/report rendering. No real production logs are used; fixtures are synthetic and labelled. Test status in the implementation repository is the source of truth.',
      securityPrivacy:
        'Log files contain account and network data; they are processed locally, access is scoped, and exports state their contents. Defanged display of external indicators where rendered.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Rule coverage bounds detection; flags are prompts, not conclusions',
        'Format support is bounded by the parser set',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Saved review templates for common incident types',
        'Time-window comparison views',
      ],
    },
  },
  {
    slug: 'fileguard',
    name: 'FileGuard',
    companySlug: 'velaqori-systems',
    category: 'Cybersecurity',
    categories: ['Cybersecurity'],
    purpose:
      'Establishes file baselines, calculates cryptographic hashes, and detects changes during later checks.',
    summary:
      'A file integrity monitoring system: SHA-256 baselines, scheduled or on-demand integrity scans, change detection, scan history, and integrity reports — with the explicit statement that integrity does not prove safety.',
    status: 'BUILT',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed.',
    technologies: ['Python', 'FastAPI', 'React', 'TypeScript', 'SQLite'],
    features: [
      {
        title: 'Baseline creation and SHA-256 hashing',
        description:
          'Directories of interest are baselined with cryptographic hashes and file metadata.',
      },
      {
        title: 'Integrity scans and change detection',
        description:
          'Later scans compare against baselines and surface additions, modifications, and deletions.',
      },
      {
        title: 'Scan history and integrity reports',
        description:
          'Every scan is recorded; reports describe what changed and when.',
      },
    ],
    keywords: ['file integrity', 'baseline', 'sha-256', 'change detection', 'monitoring'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief; deployment requires verification. Integrity monitoring does not prove a file is safe.',
    featured: false,
    caseStudy: {
      title: 'FileGuard: what changed, when, and why it matters',
      problem:
        'Knowing that important files changed is a foundation of defensive security, but change detection is often conflated with malware detection. FileGuard was designed strictly as an integrity monitor: establish baselines with cryptographic hashes, detect later changes, and document the history — while stating plainly that an unchanged file is not proven safe and a changed file is not proven malicious.',
      users: [
        'Administrators guarding configuration and content directories',
        'Incident responders establishing what changed during an event',
        'Students learning integrity-monitoring principles',
      ],
      constraints: [
        'Integrity ≠ safety: the product must never imply a “clean” verdict',
        'Large trees must scan without loading files fully into memory',
        'Hashing method and algorithm recorded with every result',
      ],
      solution:
        'FileGuard baselines a selected tree (paths, sizes, metadata, SHA-256 hashes), then scans on demand or on schedule, comparing current state to baselines. Differences (added, modified, deleted, metadata changes) are listed with their history; integrity reports summarise scans over time. The UI carries the scope statement: integrity monitoring detects change, not malice.',
      workflow: [
        {
          step: 'Baseline',
          description:
            'The operator selects protected paths; FileGuard records identity facts and hashes.',
        },
        {
          step: 'Scan',
          description:
            'Scans stream files, recompute hashes, and compare against the active baseline.',
        },
        {
          step: 'Review',
          description:
            'Changes are listed with their evidence (before/after facts); reports document the scan history.',
        },
      ],
      architecture:
        'A Python/FastAPI service orchestrates scanner workers that stream files (memory-safe for large files); results persist to SQLite or PostgreSQL; the React/TypeScript UI renders baselines, change sets, and history. Hash computation is a pure, tested library.',
      dataModel:
        'Baselines (path scope, created) → FileRecords (path, metadata, hashes) → Scans (started, completed) → Changes (kind, before/after facts) → Reports.',
      engineeringDecisions: [
        {
          decision: 'Streaming hashing with explicit algorithm metadata',
          rationale:
            'Large-tree monitoring must not exhaust memory, and a hash without its algorithm is weak evidence.',
        },
        {
          decision: 'Scope statement rendered on every result surface',
          rationale:
            'The brief’s honesty rule (integrity does not prove safety) is a product invariant, not a footnote.',
        },
      ],
      testing:
        'Hash stability across chunk boundaries, change-classification tests over fixture trees (added/modified/deleted/metadata), scan-history integrity, and rendering of scope statements. Fixture trees are generated benign files.',
      securityPrivacy:
        'Monitoring touches sensitive file systems at the operator’s explicit selection; file contents are never uploaded or executed; results store identity facts only.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Detects change, not malice — no safety verdicts are offered',
        'Bounded to filesystems the operator can mount locally',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Baseline approval workflow for controlled change windows',
        'Notification adapters for change events (configured, optional)',
      ],
    },
  },
  {
    slug: 'dependsecure',
    name: 'DependSecure',
    companySlug: 'velaqori-systems',
    category: 'Cybersecurity',
    categories: ['Cybersecurity', 'Software Engineering'],
    purpose:
      'Audits Python dependency declarations against supported vulnerability-advisory sources and explains affected packages and remediation options.',
    summary:
      'A Python dependency vulnerability auditor (pip-audit integration): dependency inventory, advisory provenance, affected-package results, source-provided severity, remediation suggestions, scan history, and exports.',
    status: 'BUILT',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed.',
    technologies: ['Python', 'FastAPI', 'React', 'TypeScript', 'SQLite', 'pip-audit'],
    features: [
      {
        title: 'Dependency inventory and scanner integration',
        description:
          'Declared dependencies are inventoried and audited through established advisory sources via pip-audit.',
      },
      {
        title: 'Advisory provenance',
        description:
          'Every finding cites its advisory reference and source-provided severity — no invented scores.',
      },
      {
        title: 'Remediation and scan history',
        description:
          'Affected versions and upgrade options are explained; scans are recorded for comparison.',
      },
    ],
    keywords: ['dependencies', 'supply chain', 'pip-audit', 'advisories', 'python', 'remediation'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief; advisory coverage is bounded by the upstream sources and scanner limitations apply.',
    featured: false,
    caseStudy: {
      title: 'DependSecure: dependency audits with the receipts attached',
      problem:
        'Python projects accumulate dependencies whose vulnerabilities surface in advisories few developers read. DependSecure was designed to audit dependency declarations against supported advisory sources and explain findings — which package, which advisory, which versions are affected, what a remediation looks like — while keeping tool findings distinct from recommendations.',
      users: [
        'Python developers reviewing their project’s supply chain',
        'Tech leads documenting dependency risk',
        'Students learning about vulnerability advisories',
      ],
      constraints: [
        'Findings must carry advisory provenance (reference + source severity)',
        'Scanner findings are not recommendations; remediation advice is separate',
        'Advisory databases are incomplete and lag — limitations must be stated',
        'Version-constraint semantics (ranges, markers) must be handled correctly',
      ],
      solution:
        'DependSecure inventories declared dependencies (including transitive resolution where supported), runs pip-audit against configured advisory sources, and renders results as records: package, affected range, advisory reference, source severity, and remediation options. Scan history compares audits over time; exports compile findings with provenance for review documentation.',
      workflow: [
        {
          step: 'Inventory',
          description:
            'Dependency declarations are parsed into an inventory with version constraints resolved.',
        },
        {
          step: 'Audit',
          description:
            'The scanner queries advisory sources; results are stored with their advisory references.',
        },
        {
          step: 'Explain',
          description:
            'Findings render with provenance, affected ranges, and clearly-labelled remediation suggestions.',
        },
      ],
      architecture:
        'A Python/FastAPI backend integrates pip-audit behind a scanner-adapter boundary; results normalise into a findings schema with advisory metadata; the React/TypeScript UI renders inventories, findings, history, and exports. SQLite or PostgreSQL stores scan records.',
      dataModel:
        'Projects (declarations) → Packages (name, version, constraints) → Scans (time, source set) → Findings (package, advisory ref, severity, affected range) → RemediationNotes (labelled suggestions).',
      engineeringDecisions: [
        {
          decision: 'Scanner behind an adapter interface',
          rationale:
            'Advisory tooling evolves; isolating it keeps the findings schema stable and testable with recorded fixtures.',
        },
        {
          decision: 'Findings and recommendations stored separately',
          rationale:
            'The brief’s distinction (tool findings versus recommendations) is structural: scanners report, humans decide.',
        },
      ],
      testing:
        'Inventory parsing (including version-constraint edge cases), scanner-adapter tests over recorded fixture outputs, finding-provenance completeness tests, and export rendering. Real advisory databases are not required for the suite; fixture outputs are labelled as recorded samples.',
      securityPrivacy:
        'Dependency names are sent to advisory sources during live scans (documented); offline fixture mode exists for tests; no project source code is uploaded.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Bounded by upstream advisory coverage and scanner limitations',
        'Python packaging in the first version; other ecosystems are future scope',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Policy rules for teams (e.g. fail on specific severities)',
        'Additional ecosystem adapters',
      ],
    },
  },
  {
    slug: 'phishlens',
    name: 'PhishLens',
    companySlug: 'velaqori-systems',
    category: 'Cybersecurity',
    categories: ['Cybersecurity'],
    purpose:
      'Performs explainable defensive analysis of suspicious email content, headers, and URLs.',
    summary:
      'A phishing email and URL analyzer: header parsing, URL structure analysis, sender/reply-to mismatch indicators, available SPF/DKIM/DMARC evidence, and explainable risk classifications — never automatically opening suspicious links.',
    status: 'BUILT',
    statusNote:
      'Built and tested locally with a dedicated frontend, backend, automated tests, documentation and local demo; not publicly deployed.',
    technologies: ['Python', 'FastAPI', 'React', 'TypeScript', 'SQLite'],
    features: [
      {
        title: 'Email content and header analysis',
        description:
          'Headers parse into routing facts; sender/reply-to mismatches and structural signals are surfaced with evidence.',
      },
      {
        title: 'Safe URL structure analysis',
        description:
          'Links are analysed structurally (defanged display, never fetched automatically).',
      },
      {
        title: 'Explainable risk classification',
        description:
          'Classifications name their contributing indicators and their uncertainty — an indicator is not proof.',
      },
      {
        title: 'Investigation history',
        description:
          'Analyses are recorded with notes and reports for repeat review.',
      },
    ],
    keywords: ['phishing', 'email security', 'url analysis', 'spf', 'dkim', 'dmarc'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. Analysis is heuristic and explainable; no detection-efficacy claims are made.',
    featured: true,
    caseStudy: {
      title: 'PhishLens: suspicious messages, analysed with their evidence',
      problem:
        'When a suspicious email arrives, the question is not “is this phishing?” but “what indicators are present, and what do they actually prove?” PhishLens was designed for explainable defensive analysis: parse headers, examine URL structure, surface sender mismatches and authentication evidence, and classify risk with the reasoning visible — while never automatically opening suspicious links.',
      users: [
        'Helpdesk and IT staff triaging reported messages',
        'Security-aware individuals checking their own mail',
        'Students learning email-forensics method',
      ],
      constraints: [
        'Never fetch or open suspicious URLs automatically — structural analysis only',
        'Indicators are indicators, not proof; classifications carry uncertainty',
        'Authentication evidence (SPF/DKIM/DMARC) is reported only when present in the message',
        'Defanged rendering of all external indicators',
      ],
      solution:
        'PhishLens analyses a submitted message (content and headers): routing headers are parsed into facts; sender/reply-to/display-name mismatches are listed; URL structure is analysed offline with defanged display; available SPF/DKIM/DMARC results are reported as message-provided evidence. The risk classification enumerates contributing indicators, each linked to its evidence, and states what the analysis cannot determine. Investigations persist with analyst notes and reports.',
      workflow: [
        {
          step: 'Submit',
          description:
            'The analyst pastes or uploads a message; nothing is sent to the message’s links or images.',
        },
        {
          step: 'Analyse',
          description:
            'Header, content, URL-structure, and authentication-evidence analyses run offline, producing indicator records.',
        },
        {
          step: 'Classify',
          description:
            'A risk classification is computed from indicator records, with each contribution explained and uncertainty stated.',
        },
        {
          step: 'Document',
          description:
            'The investigation is saved with notes and can export as a report.',
        },
      ],
      architecture:
        'A Python/FastAPI analysis core (header parser, URL structure analyser, authentication-evidence extractor, heuristic classifier) behind a React/TypeScript UI. Analyses run server-side offline — no outbound requests to indicators under analysis. SQLite or PostgreSQL stores investigations.',
      dataModel:
        'Messages (raw content) → HeaderFacts → Indicators (kind, evidence, defanged display) → Classifications (label, contributing indicators, uncertainty note) → Investigations (message ref, notes) → Reports.',
      engineeringDecisions: [
        {
          decision: 'No automatic link fetching, ever',
          rationale:
            'Analysing a phishing link by visiting it is the classic analyst hazard; structural analysis offline is the safe, testable boundary.',
        },
        {
          decision: 'Classification decomposes into indicator records',
          rationale:
            'The brief’s indicator-vs-proof distinction is enforced: every classification shows its parts and their limits.',
        },
      ],
      testing:
        'Header-parser fixtures (including malformed headers), URL-structure edge cases (defanging, encoding tricks), authentication-evidence extraction from message headers only, and classification tests asserting every label lists contributing indicators. Synthetic messages only (labelled fixtures); no live phishing is used.',
      securityPrivacy:
        'Submitted messages are sensitive; they are stored access-scoped, external indicators render defanged, and no content is fetched from the message under analysis.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Heuristic analysis; sophisticated messages can present few reliable indicators',
        'Authentication evidence is only as reliable as the message headers provided',
        'Not publicly deployed',
      ],
      futureImprovements: [
        'Optional configured reputation lookups for URLs (explicit, informed action)',
        'Batch triage queue for reported-message workflows',
      ],
    },
  },
  {
    slug: 'netscope',
    name: 'NetScope',
    companySlug: 'velaqori-systems',
    category: 'Cybersecurity',
    categories: ['Cybersecurity', 'Data Analysis'],
    purpose:
      'Processes authorized packet captures to summarize protocols, endpoints, traffic distribution, and potential anomalies.',
    summary:
      'A network traffic analysis workbench: PCAP/PCAPNG upload, packet parsing, protocol summaries, endpoint analysis, filters, visualization, capture comparison, and configurable anomaly indicators — offline processing of authorized captures.',
    status: 'BUILT',
    statusNote:
      'Built and tested locally with a dedicated frontend, backend, automated tests, documentation and local demo; not publicly deployed.',
    technologies: ['Python', 'FastAPI', 'React', 'TypeScript', 'Scapy', 'Pandas', 'PostgreSQL'],
    features: [
      {
        title: 'PCAP/PCAPNG parsing and summaries',
        description:
          'Authorized captures parse into protocol and endpoint summaries with filters.',
      },
      {
        title: 'Traffic visualization and packet inspection',
        description:
          'Distribution views and drill-down packet inspection over the parsed capture.',
      },
      {
        title: 'Configurable anomaly indicators',
        description:
          'Heuristic indicators are configurable and labelled as heuristics — not verdicts.',
      },
      {
        title: 'Capture comparison',
        description:
          'Two captures diff to show what changed in protocol and endpoint profile.',
      },
    ],
    keywords: ['pcap', 'network analysis', 'traffic', 'scapy', 'anomaly detection'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. Anomaly detection is heuristic; only authorized captures should be processed.',
    featured: false,
    caseStudy: {
      title: 'NetScope: packet captures, summarised honestly',
      problem:
        'Packet captures hold the ground truth of a network conversation, but raw PCAPs are unreadable at volume. NetScope was designed as an offline workbench for authorized captures: parse packets, summarise protocols and endpoints, visualise distribution, inspect packets, compare captures, and surface configurable anomaly indicators — with the limits of heuristic detection stated.',
      users: [
        'Network administrators analysing their own authorised captures',
        'Incident responders scoping network activity',
        'Students learning protocol analysis',
      ],
      constraints: [
        'Offline processing of authorized captures only — no live capture claims',
        'Anomaly indicators are heuristics with false-positive/false-negative limits',
        'Large captures need streaming parsing with bounded memory',
      ],
      solution:
        'NetScope parses uploaded PCAP/PCAPNG files with Scapy/PyShark-class tooling into aggregated views: protocol summaries, endpoint profiles, traffic distributions, and filterable packet inspection. Configurable indicators flag potential anomalies; capture comparison diffs two captures’ profiles; reports document what was analysed and by which indicator set.',
      workflow: [
        {
          step: 'Upload',
          description:
            'An authorized capture is uploaded; parsing streams packets into aggregates with coverage notes.',
        },
        {
          step: 'Explore',
          description:
            'Protocol summaries, endpoint views, and filters guide inspection down to individual packets.',
        },
        {
          step: 'Compare',
          description:
            'Two captures diff; indicators run over the parse; a report records method and scope.',
        },
      ],
      architecture:
        'A Python/FastAPI service runs a streaming packet-parse pipeline (Scapy or PyShark) into PostgreSQL with Pandas-powered aggregation endpoints; the React/TypeScript UI renders visualisations and packet drill-down. Background workers handle large captures so uploads do not block.',
      dataModel:
        'Captures (file, scope note, parsed coverage) → Packets (parsed fields, offsets) → Aggregates (protocol, endpoint, distribution) → Indicators (config, matches) → Comparisons → Reports.',
      engineeringDecisions: [
        {
          decision: 'Streaming parse with coverage reporting',
          rationale:
            'Large captures must parse within memory bounds, and partial parses must say so rather than pretending completeness.',
        },
        {
          decision: 'Indicators are configuration, not code paths',
          rationale:
            'Heuristic rules change often; keeping them declarative makes their limits documentable and testable.',
        },
      ],
      testing:
        'Parser tests against generated fixture captures (crafted packets covering the supported protocol set), aggregation correctness on known mixes, indicator-config evaluation tests, and coverage reporting. No external traffic is captured in tests; fixtures are generated locally.',
      securityPrivacy:
        'Captures can contain credentials and personal data; they are processed locally, access-scoped, and deleted on request; reports state their capture scope.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Offline analysis of uploaded captures — no live monitoring',
        'Heuristic anomaly indicators with documented limits',
        'Not publicly deployed',
      ],
      futureImprovements: [
        'Additional protocol decoders as needed',
        'Side-by-side visual capture diff',
      ],
    },
  },
];
