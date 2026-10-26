import type { Project } from '@/types/project';
import { projectLinks } from '@/config/projectLinks';

const links = projectLinks('threatintel-desk');

export const threatIntelDesk: Project = {
  id: 'prj-threatintel-desk',
  slug: 'threatintel-desk',
  name: 'ThreatIntel Desk',
  tagline: 'Connect indicators. Preserve context. Investigate intelligently.',
  summary:
    'A threat-intelligence workspace that collects indicators from configurable sources, normalises and deduplicates them, and keeps their provenance intact for investigation.',
  description: [
    'ThreatIntel Desk helps defensive security users collect, normalise, search, organise and review indicators from configurable intelligence sources. The point is not to display raw feeds — it is to make indicators from different providers comparable and investigable.',
    'Every record keeps its provenance: which source reported it, when it was first seen, when it was last seen, what confidence that source attached, when it expires, and what other indicators it was reported alongside. An indicator that appears in one feed is a claim from that feed, not an established fact.',
    'Source connectors are modular. Adding a provider means implementing one adapter interface — fetch, normalise, and hand back records — without touching ingestion scheduling, storage, search or the UI.',
  ],
  categories: ['Threat Intelligence', 'Data Processing', 'Security Operations', 'Full-Stack Engineering'],
  filters: ['cybersecurity', 'security-operations', 'full-stack', 'ai-data'],
  tech: [
    'Python',
    'FastAPI',
    'Pydantic',
    'SQLAlchemy',
    'Alembic',
    'PostgreSQL',
    'APScheduler-style background jobs',
    'httpx',
    'React',
    'TypeScript',
    'Tailwind CSS',
    'pytest',
  ],
  keyTech: ['Python', 'FastAPI', 'PostgreSQL', 'React', 'Background jobs'],
  featured: false,
  order: 3,
  status: 'Built — modular connectors with ingestion and deduplication complete and tested as a Python CLI in apps/threatintel-desk, and delivered as the full-stack application described in this case study at projects/threatintel-desk (FastAPI + PostgreSQL-ready backend with Alembic migrations, React frontend, backend and frontend tests)',
  year: '2025',
  role: 'Design, connector framework, normalisation and deduplication, frontend',
  accent: 'violet',
  capabilities: [
    'Pluggable source connectors behind one adapter interface',
    'Provenance-preserving normalisation and deduplication',
  ],
  features: [
    {
      title: 'Configurable source integrations',
      body: 'Sources are registered with a connector type, credentials reference, polling interval, per-run record limit and enabled flag. Adapters exist for structured feed formats (CSV/JSON indicator lists) and for STIX 2.x bundles, with the same normalised output either way.',
    },
    {
      title: 'Indicator normalisation',
      body: 'IP addresses, CIDR ranges, domains, URLs, file hashes and email addresses are parsed into a canonical form: typed value, normalised key for matching, and the original string as reported. Hashes are case-folded; domains are lowercased and de-dotted; URLs keep their path and query.',
    },
    {
      title: 'Deduplication that keeps history',
      body: 'Records sharing a normalised key merge into one indicator with multiple source attributions. First-seen and last-seen move with observation; confidence per source is retained rather than averaged away; conflicting labels are surfaced instead of resolved silently.',
    },
    {
      title: 'Search and filtering',
      body: 'Search by indicator value or substring, filter by type, confidence band, source, status, first-seen window and expiry. Results show why an indicator is in the system, not just what it is.',
    },
    {
      title: 'Indicator profiles and relationships',
      body: 'A profile page lists every source that reported the indicator with timestamps and confidence, its tags, its lifecycle status, related indicators reported in the same bundle or collection, and the full observation history.',
    },
    {
      title: 'Analyst workflow',
      body: 'Add notes, mark a false positive, set a review-by or expiry date, and move an indicator between Investigating / Confirmed / Rejected / Expired. Every change is recorded with actor and timestamp.',
    },
    {
      title: 'Feed health and ingestion history',
      body: 'Per-source status: last run, next run, records fetched, records new, records merged, errors, consecutive failures and rate-limit events. A feed that has quietly stopped working is visible on the dashboard.',
    },
    {
      title: 'Reports with attribution',
      body: 'Export an indicator set or an investigation as Markdown or JSON including source names, confidence values and collection timestamps, so a report can be checked against its origins.',
    },
  ],
  demonstrates: [
    'External API integration behind a stable adapter interface',
    'Data normalisation and canonicalisation',
    'Scheduled background ingestion with error recovery',
    'Deduplication logic that preserves provenance',
    'Relational data modelling for many-to-many observation history',
    'Rate-limit and failure handling',
  ],
  caseStudyFocus:
    'How data from different sources becomes one consistent internal representation — deduplication, provenance, confidence, timestamps, and the difference between an indicator being present in a feed and its maliciousness being established.',
  visualDirection:
    'Professional intelligence dashboard: searchable indicator table, source filters, ingestion summaries, indicator profiles, relationship views. Demonstration data is visually distinct from live-source results.',
  preview: {
    visual: 'threatintel-desk',
    alt: 'Representative ThreatIntel Desk preview: an indicator table with source attribution columns, a source-health panel and an indicator profile summary.',
    screenshotNote:
      'Hand-drawn representative preview built from the implemented feature set, not a screenshot of a deployed instance. Set preview.screenshot to replace it.',
  },
  liveUrl: links.live,
  repoUrl: links.repo,
  needsAuthorReview: [
    'challenges — confirm the wording matches your own implementation history',
    'architecture — list only the feeds you actually connected during development',
  ],
  caseStudy: {
    problem: [
      'Threat intelligence arrives in many shapes: a CSV of domains from one community feed, a STIX bundle from another, a JSON API from a commercial provider, each with its own idea of what confidence means. Consuming several of them produces a pile of overlapping records.',
      'The naive result is worse than no intelligence at all. The same domain appears five times, the oldest and least reliable copy has no timestamp visible, and nobody can say whether an indicator is still current or expired six months ago.',
      'Blocking decisions made on that basis are hard to justify and hard to reverse. Analysts need to know where a claim came from and how much weight the source deserves.',
    ],
    whoBenefits: [
      'Defensive security analysts correlating indicators across sources',
      'Incident responders who need to know whether an observed address is already known',
      'Small security teams without a commercial TIP',
      'Students learning how intelligence pipelines actually work',
    ],
    objectives: [
      'One canonical indicator model that any source can be mapped into.',
      'Full provenance: every assertion traceable to a source and a collection time.',
      'Deduplication that merges records without erasing disagreement.',
      'Connector modularity — a new provider must not require changes to ingestion, storage or UI.',
      'Visible feed health, so silent failures do not masquerade as quiet periods.',
      'Only supported, authorized sources; no unrestricted fetching of arbitrary URLs.',
    ],
    solution: [
      'The system is organised around three separable ideas: a connector (how to get records), a normaliser (how to make them canonical), and a store (how observations accumulate over time).',
      'A connector implements `fetch(since, limit) -> Iterator[RawRecord]` plus a health descriptor. It owns its authentication, pagination, rate limiting and error taxonomy, and it is the only module allowed to make outbound requests. Registered source types are shipped as adapters; adding one is a new class and a config entry.',
      'The normaliser converts a RawRecord into an `IndicatorDraft`: a typed value, a canonical matching key, tags, a source-specific confidence mapped onto a documented internal scale, and optional relationship references. Confidence mapping is per-connector, because "high" from one provider and 80 from another are not the same statement.',
      'The store treats indicators and observations as separate entities. An `Indicator` is the canonical identity; an `Observation` is one source reporting it at one time with one confidence. Deduplication is an upsert on the canonical key that inserts an observation and updates last-seen. That single modelling choice is what allows conflicting labels, per-source confidence and a real observation history to coexist.',
    ],
    workflow: {
      title: 'Ingestion and investigation flow',
      steps: [
        { label: 'Schedule', detail: 'Per-source interval, limits and enabled flag' },
        { label: 'Fetch', detail: 'Connector retrieves records, handles rate limits' },
        { label: 'Normalise', detail: 'Typed value, canonical key, mapped confidence' },
        { label: 'Deduplicate', detail: 'Upsert indicator, append observation' },
        { label: 'Relate', detail: 'Store bundle relationships and tags' },
        { label: 'Investigate', detail: 'Search, filter, open a profile, annotate' },
        { label: 'Report', detail: 'Export with source attribution and timestamps' },
      ],
      caption:
        'Ingestion writes an audit row per run: fetched, new, merged, skipped, errored, duration and the HTTP status codes encountered.',
    },
    architecture: {
      summary:
        'FastAPI service with a connector registry, a scheduler-driven ingestion worker, a provenance-preserving relational store, and a React investigation workspace.',
      layers: [
        {
          layer: 'Connectors',
          items: [
            'Adapter interface: fetch, health, capabilities, auth model',
            'CSV/JSON indicator-list adapter and STIX 2.x bundle adapter',
            'Per-connector confidence mapping and rate-limit policy',
            'Allowlisted destinations only — connector URLs are configuration, never user input',
          ],
        },
        {
          layer: 'Ingestion worker',
          items: [
            'Scheduler with per-source intervals and jitter',
            'Run-level transaction with resumable state and consecutive-failure tracking',
            'Record limits per run to bound memory and provider load',
            'Structured run log and error taxonomy',
          ],
        },
        {
          layer: 'Domain model (SQLAlchemy, PostgreSQL)',
          items: [
            'Indicator (canonical identity) vs Observation (source assertion)',
            'Sources, ingestion runs, relationships, tags, analyst notes, status changes',
            'Unique constraint on canonical key; indexes on type, last-seen, status',
            'Expiry and review-by handling with a scheduled sweep',
          ],
        },
        {
          layer: 'API & frontend',
          items: [
            'Search, filter and pagination endpoints with typed query models',
            'Indicator profile, relationship and history endpoints',
            'Feed-health and ingestion-history endpoints',
            'React dashboard with indicator table, profiles, health panel and reports',
          ],
        },
      ],
      security: [
        'Credentials live in server-side configuration; the client receives a source name and health, never a key.',
        'Outbound requests are restricted to configured, allowlisted source endpoints — an indicator value is never used to build a request URL.',
        'Feed content is untrusted: normalisation strips control characters, enforces length limits, and never evaluates embedded expressions.',
        'Role-based access separates analyst write actions from source administration.',
      ],
    },
    decisions: [
      {
        title: 'Indicators and observations are different tables',
        context:
          'The tempting schema has one row per (source, indicator) with a "last seen" column, or one row per indicator that gets overwritten by whichever feed ran last.',
        decision:
          '`Indicator` holds canonical identity and analyst-owned state; `Observation` holds one source\'s assertion at one time with its confidence and tags. Deduplication is an upsert plus an observation insert.',
        tradeoff:
          'More joins and a larger table that grows with every run. In exchange you can answer "who reported this and when", show disagreement honestly, expire one source\'s claim without deleting another\'s, and rebuild confidence over time.',
      },
      {
        title: 'Confidence is mapped, not averaged',
        context:
          'Sources express confidence differently: a 0–100 integer, a low/medium/high string, or nothing at all. Averaging them produces a number that looks precise and means nothing.',
        decision:
          'Each connector declares an explicit mapping onto a documented internal scale, and an absent value maps to "unspecified" rather than to a midpoint. The profile shows per-source confidence side by side.',
        tradeoff:
          'No single sortable "trust score", so the UI cannot rank indicators by one number. It does keep the scale interpretable, and it makes a provider\'s calibration an explicit, reviewable decision.',
      },
      {
        title: 'Connectors are the only outbound path',
        context:
          'It would be convenient to let the UI "check this indicator" by querying whatever service seems relevant.',
        decision:
          'Only registered connectors make network calls, to configured endpoints. Lookup actions in the UI resolve to a connector invocation against a configured source, never to a URL derived from the indicator itself.',
        tradeoff:
          'Fewer ad-hoc enrichment options and more configuration up front. It removes an SSRF and data-leakage path — an adversary who gets an indicator into a feed cannot make the server call them back.',
      },
    ],
    testing: {
      summary:
        'Tests cover connector adapters against recorded fixtures, normalisation and deduplication semantics, scheduling failures and authorisation. Verified current suite: 10 backend tests (pytest) and 2 frontend tests (vitest) pass.',
      items: [
        {
          title: 'Adapter tests with recorded payloads',
          body: 'Each connector is tested against stored sample responses, including paginated results, an HTTP 429, a malformed record inside an otherwise valid feed, and a schema change.',
        },
        {
          title: 'Normalisation tests',
          body: 'Canonical key generation for IPs, CIDRs, domains, URLs, hashes and email addresses, with edge cases: uppercase hashes, trailing dots, IDN labels, URLs differing only by fragment, IPv6 forms.',
        },
        {
          title: 'Deduplication tests',
          body: 'Two sources reporting the same indicator produce one indicator and two observations; first-seen does not move backwards; conflicting labels are both retained; expiry from one source does not delete the other observation.',
        },
        {
          title: 'Ingestion-failure tests',
          body: 'Network error, timeout, rate limit and partial-parse paths all leave the source in a correct health state with a recorded run and no half-written indicators.',
        },
        {
          title: 'Authorisation tests',
          body: 'Analyst versus administrator roles across source configuration, indicator status changes, note creation and export.',
        },
      ],
    },
    challenges: [
      {
        problem:
          'Feeds disagree. One source marks a domain malicious with high confidence; another lists it as a benign CDN endpoint. Picking a winner destroys the information.',
        approach:
          'Keep both observations and surface the conflict on the profile with an explicit "conflicting reports" flag. Status remains an analyst decision, not a computed one.',
        reasoning:
          'The value of a TIP is the reasoning it preserves. A merged single label makes the system look tidier and think less.',
        lesson:
          'Model disagreement as data. Any field where two sources can legitimately differ needs one row per source.',
      },
      {
        problem:
          'Indicators go stale. A list that only grows becomes noise, and expired entries erode trust in the whole dataset.',
        approach:
          'Carry `valid_until` where a source supplies it, add an analyst-set review-by date, run a scheduled sweep that moves stale indicators to Expired, and show feed age prominently next to every value.',
        reasoning:
          'Age is part of the meaning of an indicator. An IP observed once three years ago and an IP reported by four sources this week should not look identical in a table.',
        lesson:
          'Temporal metadata belongs in the UI, not only in the schema. If a user cannot see how old a record is, they will assume it is current.',
      },
      {
        problem:
          'A connector that fails silently looks exactly like a feed with no new indicators.',
        approach:
          'Every run writes an audit row regardless of outcome, and the dashboard shows consecutive-failure counts, last-success time and error taxonomy per source. A source that has not succeeded within N intervals is flagged unhealthy.',
        reasoning:
          'Ingestion is a background process with no user watching it. Health has to be a first-class, visible output rather than something inferred from absence.',
        lesson:
          'For any scheduled integration, "no data" and "broken" must be distinguishable states in the UI.',
      },
    ],
    demonstration: {
      summary:
        'The workspace can be exercised end to end using a bundled demonstration connector that emits clearly labelled synthetic indicators, so no live feed credentials are required.',
      steps: [
        {
          title: 'Register a source',
          body: 'Add a source with a connector type, polling interval and record limit. Credentials are referenced from server configuration, never entered in the browser.',
        },
        {
          title: 'Run ingestion',
          body: 'Trigger a run manually or wait for the schedule, then inspect the run log: fetched, new, merged, skipped, errored.',
        },
        {
          title: 'Search and filter',
          body: 'Find an indicator by value, then narrow by type, confidence, source or first-seen window.',
        },
        {
          title: 'Open a profile and annotate',
          body: 'Review every source that reported the indicator, its relationships, its history, then set a status, add a note and export a report with attribution.',
        },
      ],
      accessNote:
        'Records produced by the demonstration connector are synthetic and labelled as such in the UI. They cannot be mistaken for verified live intelligence.',
    },
    limitations: [
      'Live sources require credentials and must be authorized for your use. Without configuration, only the labelled demonstration connector is available.',
      'Presence in a feed is not proof of maliciousness. The application reports attribution and confidence; the verdict stays with the analyst.',
      'Confidence scales are only as comparable as the per-connector mappings, which must be reviewed when a provider changes its semantics.',
      'No automated blocking or enforcement. ThreatIntel Desk is an analysis and correlation workspace, not a control plane.',
      'Relationship extraction depends on the source supplying relationships; feeds that publish flat lists produce indicators without graph context.',
      'Indicator volume grows with every run; retention and expiry policy must be configured deliberately for long-lived deployments.',
    ],
  },
};
