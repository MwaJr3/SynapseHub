import type { Project } from '@/types/project';
import { projectLinks } from '@/config/projectLinks';

const links = projectLinks('hashsight');

export const hashSight: Project = {
  id: 'prj-hashsight',
  slug: 'hashsight',
  name: 'HashSight',
  tagline: 'Identify files. Examine reputation. Understand the evidence.',
  summary:
    'A file-hash and reputation investigation tool that computes hashes locally, queries configured reputation providers only when you ask, and refuses to call "no detections" the same thing as "safe".',
  description: [
    'HashSight calculates cryptographic hashes of a local file and helps users investigate whether that file is a known indicator, using configurable reputation providers. Files are never executed, and by default they are never uploaded — hashing happens locally and only the resulting digest is sent, only when the user explicitly requests a lookup.',
    'The distinction the application is built around is between three different things: a file\'s identity (its hash), a reputation provider\'s report about that hash at a point in time, and a safety determination. HashSight reports the first two faithfully and refuses to produce the third.',
    'Results are recorded with provider, timestamp and raw response summary, so an investigation can show what was known when — including when providers disagreed or when a provider was unavailable.',
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
    'hashlib',
    'httpx',
    'React',
    'TypeScript',
    'Tailwind CSS',
    'pytest',
  ],
  keyTech: ['Python', 'FastAPI', 'hashlib', 'React', 'PostgreSQL'],
  featured: false,
  order: 5,
  status: 'Complete — local hashing with pluggable reputation connectors',
  year: '2025',
  role: 'Design, hashing and connector layer, case management, frontend',
  accent: 'teal',
  capabilities: [
    'Local hashing with no automatic upload of file content',
    'Reputation results reported with provider, timestamp and explicit unknown states',
  ],
  features: [
    {
      title: 'Local hash computation',
      body: 'SHA-256 always; SHA-1 and MD5 available for compatibility with older indicator sets. Files are read in bounded chunks so a large file does not exhaust memory, and hashing happens on the server only after upload, or in the browser for the hash-only mode where the file never leaves the machine.',
    },
    {
      title: 'Honest algorithm guidance',
      body: 'MD5 and SHA-1 results are shown with a standing note that neither should be relied on where collision resistance matters. They exist because indicator databases still contain them, not because they are good identifiers.',
    },
    {
      title: 'Configurable reputation providers',
      body: 'Providers are registered server-side with credentials held in environment configuration. Each connector implements one interface and returns a normalised result: status, detections, total scanned, last analysis time, category labels and the provider\'s permalink where available.',
    },
    {
      title: 'Explicit result states',
      body: 'Known malicious, No known detection, Unknown (never seen by the provider), Unavailable (provider not configured, rate-limited or erroring) and Conflicting (providers disagree) are five distinct states with distinct presentation. "No known detection" is never rendered as safe.',
    },
    {
      title: 'Disclosure before disclosure of data',
      body: 'A hash lookup sends the digest to a third party, which is itself information disclosure. The lookup action is explicit, shows which providers will be queried, and records the consent in the case history.',
    },
    {
      title: 'Investigation cases',
      body: 'Save a file record with its hashes, metadata, provider results, analyst notes and a disposition. Cases are searchable by hash prefix, filename, disposition and date, and exportable as a report that includes the source and time of every lookup.',
    },
    {
      title: 'Scan history',
      body: 'A hash examined last month can be re-checked to see whether reputation changed. History entries retain the original response summary rather than only the latest state.',
    },
  ],
  demonstrates: [
    'File processing with strict resource bounds',
    'Hashing and integrity concepts applied correctly',
    'Third-party API integration behind a modular connector',
    'Normalising heterogeneous provider responses',
    'Privacy-conscious design and explicit consent flows',
    'Evidence-based reporting',
  ],
  caseStudyFocus:
    'The difference between a file\'s identity, a reputation provider\'s result and a definitive safety determination — and how the application communicates unknown results, conflicting sources and unavailable providers.',
  visualDirection:
    'Focused file-analysis workspace: submission area, clearly displayed hash values with copy controls, reputation detail per provider, source information, investigation history. No visual convention that implies safety from silence.',
  preview: {
    visual: 'hashsight',
    alt: 'Representative HashSight preview: a file summary with SHA-256 value and copy control, plus per-provider reputation result rows with timestamps.',
    screenshotNote:
      'Hand-drawn representative preview built from the implemented feature set, not a screenshot of a deployed instance. Set preview.screenshot to replace it.',
  },
  liveUrl: links.live,
  repoUrl: links.repo,
  needsAuthorReview: [
    'challenges — confirm the wording matches your own implementation history',
    'architecture — list only the reputation providers you actually configured',
  ],
  caseStudy: {
    problem: [
      'Someone finds an unexpected file. The first question is always "is this malicious?", and the tools available give answers that are either too weak or too strong.',
      'A hash lookup that returns "0/70" is routinely read as "clean". It actually means that seventy scanners did not recognise this specific file, which for a freshly built or targeted sample is the expected result. Presenting that as safety is the single most dangerous UX mistake in this problem space.',
      'The other failure mode is disclosure: uploading a file to a public scanning service can leak confidential source code, personal data or the fact that your organisation is investigating an incident.',
    ],
    whoBenefits: [
      'Defensive security analysts triaging an unknown file',
      'Incident responders building an evidence record with timestamps',
      'IT support staff answering "is this attachment safe?"',
      'Students learning what hash reputation can and cannot establish',
    ],
    objectives: [
      'Compute hashes safely and locally, with no execution and no automatic upload of content.',
      'Make every lookup an explicit, disclosed action.',
      'Represent unknown, unavailable and conflicting results as first-class states.',
      'Preserve the time dimension: reputation is a snapshot, not a property of the file.',
      'Keep provider integration modular so connectors can be added or removed by configuration.',
    ],
    solution: [
      'HashSight separates three layers that are usually collapsed: file handling, provider integration and evidence recording.',
      'File handling streams the upload to temporary storage outside the web root in bounded chunks, enforces a size ceiling, computes digests in a single pass, then deletes the file according to the configured retention setting. A "hash-only" mode performs the digest computation in the browser so the file never reaches the server at all.',
      'Provider integration is a connector registry. Each connector declares its capabilities (hash lookup yes/no, which algorithms, rate limits) and returns a normalised `ReputationResult` with an explicit status enum. Connectors translate provider-specific quirks — a 404 meaning "unknown", a 429 meaning "unavailable", a partial response meaning "degraded" — into that enum, so the rest of the application never reasons about raw HTTP.',
      'Evidence recording stores one row per (file record, provider, lookup time) with the normalised result and a summary of the raw response. The UI aggregates rows into a single view and derives Conflicting when providers disagree. Nothing is overwritten; re-checking appends.',
    ],
    workflow: {
      title: 'From file to evidence',
      steps: [
        { label: 'Select', detail: 'Choose a file, or paste a known hash' },
        { label: 'Hash', detail: 'Streamed digest computation, bounded memory' },
        { label: 'Disclose', detail: 'Show which providers will receive the hash' },
        { label: 'Query', detail: 'Connector calls, normalised results, rate limits' },
        { label: 'Interpret', detail: 'Five explicit states, conflicts surfaced' },
        { label: 'Record', detail: 'Notes, disposition, timestamps, retention' },
        { label: 'Report', detail: 'Export with source and time per lookup' },
      ],
      caption:
        'Every step after hashing requires an explicit user action; nothing runs automatically in the background.',
    },
    architecture: {
      summary:
        'FastAPI backend with a streaming hash service and a provider connector registry; PostgreSQL-backed case store; React frontend with copyable hash values and per-provider result rows.',
      layers: [
        {
          layer: 'File handling',
          items: [
            'Chunked upload with size and count limits',
            'Temporary storage outside the web root, guaranteed cleanup',
            'Single-pass multi-algorithm digest computation',
            'Optional browser-side hashing mode (file never uploaded)',
          ],
        },
        {
          layer: 'Provider connectors',
          items: [
            'Connector interface with capability declaration',
            'Normalised ReputationResult and status enum',
            'Per-connector rate limiting, retry with backoff and timeout policy',
            'Credentials read from server configuration only',
          ],
        },
        {
          layer: 'Domain & storage',
          items: [
            'FileRecord, HashValue, LookupResult, Case, Note, Disposition',
            'Append-only lookup history keyed by provider and time',
            'Indexes on hash value and lookup time for history search',
            'Configurable retention with scheduled deletion',
          ],
        },
        {
          layer: 'Frontend (React, TypeScript)',
          items: [
            'Submission panel with progress and validation feedback',
            'Hash display with copy-to-clipboard and algorithm caveats',
            'Per-provider result rows with timestamps and permalinks where configured',
            'Case list, search, filters, notes and report export',
          ],
        },
      ],
      security: [
        'Submitted files are never executed, interpreted, unpacked into a shell, or rendered.',
        'No file content is sent to any external service; only a digest, and only on explicit request.',
        'Provider API keys live in server environment configuration and are never exposed through the API.',
        'Temporary files are deleted on completion and on failure paths, with a startup sweep for orphans.',
        'Case access is authorised server-side; hash search results are scoped to the caller.',
      ],
    },
    decisions: [
      {
        title: 'Five result states instead of a verdict',
        context:
          'Every reputation UI eventually wants to show a green tick or a red cross. That binary is a lie for at least three of the five real situations.',
        decision:
          'The status enum is Known Malicious / No Known Detection / Unknown / Unavailable / Conflicting, and each has its own colour-free label, icon and explanatory sentence. "No known detection" carries a permanent note that it is not evidence of safety.',
        tradeoff:
          'The UI is less immediately decisive and users sometimes want a yes/no. Correctness wins here: a wrong "safe" answer in a security tool has real consequences, and the explanatory sentence teaches the user why.',
      },
      {
        title: 'Lookup history is append-only',
        context:
          'Storing only the latest result per file is smaller and simpler.',
        decision:
          'Each lookup writes a new row with provider, timestamp, normalised status and a summary of the raw response. The current view is derived from the most recent row per provider.',
        tradeoff:
          'Table growth and a slightly more complex query for "current state". It makes the tool genuinely useful for investigation: you can show that a file was unknown on Tuesday and detected by three providers on Friday, which is itself a signal.',
      },
      {
        title: 'Hashing available client-side',
        context:
          'Server-side hashing requires uploading the file, which for a confidential document may be unacceptable even to your own infrastructure.',
        decision:
          'A hash-only mode computes digests in the browser and submits just the hash values. Server-side hashing remains for uploaded artifacts that need to become cases.',
        tradeoff:
          'Two code paths for the same operation, and the browser path cannot enforce server-side retention policy because the server never sees the file. The privacy guarantee for sensitive material is worth the duplication.',
      },
    ],
    testing: {
      summary:
        'Tests verify digest correctness against known vectors, connector normalisation against recorded responses, and the failure paths that determine whether the tool can be trusted.',
      items: [
        {
          title: 'Hash tests',
          body: 'Published test vectors for SHA-256, SHA-1 and MD5, plus empty file, large file streamed in chunks, and a file modified between hashing attempts.',
        },
        {
          title: 'Connector tests',
          body: 'Recorded provider responses mapped to the correct status enum, including 404-as-unknown, 429-as-unavailable, timeout, malformed JSON, partial results and a changed response schema.',
        },
        {
          title: 'Conflict-derivation tests',
          body: 'Provider disagreement produces Conflicting; agreement on "no detection" does not upgrade to safe; an unavailable provider does not suppress a positive detection from another.',
        },
        {
          title: 'File-handling tests',
          body: 'Size-limit rejection, disallowed content, temporary-file cleanup on both success and exception paths, and the orphan sweep.',
        },
        {
          title: 'Authorisation and history tests',
          body: 'Case ownership enforcement, hash-search scoping, and append-only history semantics across repeated lookups.',
        },
      ],
    },
    challenges: [
      {
        problem:
          'Provider APIs encode "we have never seen this file" as an HTTP 404, which most HTTP clients treat as an error. Naive handling turns unknown into unavailable, and the user learns nothing.',
        approach:
          'Each connector declares its own status mapping, and 404 is explicitly mapped to Unknown with a test asserting it. The connector interface forbids returning a bare exception for an expected provider state.',
        reasoning:
          'Unknown is a real, informative answer — it tells you the sample is not widespread. Collapsing it into an error discards the most common result in an actual investigation.',
        lesson:
          'Normalise at the connector boundary. Every layer above it should only ever see your own enum, never a provider\'s HTTP semantics.',
      },
      {
        problem:
          'Users ask "so is it safe?" and any answer short of yes feels like the tool failed.',
        approach:
          'The result panel answers the question that was actually asked — what do configured providers report about this digest, as of when — and includes a short "what this does not tell you" note listing the limits: novelty, targeted samples, provider coverage, and that a hash only identifies this exact byte sequence.',
        reasoning:
          'Rephrasing the question is more honest than inventing a verdict, and the note turns a limitation into teaching.',
        lesson:
          'In security tooling, the most important UI element is often the sentence explaining what the result does not mean.',
      },
      {
        problem:
          'A trivial change to a file changes its hash completely, so reputation lookups miss repacked or recompiled variants.',
        approach:
          'The case record stores file size and metadata alongside the hashes, the UI states plainly that reputation applies to this exact byte sequence, and fuzzy matching is explicitly out of scope rather than approximated.',
        reasoning:
          'Implementing a weak similarity heuristic would create false associations between unrelated files — a worse failure than admitting the boundary.',
        lesson:
          'Leave a capability out deliberately and say so, rather than shipping a poor version of it that users will trust.',
      },
    ],
    demonstration: {
      summary:
        'Hashing works with no external configuration at all. Reputation lookups require a provider connector to be configured with credentials; without one, results correctly show as Unavailable.',
      steps: [
        {
          title: 'Hash a file',
          body: 'Select a local file (or use hash-only mode to avoid uploading it). SHA-256 is computed immediately, with SHA-1 and MD5 available and correctly caveated.',
        },
        {
          title: 'Request a reputation lookup',
          body: 'Choose which configured providers to query. The dialog states exactly what will be sent — the digest, not the file — before anything leaves the application.',
        },
        {
          title: 'Read the results',
          body: 'One row per provider with status, detections, last analysis time and lookup timestamp. Conflicts and unavailable providers are surfaced explicitly.',
        },
        {
          title: 'Record and export',
          body: 'Create a case, add notes and a disposition, re-check later to see whether reputation changed, then export a report that cites the source and time of every lookup.',
        },
      ],
      accessNote:
        'No provider API keys ship with the project. A demonstration mode returns clearly labelled synthetic results so the interface can be exercised without credentials.',
    },
    limitations: [
      'Reputation coverage depends entirely on which providers are configured. With no provider configured, HashSight is a hashing and case-management tool.',
      'A hash identifies one exact byte sequence. Repacked, recompiled or re-compressed variants produce different digests and will not match.',
      '"No known detection" is not a safety determination, and the application will not produce one.',
      'Hash lookups disclose the digest to the queried provider, which is itself information disclosure — mitigated by making the action explicit, not eliminated.',
      'MD5 and SHA-1 are provided for compatibility with existing indicator sets only; both are unsuitable where collision resistance is required.',
      'No behavioural or static analysis of file content is performed. HashSight identifies files; it does not inspect them.',
    ],
  },
};
