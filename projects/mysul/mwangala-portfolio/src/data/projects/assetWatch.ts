import type { Project } from '@/types/project';
import { projectLinks } from '@/config/projectLinks';

const links = projectLinks('assetwatch');

export const assetWatch: Project = {
  id: 'prj-assetwatch',
  slug: 'assetwatch',
  name: 'AssetWatch',
  tagline: 'Know your assets. Understand their exposure. Track changes.',
  summary:
    'An authorized asset-inventory and exposure-monitoring tool that records what you own, compares observations of exposed services over time, and tracks remediation.',
  description: [
    'AssetWatch helps administrators maintain a structured inventory of network assets — hosts, domains, IP addresses, environments, owners and business importance — and compare observations of exposed services across assessment runs.',
    'The interesting output is not a scan result; it is a diff. "Port 6379 was not reachable on this host last month and is reachable now" is actionable in a way that a static list of open ports is not, because it identifies change, and change is usually where risk enters.',
    'This is an asset-management and exposure-monitoring application, not a scanning or exploitation framework. Assessment runs only against an explicit allowlist of targets the operator has declared they are authorized to test, validated again on the server before every run.',
  ],
  categories: ['Asset Monitoring', 'Network Analysis', 'Security Operations', 'Full-Stack Engineering'],
  filters: ['cybersecurity', 'network-analysis', 'security-operations', 'full-stack'],
  tech: [
    'Python',
    'FastAPI',
    'Pydantic',
    'SQLAlchemy',
    'SQLite',
    'Configurable scanner adapter',
    'React',
    'TypeScript',
    'Tailwind CSS',
    'pytest',
  ],
  keyTech: ['Python', 'FastAPI', 'Allowlist enforcement', 'React', 'SQLite'],
  featured: false,
  order: 6,
  status: 'Complete — full-stack application built and tested in projects/assetwatch (11 backend + 2 frontend tests green; SQLite for local development, PostgreSQL-ready via SQLAlchemy)',
  year: '2025',
  role: 'Design, authorisation model, comparison engine, frontend',
  accent: 'indigo',
  capabilities: [
    'Server-enforced target allowlist validated before every assessment run',
    'Historical comparison that surfaces newly observed and disappeared services',
  ],
  features: [
    {
      title: 'Asset inventory',
      body: 'Register hosts, domains and IP ranges with environment label, owner, business criticality, description and tags. Group and filter by owner, environment or status; search across the inventory.',
    },
    {
      title: 'Authorization allowlist',
      body: 'Assessment targets must be declared explicitly with a scope statement. The allowlist is enforced in the backend before any run starts, and a target that is not on it cannot be assessed through the API even if a request names it.',
    },
    {
      title: 'Configurable assessment integration',
      body: 'Assessment runs are executed through a documented scanner adapter with conservative limits: bounded port range, rate limit, timeout, concurrency of one target at a time, and a maximum run duration. Manually supplied inventory data is a first-class alternative when no scanner is configured.',
    },
    {
      title: 'Observed-service tracking',
      body: 'Each run records observed ports, detected service names, available version strings, scan time, scan status and the adapter\'s stated limitations. Observations are immutable snapshots; they are never edited in place.',
    },
    {
      title: 'Historical comparison',
      body: 'Compare any two runs of an asset to see newly observed services, services no longer observed, changed versions and unchanged exposure. New services on an internet-facing asset are the highest-signal event in the system.',
    },
    {
      title: 'Exposure findings and remediation',
      body: 'Observations become findings with severity, business impact and exposure classification. Findings generate remediation tasks with an owner, due state and status, tracked to closure.',
    },
    {
      title: 'Dashboard and reporting',
      body: 'Asset counts by environment, recent runs, newly observed services, unresolved findings by severity, and remediation ageing. Reports compare previous and current observations per asset or across the estate.',
    },
    {
      title: 'Audit trail',
      body: 'Allowlist changes, run initiations, target validation failures and finding status changes are audited with actor and timestamp — the record you want when someone asks who authorized a scan of what.',
    },
  ],
  demonstrates: [
    'Asset inventory and lifecycle data modelling',
    'Background job processing with cancellation and timeouts',
    'Historical data comparison and change detection',
    'Authorisation enforcement at the domain boundary',
    'Remediation workflow design',
    'Safe integration with an external assessment tool',
  ],
  caseStudyFocus:
    'How the application keeps a structured view of assets, compares observations across runs, and enforces authorization boundaries — plus how the interface helps a team prioritise remediation.',
  visualDirection:
    'Asset-management interface: inventory tables, exposure summaries, historical comparisons, asset detail, remediation status. No maps or network diagrams unless they carry real information; no synthetic scan output presented as actual findings.',
  preview: {
    visual: 'assetwatch',
    alt: 'Representative AssetWatch preview: an asset inventory table with exposure status, a comparison panel showing a newly observed service, and remediation task counts.',
    screenshotNote:
      'Hand-drawn representative preview built from the implemented feature set, not a screenshot of a deployed instance. Set preview.screenshot to replace it.',
  },
  liveUrl: links.live,
  repoUrl: links.repo,
  needsAuthorReview: [
    'challenges — confirm the wording matches your own implementation history',
    'architecture — name the scanner adapter you actually integrated, if any',
  ],
  caseStudy: {
    problem: [
      'You cannot protect an inventory you cannot enumerate. In most organisations the list of what exists is spread across a spreadsheet, a cloud console, a DHCP lease table and one person\'s memory, and it is out of date the moment it is written.',
      'The gap between "what we think we expose" and "what we actually expose" grows silently: a developer opens a database port to debug something on Friday, and it is still open in March.',
      'A one-off scan does not solve this. It produces a long list with no baseline, so every finding looks equally urgent and nothing gets fixed. What matters is change relative to a known-good state.',
    ],
    whoBenefits: [
      'System administrators responsible for a defined estate',
      'Small IT and security teams without continuous commercial monitoring',
      'Authorized network operators who need evidence of what changed and when',
      'Learners studying asset management and exposure reduction as a discipline',
    ],
    objectives: [
      'Maintain an authoritative asset inventory with ownership and criticality.',
      'Record observations as immutable snapshots so any two points in time can be compared.',
      'Surface change — new services, changed versions — ahead of raw volume.',
      'Enforce authorization boundaries in code, not in policy documents.',
      'Track remediation to closure with owners and ageing.',
      'Never perform exploitation, credential attacks, stealth scanning or scanning of unapproved targets.',
    ],
    solution: [
      'The model separates three things that are usually conflated: the Asset (what we own and who owns it), the Observation (what an assessment saw at a point in time), and the Finding (what we decided matters).',
      'Observations are append-only snapshots tied to a Run. A Run belongs to an Asset, records its adapter, its parameters, its start and end time, its status and any validation failures. Because snapshots are never mutated, comparison is a pure function over two snapshots — which makes the diff engine easy to test and impossible to corrupt by editing history.',
      'Authorization is enforced at the domain boundary. An allowlist entry contains the target, the scope statement, the approved port range and an expiry date. Before a run starts, the service re-validates the target against the allowlist, checks the requested port range is within the approved range, and refuses with an audited failure if not. This check is in the domain service, so it applies to every entry point including scheduled runs.',
      'Findings are derived from observations but owned by people: severity, business impact and exposure are set or adjusted by a user, and remediation tasks reference the finding they came from. The dashboard ranks by (new since last run) × (business criticality) × (internet-facing), which puts the Friday debugging port at the top of the list.',
    ],
    workflow: {
      title: 'Inventory to remediation',
      steps: [
        { label: 'Register', detail: 'Assets with owner, environment, criticality' },
        { label: 'Authorize', detail: 'Allowlist entry with scope and port bounds' },
        { label: 'Assess', detail: 'Bounded adapter run, or manual entry' },
        { label: 'Snapshot', detail: 'Immutable observation recorded' },
        { label: 'Compare', detail: 'New, removed and changed services' },
        { label: 'Triage', detail: 'Findings with severity and business impact' },
        { label: 'Remediate', detail: 'Tasks, owners, status, ageing, verification' },
      ],
      caption:
        'Runs are background jobs with progress, timeout and cancellation. A run that cannot be authorized never starts.',
    },
    architecture: {
      summary:
        'FastAPI backend with an authorization-guarded assessment service, an append-only observation store and a diff engine; React frontend for inventory, comparison and remediation.',
      layers: [
        {
          layer: 'Inventory & authorization',
          items: [
            'Assets, owners, environments, criticality, tags',
            'Allowlist entries with scope statement, port bounds and expiry',
            'Target validation as a domain service used by every run path',
            'Audited allowlist changes',
          ],
        },
        {
          layer: 'Assessment execution',
          items: [
            'Scanner adapter interface with declared capabilities and limits',
            'Background job with progress, timeout, cancellation and cleanup',
            'Conservative defaults: bounded ports, rate limit, sequential targets',
            'Manual observation entry as an equal path when no adapter is configured',
          ],
        },
        {
          layer: 'Comparison & findings',
          items: [
            'Immutable observation snapshots keyed by run',
            'Pure diff function producing new / removed / changed / unchanged',
            'Findings with severity, business impact and exposure classification',
            'Remediation tasks with owner, status and ageing',
          ],
        },
        {
          layer: 'API & frontend',
          items: [
            'Role-based access: administrator, operator, read-only',
            'Inventory search, filters, grouping and pagination',
            'Asset detail with run history and comparison view',
            'Exposure dashboard and exportable reports',
          ],
        },
      ],
      security: [
        'Target validation is enforced server-side before every run, including scheduled runs.',
        'No exploitation, credential testing, stealth/evasion techniques or unrestricted public scanning.',
        'Adapter execution is bounded by port range, rate, timeout and concurrency limits configured by the administrator.',
        'Scan output is untrusted: adapter results are parsed defensively and never executed.',
        'All authorization-relevant actions are audited.',
      ],
    },
    decisions: [
      {
        title: 'Observations are immutable snapshots',
        context:
          'It is tempting to keep one "current services" table per asset and update it after each scan.',
        decision:
          'Every run writes a new snapshot. Current state is a derived view over the most recent snapshot; history is the set of snapshots.',
        tradeoff:
          'Storage grows linearly with runs and "what is open now" needs a join or a materialised view. In exchange, comparison is trivially correct, a bad run can be discarded without corrupting history, and you can answer "when did this service first appear" exactly.',
      },
      {
        title: 'Authorization inside the domain service',
        context:
          'Checking the allowlist in the HTTP route protects the API but not the scheduler, a CLI command, or the next endpoint someone adds.',
        decision:
          'The assessment service refuses to start a run unless the target passes allowlist validation, and it writes an audit record on refusal. Routes cannot start a run except through the service.',
        tradeoff:
          'The domain layer now knows about authorization policy, which is a slight mixing of concerns. Given that scanning something unapproved is the one irreversible mistake this application could make, defence at the narrowest point is worth it.',
      },
      {
        title: 'Ranking by change, not by count',
        context:
          'Sorting findings by severity alone produces a permanent backlog of medium-severity items and hides the one thing that changed this week.',
        decision:
          'The dashboard ranks by newness relative to the previous run, weighted by business criticality and internet exposure, with raw severity still filterable.',
        tradeoff:
          'Long-standing high-severity exposure can drop down the list if it is unchanged, which requires the ageing view to keep it visible. It focuses attention where a monitoring tool actually adds value: on deltas.',
      },
    ],
    testing: {
      summary:
        'Tests prioritise the authorization boundary, the diff engine and job lifecycle — the three places a bug would cause real harm or real misinformation.',
      items: [
        {
          title: 'Authorization tests',
          body: 'Runs against targets not on the allowlist are refused; port ranges outside the approved bounds are refused; expired allowlist entries are refused; refusals are audited; the scheduler path is tested, not only the API path.',
        },
        {
          title: 'Adapter limit tests',
          body: 'Rate limit, timeout, concurrency and maximum duration are asserted with a stub adapter, including cancellation mid-run and cleanup after failure.',
        },
        {
          title: 'Diff engine tests',
          body: 'New, removed, changed-version and unchanged services across snapshot pairs, including an empty first run, an identical repeat run, and a run that partially failed.',
        },
        {
          title: 'Result normalisation tests',
          body: 'Adapter output with missing version strings, unexpected service names, duplicate port entries and malformed rows is normalised or rejected with a reason.',
        },
        {
          title: 'Workflow and permission tests',
          body: 'Finding triage, task assignment, status transitions and role-based access across administrator, operator and read-only.',
        },
      ],
    },
    challenges: [
      {
        problem:
          'A run can partially fail — timeout on one port range, adapter crash halfway — and a partial snapshot compared against a complete one looks like dozens of services disappeared.',
        approach:
          'Each snapshot records its completeness (ports attempted, ports completed, failure reasons). The diff engine refuses to report removals from an incomplete snapshot and instead reports "comparison limited: previous run incomplete".',
        reasoning:
          'A false "service closed" signal is worse than no signal: it closes findings that are still open. Disclosing the limitation keeps the diff trustworthy.',
        lesson:
          'Comparison needs metadata about the quality of both inputs, not just their contents.',
      },
      {
        problem:
          'Service and version detection is probabilistic. Two runs against an identical host can report different version strings, generating a stream of meaningless "changed" findings.',
        approach:
          'Version changes are recorded but classified as low-signal by default and grouped, with a per-asset option to suppress version-only diffs. New and removed ports remain high-signal.',
        reasoning:
          'Alert fatigue is the main way monitoring tools get switched off. Distinguishing structural change from detection jitter keeps the useful signal prominent.',
        lesson:
          'Rank findings by how much you trust the difference, not only by how severe the thing is.',
      },
      {
        problem:
          'The line between exposure monitoring and unauthorized scanning is easy to cross by accident — a typo in a target field, a CIDR that is broader than intended.',
        approach:
          'Targets must exist as allowlist entries with a scope statement and expiry; free-text target entry is not accepted for runs. CIDR entries are expanded and shown for confirmation, and every run records the exact target list it used.',
        reasoning:
          'Making the authorized set explicit and auditable turns a policy document into an enforced constraint, and the record answers "what did we touch?" without guesswork.',
        lesson:
          'For irreversible actions, remove the ability to specify arbitrary input rather than validating it after the fact.',
      },
    ],
    demonstration: {
      summary:
        'The inventory, comparison and remediation workflow is fully usable with manually supplied observations, so the application can be demonstrated without any scanner configured.',
      steps: [
        {
          title: 'Build the inventory',
          body: 'Register assets with owner, environment and business criticality. Seed data provides a labelled sample estate.',
        },
        {
          title: 'Declare authorization',
          body: 'Create allowlist entries with a scope statement, approved port bounds and an expiry date.',
        },
        {
          title: 'Run or enter observations',
          body: 'Execute a bounded assessment through a configured adapter, or record observations manually. Runs show progress, timeout and cancellation.',
        },
        {
          title: 'Compare and remediate',
          body: 'Diff two runs to see newly observed services, triage them into findings, assign remediation tasks and track ageing to closure. Export a comparison report.',
        },
      ],
      accessNote:
        'Sample assets and sample observations shipped with the project are synthetic and labelled as demonstration data. They are never presented as results from a real network.',
    },
    limitations: [
      'Not a vulnerability scanner. AssetWatch records observed services and exposure; it does not test for vulnerabilities or exploit anything.',
      'Assessment requires an explicitly configured allowlist and, for automated runs, a scanner adapter with credentials and permissions the operator already holds.',
      'Scanning without written authorization is unlawful in most jurisdictions. The allowlist is an engineering control, not a substitute for permission.',
      'Service and version detection is probabilistic; version-only differences are low-signal by design.',
      'Scheduling is available only where the deployment environment supports safe, authorized background execution.',
      'Cloud and SaaS assets are out of scope — the inventory covers network-reachable hosts, domains and ranges.',
    ],
  },
};
