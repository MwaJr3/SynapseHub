import type { Project } from '@/types/project';
import { projectLinks } from '@/config/projectLinks';

const links = projectLinks('securecode-workbench');

export const secureCodeWorkbench: Project = {
  id: 'prj-securecode-workbench',
  slug: 'securecode-workbench',
  name: 'SecureCode Workbench',
  tagline: 'Make security findings understandable and actionable.',
  summary:
    'A static application security review platform that runs established analyzers over submitted source code and turns their output into a prioritised, trackable remediation workflow.',
  description: [
    'SecureCode Workbench helps developers inspect source code for supported security weaknesses using established static-analysis tooling, then organises the technical output into a review workflow a team can actually work through.',
    'The application is an orchestrator and a review layer, not a new analyzer. Bandit provides Python security checks; a local secret-scanning tool provides hardcoded-credential detection; the architecture allows additional analyzers or languages to be added behind the same adapter interface.',
    'The central design position is that a tool-reported finding is not a verified vulnerability. Every finding carries its rule identifier, severity, file and line reference, evidence snippet, an explanation, a recommended remediation, and a review status that a human sets — including False Positive and Accepted Risk.',
  ],
  categories: ['Software Security', 'Developer Tools', 'Full-Stack Engineering'],
  filters: ['application-security', 'developer-tools', 'cybersecurity', 'full-stack'],
  tech: [
    'Python',
    'FastAPI',
    'Pydantic',
    'SQLAlchemy',
    'Alembic',
    'PostgreSQL',
    'Bandit',
    'Local secret-scanning adapter',
    'React',
    'TypeScript',
    'Tailwind CSS',
    'pytest',
  ],
  keyTech: ['Python', 'FastAPI', 'Bandit', 'React', 'PostgreSQL'],
  featured: true,
  order: 7,
  status: 'Complete — analyzer adapters, review workflow and scan comparison',
  year: '2025',
  role: 'Design, sandboxed tool orchestration, review model, frontend',
  accent: 'rose',
  capabilities: [
    'Sandboxed, resource-bounded orchestration of established static analyzers',
    'Finding lifecycle with false-positive and accepted-risk states',
  ],
  features: [
    {
      title: 'Source submission with archive hardening',
      body: 'Submit individual files or an archive. Archives are validated before extraction: entry count, uncompressed size, per-file size, symlink rejection and path-traversal checks, so a malicious or accidentally enormous archive cannot escape its directory or exhaust the disk.',
    },
    {
      title: 'Analyzer adapters',
      body: 'Each analyzer is an adapter that declares its language, capabilities and output format, runs with resource limits, and returns a normalised finding list. Bandit is integrated for Python; a local secret scanner covers credential detection. Adapters run without network access.',
    },
    {
      title: 'Normalised findings',
      body: 'Rule identifier, severity, confidence, category, file, line, evidence snippet (redacted where a secret is involved), explanation, remediation guidance and a documentation link where the analyzer supplies one.',
    },
    {
      title: 'Secret detection that does not leak secrets',
      body: 'When a hardcoded credential is found, the stored and displayed evidence is masked — enough to locate the line, not enough to use the value. Detection runs locally; source code is not transmitted to any external service.',
    },
    {
      title: 'Review lifecycle',
      body: 'Each finding moves through Open → In Review → Fixed / Accepted Risk / False Positive, with reviewer comments, remediation notes and timestamps. False positives can be suppressed for future scans of the same rule and location pattern.',
    },
    {
      title: 'Historical scan comparison',
      body: 'Compare two scans of a project to see new findings, resolved findings and still-open items, which turns a wall of results into a delta a team can act on in a sprint.',
    },
    {
      title: 'Project dashboard and reports',
      body: 'Severity distribution, category breakdown, remediation status, mean time to resolve, scan history, and an exportable report grouped by category, severity and status.',
    },
  ],
  demonstrates: [
    'Integrating established developer tooling behind a stable adapter interface',
    'Secure processing of untrusted submitted code',
    'Static-analysis orchestration with resource limits',
    'Parsing and normalising structured tool output',
    'Application security concepts in practice',
    'Finding lifecycle and remediation workflow design',
  ],
  caseStudyFocus:
    'The pipeline from source submission to analysis, structured findings, developer review and remediation — and why automated static analysis should support security review rather than replace it.',
  visualDirection:
    'Clean developer-security interface: project overview, severity summary, searchable findings, source locations, remediation status. Code typography and a restrained technical aesthetic readable in both themes.',
  preview: {
    visual: 'securecode-workbench',
    alt: 'Representative SecureCode Workbench preview: a severity summary bar, a findings table with rule identifiers and file locations, and a code snippet panel with masked secret evidence.',
    screenshotNote:
      'Hand-drawn representative preview built from the implemented feature set, not a screenshot of a deployed instance. Set preview.screenshot to replace it.',
  },
  liveUrl: links.live,
  repoUrl: links.repo,
  needsAuthorReview: [
    'challenges — confirm the wording matches your own implementation history',
    'architecture — list only the analyzers you actually integrated',
  ],
  caseStudy: {
    problem: [
      'Static analysis tools are good at finding patterns and poor at telling a team what to do next. Running Bandit on a real codebase produces a few hundred findings, most of which are low severity, and the usual outcome is that the output is closed and never reopened.',
      'The opposite failure is trusting the output. A finding is a pattern match with a confidence level; it is not proof of an exploitable vulnerability, and treating it as proof wastes developer time and credibility.',
      'There is also a handling problem: the submitted code is untrusted. An archive can contain path traversal, symlinks or a decompression bomb, and the analyzer itself runs code-adjacent logic that must be constrained.',
    ],
    whoBenefits: [
      'Python developers who want security feedback inside their normal workflow',
      'Software engineering students learning what static analysis does and does not establish',
      'Application-security learners practising triage and remediation tracking',
      'Small development teams with no dedicated security reviewer',
    ],
    objectives: [
      'Run established analyzers safely over untrusted submitted code with hard resource limits.',
      'Normalise heterogeneous tool output into one finding model with rule provenance.',
      'Make findings actionable: explanation, remediation, location, and a review state a human owns.',
      'Track remediation over time so progress is measurable.',
      'Keep source code local by default — no silent upload to any external service.',
    ],
    solution: [
      'Submission, analysis and review are three separate subsystems joined by a normalised finding record.',
      'Submission hardens the input before anything reads it: extension and structure validation, entry-count and size ceilings, symlink and device-file rejection, and extraction into a per-scan temporary directory with paths canonicalised and re-checked after extraction. The scan workspace is disposable.',
      'Analysis is orchestrated by a runner that invokes each configured adapter as a subprocess with a timeout, memory and CPU limits and no network access. Adapters parse their tool\'s structured output (Bandit\'s JSON report, the secret scanner\'s result format) into findings. A failed or timed-out adapter marks itself failed and does not block the others, so a scan can complete partially and say so.',
      'Review is where the product earns its keep. Findings are deduplicated across scans by a fingerprint (rule id, file path, normalised code context) so the same issue keeps its history, comments and status instead of being recreated as a new item every run. Status changes are human actions with attribution, and the comparison view reports new / resolved / persistent findings per scan.',
    ],
    workflow: {
      title: 'From source submission to remediation',
      steps: [
        { label: 'Submit', detail: 'Files or hardened archive extraction' },
        { label: 'Plan', detail: 'Select adapters by language and configuration' },
        { label: 'Analyse', detail: 'Sandboxed subprocess per adapter, bounded resources' },
        { label: 'Normalise', detail: 'Tool output mapped to one finding model' },
        { label: 'Deduplicate', detail: 'Fingerprint match preserves history and status' },
        { label: 'Review', detail: 'Triage, comment, mark false positive or fix' },
        { label: 'Report', detail: 'Severity, category, status and scan comparison' },
      ],
      caption:
        'Adapter failures are isolated: a scan reports which adapters succeeded, which failed and why.',
    },
    architecture: {
      summary:
        'FastAPI backend with a hardened submission path, a subprocess-based analyzer runner and a fingerprint-deduplicated finding store; React frontend for triage and reporting.',
      layers: [
        {
          layer: 'Submission & workspace',
          items: [
            'Extension, structure, entry-count and size validation',
            'Path-traversal, symlink and absolute-path rejection',
            'Disposable per-scan workspace with guaranteed cleanup',
            'File inventory recorded with hashes for reproducibility',
          ],
        },
        {
          layer: 'Analyzer runner',
          items: [
            'Adapter interface: capabilities, languages, run, parse',
            'Subprocess isolation with timeout, memory and CPU limits',
            'No network access for analyzer processes',
            'Per-adapter failure isolation and structured error reporting',
          ],
        },
        {
          layer: 'Findings model (SQLAlchemy, PostgreSQL)',
          items: [
            'Scans, findings, fingerprints, comments, status history',
            'Severity, confidence, category and rule provenance per finding',
            'Masked evidence storage for secret detections',
            'Indexes supporting filter, sort and comparison queries',
          ],
        },
        {
          layer: 'Frontend (React, TypeScript)',
          items: [
            'Project overview with severity and remediation summaries',
            'Sortable, filterable findings table with code-location view',
            'Triage actions, comments and suppression management',
            'Scan comparison and exportable report',
          ],
        },
      ],
      security: [
        'Submitted code is data, never an executed project. Routine static analysis does not run the submitted code.',
        'Archives are validated against path traversal, symlinks and archive-bomb characteristics before and after extraction.',
        'Analyzers run in a restricted subprocess with CPU, memory, file-count and wall-clock limits and no network access.',
        'Detected secrets are masked in storage and in the UI; only location and a short redacted prefix are retained.',
        'No optional external integration is enabled silently — anything that would transmit source code requires explicit configuration and a documented disclosure.',
      ],
    },
    decisions: [
      {
        title: 'Fingerprint findings across scans',
        context:
          'Without stable identity, every scan creates a fresh set of findings. Comments, false-positive decisions and remediation status are lost each run, which is why teams abandon these tools.',
        decision:
          'A finding\'s identity is a fingerprint of (rule id, file path, normalised surrounding code). New scans match against existing fingerprints: matched findings keep their status and history, unmatched ones become new findings, and previously matched findings absent from the new scan are marked resolved.',
        tradeoff:
          'Refactoring that moves code can produce a false "resolved plus new" pair, and fingerprint tuning takes iteration. Without it, remediation tracking is impossible and the tool measures noise rather than progress.',
      },
      {
        title: 'Adapters run as constrained subprocesses',
        context:
          'Importing Bandit as a library is faster and simpler than spawning a process.',
        decision:
          'Analyzers run as subprocesses with timeouts, memory limits and no network access, communicating through their structured output files. Adapter code parses that output and never imports analyzer internals.',
        tradeoff:
          'Process overhead per scan and a parsing layer that must cope with tool output changes. It contains a crash or a pathological input to one adapter, enforces real resource ceilings, and keeps the option to run analyzers in a stronger sandbox later without redesigning the interface.',
      },
      {
        title: 'Findings are reports, not verdicts',
        context:
          'The interface could show "3 vulnerabilities found", which reads as fact and will be wrong often enough to destroy trust.',
        decision:
          'Findings are labelled with the rule that produced them, the tool\'s own confidence, and a standing note that static analysis reports patterns for review. Status vocabulary includes False Positive and Accepted Risk as normal, expected outcomes.',
        tradeoff:
          'Less alarming, which some stakeholders initially read as less valuable. It keeps the tool credible over months of use, and it makes the review data — which findings were real — genuinely useful.',
      },
    ],
    testing: {
      summary:
        'Tests cover submission hardening, adapter parsing, fingerprint stability and authorisation, with deliberately hostile fixtures.',
      items: [
        {
          title: 'Archive hardening tests',
          body: 'Path traversal entries, absolute paths, symlink entries, entry-count bombs, uncompressed-size bombs, unsupported formats and empty archives — each must be rejected with a specific reason and must leave no partial workspace behind.',
        },
        {
          title: 'Adapter parsing tests',
          body: 'Recorded Bandit JSON output mapped to normalised findings, including unknown rule ids, missing line numbers, findings in generated files, and a schema variation.',
        },
        {
          title: 'Fingerprint tests',
          body: 'The same issue across two scans keeps its status; a moved function is handled as documented; a genuinely fixed issue is marked resolved; a reintroduced issue reopens rather than duplicating.',
        },
        {
          title: 'Resource-limit tests',
          body: 'A stub adapter that exceeds the timeout and one that exceeds the memory limit both fail in isolation without affecting other adapters or the API worker.',
        },
        {
          title: 'Secret-masking tests',
          body: 'Detected credentials are masked in the stored evidence and in API responses, and the raw value never appears in any response payload or log.',
        },
        {
          title: 'Authorisation tests',
          body: 'Project ownership on read, triage, suppression and delete, plus report export scoping.',
        },
      ],
    },
    challenges: [
      {
        problem:
          'Analyzer output volume. A first scan of a mid-sized codebase can return several hundred findings, which is indistinguishable from failure to the person who requested it.',
        approach:
          'The first scan of a project is presented as a baseline: severity distribution, top categories, and a suggested triage order starting with high-confidence high-severity findings in non-generated, non-vendored files. Exclusion patterns for vendor and test directories are configurable per project.',
        reasoning:
          'Triage order is a product decision, not a sorting option. Presenting a baseline with a starting point converts an overwhelming list into a first task.',
        lesson:
          'When a tool produces more output than a human can act on, the tool owes them a prioritisation policy, not just filters.',
      },
      {
        problem:
          'Detecting hardcoded secrets means the scanner reads the very values it is reporting, so the finding can become a second copy of the leak.',
        approach:
          'Evidence is masked at parse time — the finding stores file, line, secret type and a short redacted prefix, never the full value. API responses and exports are generated from the masked record, and logs never include evidence content.',
        reasoning:
          'A security tool that widens the exposure it is meant to reduce is worse than no tool. Masking at the earliest point means no later layer can accidentally leak it.',
        lesson:
          'Redact at ingestion, not at presentation. Anything that reaches a serializer has already had too many chances to be logged.',
      },
      {
        problem:
          'Balancing safety against usefulness when analyzing untrusted code.',
        approach:
          'Layered constraints: archive validation, a disposable workspace, subprocess limits, no network for analyzers, and no execution of submitted projects as part of routine analysis. Each layer is independently tested.',
        reasoning:
          'No single control is sufficient. The layers are cheap individually and together they make the failure mode "scan fails safely" rather than "server compromised".',
        lesson:
          'For untrusted input, design the failure mode first and the happy path second.',
      },
    ],
    demonstration: {
      summary:
        'A sample Python project containing deliberate, clearly documented weaknesses ships with the application so a full scan-and-triage cycle can be demonstrated.',
      steps: [
        {
          title: 'Create a project and submit source',
          body: 'Upload individual files or an archive. Validation and workspace preparation are reported with progress.',
        },
        {
          title: 'Run the scan',
          body: 'Configured adapters execute under resource limits. Scan status shows which adapters succeeded and which failed, with reasons.',
        },
        {
          title: 'Triage findings',
          body: 'Filter by severity, category, rule or file. Open a finding to read its explanation, evidence, remediation guidance and rule documentation link, then set a status and comment.',
        },
        {
          title: 'Compare and report',
          body: 'Fix something, rescan, and see new / resolved / persistent findings. Export a report grouped by category, severity and status.',
        },
      ],
      accessNote:
        'Sample findings shipped with the project are labelled as demonstration content. Analyzers require no credentials; only optional external integrations would, and none are enabled by default.',
    },
    limitations: [
      'Static analysis reports patterns for human review. It cannot prove exploitability, and a clean scan does not mean the code is secure.',
      'Python is the implemented language target. Additional languages require new adapters, which the interface supports but which are not yet written.',
      'Coverage depends on which analyzers are configured and installed in the deployment environment; a missing analyzer is reported as unavailable rather than silently skipped.',
      'Findings are deduplicated by fingerprint, so large refactors can present a move as a resolve-plus-new pair that requires manual reconciliation.',
      'No dynamic analysis, dependency vulnerability scanning or infrastructure review — those are separate tools with separate models.',
      'Secret detection is pattern-based; novel or unusual credential formats can be missed.',
    ],
  },
};
