import type { Project } from '@/types/project';
import { projectLinks } from '@/config/projectLinks';

const links = projectLinks('phishlens');

export const phishLens: Project = {
  id: 'prj-phishlens',
  slug: 'phishlens',
  name: 'PhishLens',
  tagline: 'Understand the warning signs. Investigate before you trust.',
  summary:
    'A defensive security tool that evaluates suspicious emails and URLs, then explains exactly which indicators drove the risk classification.',
  description: [
    'PhishLens helps users assess potentially malicious emails and suspicious URLs through explainable, defensive analysis. Paste raw email content, upload a supported .eml or .txt file, or submit a single URL — the application parses what is actually there and reports what it found.',
    'The design decision behind PhishLens is that a bare risk score is not useful. Instead of returning a mysterious number, the tool shows each indicator that contributed to the assessment, why that indicator matters, how strongly it should be weighted, and what defensive action follows from it.',
    'Analysis is deterministic and local. PhishLens does not visit suspicious destinations, does not execute attachments, and does not forward submitted email content to a third party. Where authentication evidence (SPF, DKIM, DMARC) is present in the headers it is interpreted; where it is absent, that absence is reported as missing evidence rather than as a failure.',
  ],
  categories: ['Security Analysis', 'Full-Stack Engineering'],
  filters: ['cybersecurity', 'application-security', 'full-stack'],
  tech: [
    'Python',
    'FastAPI',
    'Pydantic',
    'SQLAlchemy',
    'Alembic',
    'PostgreSQL',
    'React',
    'TypeScript',
    'Tailwind CSS',
    'Vitest',
    'pytest',
  ],
  keyTech: ['Python', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL'],
  featured: true,
  order: 1,
  status: 'Built — rule-based analysis engine complete and tested as a Python CLI in apps/phishlens, and delivered as the full-stack application described in this case study at projects/phishlens (FastAPI + PostgreSQL-ready backend with Alembic migrations, React frontend, backend and frontend tests)',
  year: '2025',
  role: 'Design, backend, frontend, testing',
  accent: 'cyan',
  capabilities: [
    'Explainable risk classification instead of an opaque score',
    'Header parsing that separates missing evidence from failed evidence',
  ],
  features: [
    {
      title: 'Email and header analysis',
      body: 'Accepts pasted message text, raw headers, or an uploaded .eml / .txt file. The parser extracts From, Reply-To, Return-Path, Received chains, Message-ID, Date, and the Authentication-Results header, and reports fields that could not be parsed rather than silently dropping them.',
    },
    {
      title: 'URL analysis without visiting the destination',
      body: 'Links found in the message body and in display-text/href mismatches are analysed statically: hostname structure, subdomain depth, punycode and percent-encoding, credential-in-URL patterns, IP-address hosts, look-alike brand tokens, redirector patterns and TLD risk. No request is made to the suspicious host.',
    },
    {
      title: 'Explainable findings',
      body: 'Every indicator is emitted as a structured finding with an identifier, a plain-language title, the evidence that triggered it, a severity, a weight, and a recommended defensive action. The UI groups findings by severity and links each one back to the exact header or URL fragment it came from.',
    },
    {
      title: 'Authentication evidence handling',
      body: 'SPF, DKIM and DMARC results are read from Authentication-Results and Received-SPF where present. The engine distinguishes pass / fail / softfail / neutral / temperror / permerror / not-present, because "no SPF record found in this email" and "SPF check failed" are different facts with different implications.',
    },
    {
      title: 'Risk classification with an audit trail',
      body: 'Findings are combined into Low, Medium, High or Needs Review. Needs Review is a first-class outcome for messages where the evidence is genuinely incomplete — the tool will not manufacture confidence it does not have.',
    },
    {
      title: 'Case management',
      body: 'Authenticated users keep a searchable analysis history with filters for classification, indicator type and date, plus per-case investigation notes, a false-positive mark, and Markdown/JSON report export.',
    },
  ],
  demonstrates: [
    'Security-oriented application development',
    'Text and URL analysis in Python',
    'Backend engineering with FastAPI and Pydantic',
    'Explainable, testable rule design',
    'Input validation and safe file handling',
    'Structured findings and report generation',
    'Designing an interface around technical results',
  ],
  caseStudyFocus:
    'Communicating security risk without overwhelming the user, and without presenting heuristic findings as proof.',
  visualDirection:
    'Clean security-analysis interface: prominent submission area, readable findings, restrained risk colour, detailed analysis view. No decorative hacker imagery.',
  preview: {
    visual: 'phishlens',
    alt: 'Representative PhishLens interface preview: an email submission panel on the left and a list of weighted security findings with a risk classification on the right.',
    screenshotNote:
      'This is a hand-drawn, representative preview built from the implemented feature set — not a screenshot of a deployed instance. Replace it by setting preview.screenshot for this project.',
  },
  liveUrl: links.live,
  repoUrl: links.repo,
  needsAuthorReview: [
    'challenges — confirm the wording matches your own implementation history',
  ],
  caseStudy: {
    problem: [
      'Phishing remains one of the most common entry points into an account or an organisation, and the people who first see a suspicious message are often not security specialists. The usual options are unhelpful: either ignore it, or forward it to someone and wait.',
      'Automated verdicts make this worse. A single number or a red banner tells the recipient nothing about *why* a message looks wrong, so they cannot apply the reasoning to the next one. And when the verdict is wrong, trust in the whole tool collapses.',
      'There is also a real cost to false confidence. Telling someone a message is "safe" because no single indicator fired is exactly the mistake that leads to a compromised account.',
    ],
    whoBenefits: [
      'Students learning how phishing analysis is actually performed',
      'Security analysts triaging user-reported messages',
      'IT support teams who need a defensible explanation for their advice',
      'Individuals who want to check a suspicious email or link before acting',
    ],
    objectives: [
      'Produce an explainable assessment: every classification must be traceable to specific evidence in the submitted artifact.',
      'Never overstate certainty — missing evidence, unavailable reputation data and weak heuristics must be visibly distinct from confirmed failures.',
      'Analyse safely: no automatic fetching of suspicious URLs, no execution of attachments, no exfiltration of message content.',
      'Teach as it works, so a non-specialist finishes an analysis understanding more than when they started.',
      'Keep the analysis rules modular and unit-testable, independent of the web layer.',
    ],
    solution: [
      'PhishLens separates three concerns that are usually tangled together: extraction (what is in this artifact?), evaluation (what does each extracted fact imply?), and presentation (how should a human read the result?).',
      'The extraction layer is a parser package. It accepts pasted text or an uploaded file and produces a normalised `EmailArtifact` or `UrlArtifact` — a plain data object with headers, bodies, embedded links, and a list of parse warnings. Parsers never decide anything about risk.',
      'The evaluation layer is a registry of independent indicator rules. Each rule receives the normalised artifact and returns zero or more `Finding` objects: an id, category, severity, weight, the evidence snippet, an explanation, and a recommended action. Rules know nothing about HTTP, the database, or the UI.',
      'The classification service aggregates findings into a risk level using an explicit, documented policy, then stores the case with its findings, notes and timestamps. Because findings are data rather than formatted strings, the same case can be rendered on screen, exported as Markdown, or re-scored later if a rule is tuned.',
    ],
    workflow: {
      title: 'From submission to explainable verdict',
      steps: [
        { label: 'Submit', detail: 'Paste text, upload .eml/.txt, or submit a URL' },
        { label: 'Validate', detail: 'Size, encoding and structure checks before parsing' },
        { label: 'Parse', detail: 'Normalise headers, bodies and embedded links' },
        { label: 'Evaluate', detail: 'Run independent indicator rules' },
        { label: 'Classify', detail: 'Aggregate findings into a risk level' },
        { label: 'Explain', detail: 'Render evidence, severity and recommended actions' },
        { label: 'Retain', detail: 'Save case, notes and exportable report' },
      ],
      caption:
        'Each stage is a separate module with its own tests. A failure in parsing produces a recoverable error, never a fabricated analysis.',
    },
    architecture: {
      summary:
        'A FastAPI backend with a pluggable rule engine, a PostgreSQL-backed case store, and a React/TypeScript frontend that renders structured findings.',
      layers: [
        {
          layer: 'Frontend (React, TypeScript, Tailwind CSS)',
          items: [
            'Submission form with client-side validation and file-type checks',
            'Findings view grouped by severity with evidence expansion',
            'Case history table with search, filters and sorting',
            'Case detail screen with notes, false-positive marking and export',
          ],
        },
        {
          layer: 'API (FastAPI, Pydantic)',
          items: [
            'Request/response models for artifacts, findings and cases',
            'Authenticated case CRUD endpoints with ownership checks',
            'Consistent error envelope that never leaks stack traces',
            'Upload endpoint with size, MIME and extension validation',
          ],
        },
        {
          layer: 'Analysis engine (pure Python)',
          items: [
            'Email and URL parsers producing normalised artifacts',
            'Indicator rule registry with severity, weight and remediation text',
            'Authentication-result interpreter (SPF / DKIM / DMARC)',
            'Classification policy with an explicit Needs Review outcome',
          ],
        },
        {
          layer: 'Persistence (SQLAlchemy, Alembic, PostgreSQL)',
          items: [
            'Cases, findings, notes and audit timestamps',
            'Indexes on owner, classification and created date',
            'SQLite supported for local development via configuration',
          ],
        },
      ],
      security: [
        'Submitted content is treated as untrusted data: no HTML from a message body is ever rendered as markup.',
        'No outbound request is made to a suspicious host during analysis.',
        'Uploads are size-limited, scanned for structure, and stored outside the web root.',
        'Authorisation is enforced on the server for every read, update, export and delete.',
      ],
    },
    decisions: [
      {
        title: 'Findings are data, not strings',
        context:
          'The simplest implementation would have each rule return a sentence to display, and the risk level would be whatever the most severe sentence implied.',
        decision:
          'Every rule returns a structured Finding (id, category, severity, weight, evidence, explanation, action). The UI, the Markdown export and the classification policy all consume the same object.',
        tradeoff:
          'More up-front modelling and a longer type surface. In exchange, the scoring policy can be tuned without touching presentation, exports stay faithful to what was evaluated, and each rule can be unit-tested by asserting on fields rather than on prose.',
      },
      {
        title: '"Missing evidence" is its own state',
        context:
          'Most phishing tools treat an absent SPF result and a failed SPF result as the same signal, which quietly inflates risk for legitimate mail sent through platforms that simply do not publish results in the headers provided.',
        decision:
          'The authentication interpreter returns an explicit enum that includes not-present, and the UI labels it "no authentication result found in this message". Missing evidence can contribute a small amount to a Needs Review outcome but never counts as a failure.',
        tradeoff:
          'The verdict is less decisive for a large share of real messages. That is the correct behaviour: an honest "I cannot tell from this evidence" is more useful than a confident guess.',
      },
      {
        title: 'No network access during analysis',
        context:
          'Fetching a suspicious URL would produce richer signals — redirect chains, landing-page content, certificate details.',
        decision:
          'The analysis path performs no outbound requests to user-supplied hosts. URL evaluation is purely lexical and structural, and any reputation enrichment is an explicit, separately configured action with its own disclosure.',
        tradeoff:
          'Fewer signals, and some genuinely malicious links will not be flagged. It also removes an SSRF surface, prevents the tool from becoming part of an attack chain, and keeps submitted content from leaking to attacker-controlled infrastructure.',
      },
    ],
    testing: {
      summary:
        'The test suite targets the parts where being wrong is expensive: parsing, indicator behaviour, classification policy, file validation and authorisation. Verified current suite: 12 backend tests (pytest) and 2 frontend tests (vitest) pass.',
      items: [
        {
          title: 'Parser tests',
          body: 'Well-formed messages, messages with folded headers, non-ASCII display names, missing Message-ID, malformed Authentication-Results, truncated files and empty input. Each asserts on the normalised artifact and on the parse warnings produced.',
        },
        {
          title: 'Indicator rule tests',
          body: 'One test per rule covering a triggering fixture, a non-triggering fixture, and the boundary case (for example a domain that contains a brand token as a legitimate substring).',
        },
        {
          title: 'Classification policy tests',
          body: 'Asserts that specific combinations of findings map to the documented risk level, including the Needs Review path for incomplete evidence.',
        },
        {
          title: 'API and authorisation tests',
          body: 'Ownership enforcement on case read/update/delete, rejection of oversized and disallowed uploads, and the shape of error responses.',
        },
        {
          title: 'Frontend tests',
          body: 'Submission flow, validation messages, findings rendering, filter behaviour and the empty-history state.',
        },
      ],
    },
    challenges: [
      {
        problem:
          'Real-world headers are inconsistent. The same authentication outcome appears in Authentication-Results, Received-SPF, or only as free text in a Received chain — and some mail systems rewrite all three.',
        approach:
          'The interpreter reads sources in a documented priority order, records which source each result came from, and emits a warning when sources disagree instead of picking one silently.',
        reasoning:
          'Provenance matters more than a tidy answer. An analyst who can see that DMARC came from a gateway rewrite rather than the receiving MTA can judge how much to trust it.',
        lesson:
          'Normalisation layers should preserve disagreement, not resolve it. Conflict is information.',
      },
      {
        problem:
          'A message can carry many weak indicators and no strong one. Summing weights makes it "High"; taking the maximum makes it "Low". Both are wrong.',
        approach:
          'Classification uses a maximum-severity floor plus a bounded contribution from lower-severity findings, with a hard rule that incomplete evidence routes to Needs Review.',
        reasoning:
          'It reproduces how an analyst actually reasons — one strong signal dominates, but accumulation of weak signals legitimately raises suspicion — while keeping the policy small enough to document and test exhaustively.',
        lesson:
          'If a scoring rule cannot be written down in a paragraph and tested in a table, it is too complicated to defend to a user.',
      },
      {
        problem:
          'Explaining risk without either scaring people or reassuring them incorrectly.',
        approach:
          'Findings always render with three parts: the evidence, what it means, and what to do next. Colour is never the only carrier of severity — every level has a text label and an icon.',
        reasoning:
          'Accessibility requires it, but it also improves the security outcome: a user who reads "reply-to differs from the sending domain" learns a transferable check.',
        lesson:
          'Explainability is a UI constraint as much as a data constraint, and it has to be designed for from the first schema.',
      },
    ],
    demonstration: {
      summary:
        'The core workflow needs no external service: paste a message, read the findings, save the case, export the report.',
      steps: [
        {
          title: 'Submit an artifact',
          body: 'Paste raw email text with headers, upload a .eml or .txt file, or submit a single URL. Validation runs client-side and again on the server.',
        },
        {
          title: 'Read the classification',
          body: 'The summary panel shows the risk level, the count of findings by severity, and the specific evidence that drove the outcome.',
        },
        {
          title: 'Inspect individual findings',
          body: 'Expand any finding to see the triggering fragment, why it matters, and the recommended defensive action.',
        },
        {
          title: 'Record the investigation',
          body: 'Add notes, mark a false positive, and export the case as a Markdown or JSON report with source attribution and timestamps.',
        },
      ],
      accessNote:
        'No demo credentials are published here. If a hosted instance is configured later, its URL and access method will appear in the project actions above.',
    },
    limitations: [
      'Analysis is heuristic. A Low classification means no configured indicator fired — it is not proof that a message is safe, and the interface says so explicitly.',
      'No live DNS, SPF, DKIM or DMARC lookups are performed. Authentication results can only be interpreted when the submitting mail system included them in the headers.',
      'Reputation enrichment depends on an external provider being configured with credentials; without one, those checks report as unavailable rather than as clean.',
      'Attachment analysis is limited to metadata and structure. Attachments are never executed or unpacked into an interpreter.',
      'Display-text/href mismatch detection depends on the submitted content preserving HTML; a plain-text paste loses that signal.',
    ],
  },
};
