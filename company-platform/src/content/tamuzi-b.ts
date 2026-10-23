/** Tamuzi Learning — product catalogue 20–25. */
import type { ProductContent } from './types';

export const tamuziProductsB: ProductContent[] = [
  {
    slug: 'pathwise',
    name: 'PathWise',
    companySlug: 'tamuzi-learning',
    category: 'Education Technology',
    categories: ['Education Technology', 'AI and Intelligent Applications'],
    purpose:
      'Uses diagnostic evidence to estimate topic-level mastery and recommend explainable learning steps.',
    summary:
      'Diagnostic assessment and adaptive learning paths: objectives and prerequisite maps, question banks, transparent mastery calculation, explainable next-step recommendations, spaced review, and teacher overrides.',
    status: 'CASE_STUDY_ONLY',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed. Mastery estimates are rule-based evidence, not validated measurement.',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Python', 'FastAPI', 'Pydantic', 'SQLAlchemy', 'PostgreSQL'],
    features: [
      {
        title: 'Diagnostic and formative assessment',
        description:
          'Versioned assessments over question banks with reliable, documented scoring rules.',
      },
      {
        title: 'Transparent mastery calculation',
        description:
          'Topic-level mastery estimates show their evidence and uncertainty — rules, not black boxes.',
      },
      {
        title: 'Explainable next steps',
        description:
          'Recommendations state why; teacher overrides are first-class; spaced review reinforces weak topics.',
      },
    ],
    keywords: ['assessment', 'adaptive learning', 'mastery', 'diagnostics', 'prerequisites'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. Mastery estimates are rule-based and distinguishable from validated machine learning; fairness considerations documented.',
    featured: false,
    caseStudy: {
      title: 'PathWise: mastery estimates that show their work',
      problem:
        'Adaptive learning systems often recommend next steps from opaque models. PathWise was designed around explainability: diagnostic and formative assessments estimate topic-level mastery through transparent scoring rules, recommendations state their reasoning, teacher overrides are built in, and the product distinguishes rules from validated machine learning — plus the fairness and uncertainty questions honest assessment demands.',
      users: [
        'Teachers differentiating practice within a class',
        'Learners following guided study paths',
        'Assessment designers building defensible instruments',
      ],
      constraints: [
        'Mastery calculation must be transparent and evidence-linked',
        'Assessment versioning required — past scores must reference their instrument version',
        'Rules ≠ validated ML; the product must not imply validated prediction',
        'Fairness considerations documented; teacher overrides first-class',
      ],
      solution:
        'PathWise structures learning objectives and prerequisite maps; diagnostic and formative assessments draw from versioned question banks with documented scoring rules. Topic-level mastery estimates cite their evidence (which items, which attempts, which rule). Next-step recommendations explain themselves; spaced review schedules reinforcement; teachers can override any recommendation with recorded rationale. Pre/post comparisons are available with their scope stated.',
      workflow: [
        {
          step: 'Diagnose',
          description:
            'Learners take versioned diagnostic assessments; responses score through documented rules.',
        },
        {
          step: 'Estimate',
          description:
            'Mastery estimates compute per topic with evidence and uncertainty attached.',
        },
        {
          step: 'Guide',
          description:
            'Explainable recommendations and spaced review guide study; teachers override with rationale.',
        },
      ],
      architecture:
        'React/TypeScript frontend with a FastAPI/Pydantic backend over SQLAlchemy/PostgreSQL. The assessment engine implements versioned instruments and scoring rules; the mastery module is a documented rule engine (no unvalidated ML claims); recommendation logic is rule-based and inspectable.',
      dataModel:
        'Objectives → PrerequisiteMaps → QuestionBanks (versioned) → Assessments (instrument versions) → Responses → MasteryEstimates (evidence refs, rule id) → Recommendations (explanation) → Overrides (teacher, rationale).',
      engineeringDecisions: [
        {
          decision: 'Instrument versioning in the schema',
          rationale:
            'Scores only mean something against their instrument version; without versioning, longitudinal claims would be false.',
        },
        {
          decision: 'Rule-based mastery with explicit evidence links',
          rationale:
            'The brief’s rules-vs-ML distinction: transparent rules with cited evidence are defensible where unvalidated models are not.',
        },
      ],
      testing:
        'Scoring-rule correctness against worked examples, assessment-version isolation tests, mastery-evidence completeness tests, recommendation-explanation rendering, and override-workflow tests. No learning-outcome validation is claimed.',
      securityPrivacy:
        'Assessment responses are sensitive learner data; access is role-scoped; estimates carry uncertainty rather than high-stakes labels.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Rule-based estimates, not validated measurement instruments',
        'Fairness properties documented but not certified',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Consented validation studies with educators',
        'Richer prerequisite-map authoring',
      ],
    },
  },
  {
    slug: 'teachcraft',
    name: 'TeachCraft',
    companySlug: 'tamuzi-learning',
    category: 'Education Technology',
    categories: ['Education Technology', 'AI and Intelligent Applications'],
    purpose:
      'Helps teachers create, review, version, and publish lessons, question banks, assessments, assignments, and rubrics.',
    summary:
      'A teacher content and assessment studio: structured rich-text authoring, reusable templates, question banks, preview modes, draft/review/published/archived workflow, collaboration comments, version history, and exports.',
    status: 'CASE_STUDY_ONLY',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed.',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Python', 'FastAPI', 'Pydantic', 'PostgreSQL', 'TipTap'],
    features: [
      {
        title: 'Structured authoring',
        description:
          'Rich-text editor with templates for lessons, assessments, assignments, and rubrics.',
      },
      {
        title: 'Lifecycle and versioning',
        description:
          'Draft → review → published → archived with full version history and collaboration comments.',
      },
      {
        title: 'Human-reviewed AI assist',
        description:
          'Optional AI-assisted drafts that require human review before publication — always labelled.',
      },
    ],
    keywords: ['teacher tools', 'authoring', 'question banks', 'rubrics', 'versioning'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. AI-assisted drafts require human review; content sanitisation and accessibility of authoring are product requirements.',
    featured: false,
    caseStudy: {
      title: 'TeachCraft: a studio where teacher content stays trustworthy',
      problem:
        'Teachers create lessons, question banks, assessments, assignments, and rubrics constantly — usually in documents with no versioning, review, or reuse. TeachCraft was designed as a content studio: structured authoring over templates, a real editorial lifecycle (draft/review/published/archived), collaboration comments, version history, and accessible exports — with optional AI assistance that always requires human review.',
      users: [
        'Teachers authoring classroom materials',
        'Departments sharing question banks',
        'Curriculum leads reviewing and publishing content',
      ],
      constraints: [
        'Rich-text content must be sanitised (untrusted input)',
        'Versioning and lifecycle required — no silent overwrites',
        'AI-assisted drafts require human review before publication',
        'Authoring itself must be accessible',
      ],
      solution:
        'TeachCraft provides structured rich-text authoring (TipTap) with reusable templates for each content type; question banks version and share; preview modes show learner-facing rendering; content moves through draft/review/published/archived states with collaboration comments and full version history. Exports render accessible documents. Optional AI-assisted drafting produces draft-state content flagged for mandatory human review.',
      workflow: [
        {
          step: 'Author',
          description:
            'Teachers create content from templates in a sanitised rich-text editor.',
        },
        {
          step: 'Review',
          description:
            'Content enters review with comments; AI-assisted drafts are flagged and cannot skip review.',
        },
        {
          step: 'Publish',
          description:
            'Published versions are immutable snapshots; history and exports follow.',
        },
      ],
      architecture:
        'React/TypeScript frontend with TipTap editor over a FastAPI/Pydantic backend and PostgreSQL. The content model stores structured documents (sanitised HTML/JSON) with version snapshots; the lifecycle service enforces state transitions; export renders accessible formats.',
      dataModel:
        'ContentItems (type, state) → Versions (immutable snapshots, author, review state) → QuestionBanks → Comments → Exports.',
      engineeringDecisions: [
        {
          decision: 'Immutable version snapshots at publication',
          rationale:
            'Teaching materials are referenced across terms; published versions must never change under a class that used them.',
        },
        {
          decision: 'AI drafts enter mandatory review state',
          rationale:
            'The brief’s human-review rule is a state-machine constraint, not a convention.',
        },
      ],
      testing:
        'Lifecycle state-machine tests, sanitisation tests over malicious rich-text input, version-snapshot integrity tests, accessibility checks of rendered exports, and review-workflow tests. No teaching-quality claims are made.',
      securityPrivacy:
        'Content is sanitised against untrusted input; authorship and review records are preserved; AI-assist interactions are labelled and scoped.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Authoring bounded to the template set in the first version',
        'AI suggestions can be wrong and always require review',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Department-level shared libraries with permissions',
        'Additional export formats',
      ],
    },
  },
  {
    slug: 'openlearn-commons',
    name: 'OpenLearn Commons',
    companySlug: 'tamuzi-learning',
    category: 'Learning and Accessibility',
    categories: ['Learning and Accessibility', 'Education Technology'],
    purpose:
      'Helps users find, evaluate, adapt, translate, and responsibly reuse open educational resources.',
    summary:
      'An OER and localization hub: searchable catalogue with subject/level/language/license filters, attribution and license metadata, adaptations and translations with side-by-side review, collections, moderation, and course packs where permitted.',
    status: 'CASE_STUDY_ONLY',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed.',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Python', 'FastAPI', 'Pydantic', 'PostgreSQL', 'S3-compatible storage'],
    features: [
      {
        title: 'License-aware catalogue',
        description:
          'Search and filters by subject, level, language, and licence; attribution travels with every resource.',
      },
      {
        title: 'Adaptation and translation workflows',
        description:
          'Adaptations and translations keep provenance, with side-by-side translation review.',
      },
      {
        title: 'Moderation and takedown handling',
        description:
          'Community moderation and a documented takedown path for responsible reuse.',
      },
    ],
    keywords: ['OER', 'open education', 'licensing', 'translation', 'localization', 'attribution'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. Public availability does not equal open licensing — the product distinguishes them explicitly.',
    featured: false,
    caseStudy: {
      title: 'OpenLearn Commons: reuse that keeps its licence promises',
      problem:
        'Open educational resources fail at the boring parts: licences get lost, attribution detaches, translations fork from their originals, and “free to download” gets confused with “free to reuse”. OpenLearn Commons was designed around responsible reuse — licence metadata, provenance, adaptation and translation workflows with side-by-side review, moderation, takedown handling, and the explicit distinction between public availability and open licensing.',
      users: [
        'Educators adapting and translating open resources',
        'Programmes building multilingual course packs',
        'Learners searching for legitimately reusable materials',
      ],
      constraints: [
        'Licence metadata structural — required on every resource',
        'Public availability ≠ open licensing; the product must never conflate them',
        'Takedown handling documented and operable',
        'Connector policy for external sources documented',
      ],
      solution:
        'OpenLearn Commons catalogues resources with licence, attribution, subject/level/language metadata and provenance. Adaptations and translations create lineage-linked records with side-by-side review; collections organise resources without owning them; moderation workflows handle reports; downloadable course packs generate only where the licences permit, with attribution assembled automatically.',
      workflow: [
        {
          step: 'Find',
          description:
            'Search filters by subject, level, language, and licence; licence summaries explain permissions plainly.',
        },
        {
          step: 'Adapt',
          description:
            'Adaptations and translations preserve lineage; side-by-side review supports quality checking.',
        },
        {
          step: 'Reuse',
          description:
            'Course packs assemble permitted materials with attributions; takedown paths handle disputes.',
        },
      ],
      architecture:
        'React/TypeScript frontend over a FastAPI/Pydantic backend with PostgreSQL and S3-compatible storage for files; full-text search over the catalogue; lineage graph over resource records; moderation services with role-scoped authority.',
      dataModel:
        'Resources (licence, attribution, metadata) → Lineage (parent/child) → Translations (language, review state) → Collections → ModerationReports → CoursePacks (assembled refs).',
      engineeringDecisions: [
        {
          decision: 'Licence fields required at record creation',
          rationale:
            'The commons’s promise is that attribution cannot be lost; structure enforces what conventions cannot.',
        },
        {
          decision: 'Course packs gated on per-resource licence checks',
          rationale:
            'Bundling is redistribution; generating packs only from permitting licences keeps reuse lawful by construction.',
        },
      ],
      testing:
        'Licence-field validation, lineage-integrity tests, side-by-side translation review flows, pack-generation licence gating tests (denial paths asserted), and attribution assembly. Fixture resources are synthetic (labelled).',
      securityPrivacy:
        'Contributor data is minimal; takedown handling is documented; files served from scoped storage.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Community size not claimed',
        'Machine translation support out of scope in the first version',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Version-diff view for adapted resources',
        'Additional language-review tooling',
      ],
    },
  },
  {
    slug: 'learnpulse',
    name: 'LearnPulse',
    companySlug: 'tamuzi-learning',
    category: 'Data Analysis',
    categories: ['Data Analysis', 'Education Technology'],
    purpose:
      'Converts educational activity and assessment records into explainable, privacy-conscious insights for teachers and program managers.',
    summary:
      'A learning analytics and teacher support dashboard: event imports, course/class summaries, learning and assessment trends, transparent support flags, teacher annotations, data-quality checks, and metric definitions.',
    status: 'CASE_STUDY_ONLY',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed. No high-stakes decisions should rest on automated flags alone.',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Python', 'FastAPI', 'Pydantic', 'PostgreSQL', 'Pandas'],
    features: [
      {
        title: 'Event imports with data-quality checks',
        description:
          'Imported activity data is quality-checked; gaps and errors are surfaced, not smoothed over.',
      },
      {
        title: 'Transparent support flags',
        description:
          'Flags explain their rule inputs and are prompts for teacher attention — never automated decisions.',
      },
      {
        title: 'Metric definitions and annotations',
        description:
          'Every metric ships its definition; teachers annotate views with their own context.',
      },
    ],
    keywords: ['learning analytics', 'teacher support', 'privacy', 'metrics', 'data quality'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. Automated flags support teachers; they must not drive high-stakes decisions alone.',
    featured: true,
    caseStudy: {
      title: 'LearnPulse: analytics that define themselves',
      problem:
        'Education data tools drown teachers in charts and program managers in scores. LearnPulse was designed around explainable, privacy-conscious insight: imported events are data-quality checked, metrics ship with definitions, support flags transparently state their rule inputs, teachers annotate with context, small-cohort privacy is protected by aggregation — and the product refuses to let automated flags drive high-stakes decisions alone.',
      users: [
        'Teachers looking for early support cues in their classes',
        'Programme managers reporting activity honestly',
        'Data leads checking educational datasets',
      ],
      constraints: [
        'Metric definitions mandatory and visible',
        'Small-cohort privacy: aggregation thresholds, no individual exposure in reports',
        'Support flags are explainable prompts — explicitly not high-stakes decisions',
        'Event quality surfaced (gaps, duplicates, errors)',
      ],
      solution:
        'LearnPulse imports educational activity and assessment events, runs data-quality checks (coverage, duplicates, ranges), and presents course/class summaries, learning and assessment trends, and topic-level patterns through metric components that carry their definitions. Transparent support flags state the rules that raised them; teacher annotations add human context to any view. Aggregate reports respect cohort-size thresholds.',
      workflow: [
        {
          step: 'Import',
          description:
            'Events import with quality checks; the import report states coverage and issues.',
        },
        {
          step: 'Read',
          description:
            'Views render trends and patterns with metric definitions attached; flags explain themselves.',
        },
        {
          step: 'Act',
          description:
            'Teachers annotate and respond; reports aggregate for programme audiences within privacy thresholds.',
        },
      ],
      architecture:
        'React/TypeScript frontend over a FastAPI/Pydantic backend with PostgreSQL and Pandas/Polars for aggregation. Metric definitions live in a registry referenced by every chart component; support flags are rule outputs with stored inputs; quality checks run at import.',
      dataModel:
        'EventImports (quality report) → Events → Metrics (definition registry) → Views → SupportFlags (rule, inputs) → Annotations → AggregateReports (threshold-checked).',
      engineeringDecisions: [
        {
          decision: 'Metric definition registry referenced by components',
          rationale:
            'A chart without a definition is a rumour; components cannot render a metric unless its definition exists.',
        },
        {
          decision: 'Cohort thresholds enforced at report generation',
          rationale:
            'Small-cohort privacy is a generation-time constraint, so no export can leak small groups.',
        },
      ],
      testing:
        'Aggregation correctness over fixture datasets, data-quality check tests (injected errors detected), metric-definition binding tests (components without definitions fail), flag-explanation rendering, and threshold enforcement at export. No real learner data is used.',
      securityPrivacy:
        'Learner data is minimised and aggregation-first; individual-level views are role-scoped for teachers; reports enforce cohort thresholds.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Insight quality bounded by imported data quality',
        'Support flags are prompts for humans, never automated decisions',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Consented evaluation integrations with programme partners',
        'Additional import adapters for common platforms',
      ],
    },
  },
  {
    slug: 'reachlearn',
    name: 'ReachLearn',
    companySlug: 'tamuzi-learning',
    category: 'Learning and Accessibility',
    categories: ['Learning and Accessibility', 'Education Technology'],
    purpose:
      'Delivers structured micro-lessons and quizzes through configurable SMS, USSD, and IVR channels.',
    summary:
      'A low-bandwidth learning gateway: channel-neutral lessons, provider adapters, consent and opt-out, a learner state machine, scheduled reminders, cohorts, delivery receipts, idempotent callbacks, and an explicit simulator mode.',
    status: 'CASE_STUDY_ONLY',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed. Simulator output is not real carrier delivery and is labelled.',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Python', 'FastAPI', 'PostgreSQL', 'SQLAlchemy', 'Redis', 'Job queue'],
    features: [
      {
        title: 'Channel-neutral micro-lessons',
        description:
          'The same lesson structure delivers over SMS, USSD, or IVR through provider adapters.',
      },
      {
        title: 'Consent, opt-out, and state machine',
        description:
          'Learner consent and opt-out are structural; the learner state machine handles every channel transition.',
      },
      {
        title: 'Simulator mode, explicitly labelled',
        description:
          'A simulator demonstrates delivery flows without carriers; the line between simulated and real delivery is never blurred.',
      },
    ],
    keywords: ['sms', 'ussd', 'ivr', 'microlearning', 'low bandwidth', 'gateway'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. Simulator output is not real carrier delivery; delivery-state accuracy depends on configured providers.',
    featured: true,
    caseStudy: {
      title: 'ReachLearn: microlearning where the internet is not',
      problem:
        'Billions of learners have phones without reliable data. ReachLearn was designed to deliver structured micro-lessons and quizzes through SMS, USSD, and IVR — channel-neutral content, provider adapters, consent and opt-out, a learner state machine, scheduled reminders, delivery receipts, idempotent webhook handling — and an explicit simulator mode so development and demonstrations never pretend to be real carrier delivery.',
      users: [
        'Programmes reaching learners on basic phones',
        'Low-bandwidth regions where SMS/USSD/IVR outperform data',
        'Teams testing delivery flows before carrier integration',
      ],
      constraints: [
        'Message-size constraints per channel are design inputs',
        'Consent and opt-out mandatory and structural',
        'Webhook callbacks must be secured and idempotent (retries are guaranteed)',
        'Simulator output must never be presented as real delivery',
      ],
      solution:
        'ReachLearn stores channel-neutral lesson content that renders into each channel’s constraints (SMS segments, USSD session limits, IVR scripts). Provider adapters handle configured gateways; a learner state machine tracks consent, progress, and opt-out across channels; scheduled reminders dispatch through a job queue; delivery receipts reconcile against callback webhooks idempotently. Simulator mode runs the entire flow without carriers, labelled everywhere.',
      workflow: [
        {
          step: 'Author',
          description:
            'Micro-lessons are written channel-neutrally; renderers handle per-channel constraints.',
        },
        {
          step: 'Deliver',
          description:
            'The job queue schedules and dispatches through provider adapters (or the labelled simulator); receipts record outcomes.',
        },
        {
          step: 'Reconcile',
          description:
            'Webhook callbacks update delivery states idempotently; learner progress syncs across channels.',
        },
      ],
      architecture:
        'React/TypeScript operator console over a FastAPI/SQLAlchemy backend with PostgreSQL and Redis; Celery (or equivalent) job queue for scheduling and retries; provider-adapter boundary for carriers; webhook endpoints secured (signature verification) and idempotent by message id.',
      dataModel:
        'Lessons (channel-neutral) → Renders (per channel) → Enrolments (cohort, consent state) → Messages (state machine: queued/sent/delivered/failed/opted-out) → Callbacks (idempotent) → Progress.',
      engineeringDecisions: [
        {
          decision: 'Learner state machine covering consent and opt-out',
          rationale:
            'Messaging programmes that mishandle opt-out harm people; the state machine makes illegal transitions impossible.',
        },
        {
          decision: 'Idempotent callback processing by message id',
          rationale:
            'Carriers retry webhooks; non-idempotent handling would corrupt delivery states.',
        },
      ],
      testing:
        'State-machine tests (all channel transitions including opt-out), message-render tests per channel constraint, idempotency tests for repeated callbacks, webhook-signature rejection tests, scheduling/retry tests against the job queue, and simulator-mode labelling tests. Real carrier behaviour is not tested here.',
      securityPrivacy:
        'Phone numbers and consent states are personal data; access is role-scoped; opt-out is immediate and total; webhook endpoints verify provider signatures.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Real delivery depends on configured providers; simulator is not delivery',
        'Channel features bounded by what SMS/USSD/IVR can express',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Additional provider adapters',
        'Per-cohort delivery analytics with privacy thresholds',
      ],
    },
  },
  {
    slug: 'eduaccess',
    name: 'EduAccess',
    companySlug: 'tamuzi-learning',
    category: 'Education Technology',
    categories: ['Education Technology', 'Learning and Accessibility'],
    purpose:
      'Manages free course access, scholarships, fee waivers, sponsored seats, and transparent enrollment workflows.',
    summary:
      'An affordable-learning platform: access plans, scholarship applications with configurable eligibility, review workflows, seat allocation and waitlists, sponsorship pools, reconciled funding records, appeals, and sponsor reports.',
    status: 'CASE_STUDY_ONLY',
    statusNote:
      'Implementation complete as a portfolio build; not publicly deployed. No payment processing is implied where no adapter is configured.',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Python', 'FastAPI', 'Pydantic', 'SQLAlchemy', 'PostgreSQL', 'Background jobs'],
    features: [
      {
        title: 'Access plans and sponsored seats',
        description:
          'Free access, fee waivers, and sponsored seats managed as explicit, auditable allocations.',
      },
      {
        title: 'Scholarship review workflows',
        description:
          'Configurable eligibility criteria and human review — transparent, with appeals paths.',
      },
      {
        title: 'Reconciled funding records',
        description:
          'Pending payments are never presented as settled; sponsor reports respect isolation.',
      },
    ],
    keywords: ['affordability', 'scholarships', 'sponsored seats', 'enrollment', 'funding records'],
    visualLabel: 'Illustrative concept visual — no production screenshot',
    verificationNote:
      'Derived from the project brief. Pending payments are distinguished from settled transactions; sensitive applicant data is minimised.',
    featured: false,
    caseStudy: {
      title: 'EduAccess: affordable learning with fair, auditable allocation',
      problem:
        'Access programmes run on fairness: who gets a sponsored seat, under what criteria, with what recourse. EduAccess was designed to manage free course access, scholarships, fee waivers, and sponsored seats through transparent workflows — configurable eligibility, human review, seat allocation and waitlists, sponsorship pools with reconciled funding records, appeals, and sponsor reports — with sensitive-data minimisation and sponsor isolation throughout.',
      users: [
        'Programmes offering scholarships and sponsored seats',
        'Review committees evaluating applications',
        'Sponsors funding seats who need accountable reports',
      ],
      constraints: [
        'Fair, transparent allocation with human review — no opaque automation of consequential decisions',
        'Pending payments ≠ settled transactions; funding records must be reconciled',
        'Sponsor isolation: sponsors see their own pool only',
        'Sensitive applicant data minimised and access-scoped',
      ],
      solution:
        'EduAccess models access plans (free tiers, waivers, sponsored seats) and sponsorship pools with explicit allocation workflows. Scholarship applications collect minimised, sensitive data through configurable eligibility criteria; human review committees decide through recorded workflows; waitlists and seat allocation track capacity; appeals are first-class. Funding records reconcile pledge → pending → settled states, and sponsor reports compile only within the sponsor’s isolation boundary.',
      workflow: [
        {
          step: 'Apply',
          description:
            'Applicants submit minimised data against configurable criteria; statuses are visible to the applicant.',
        },
        {
          step: 'Review',
          description:
            'Human review decides through recorded workflows; appeals can be raised and are tracked.',
        },
        {
          step: 'Allocate',
          description:
            'Seats allocate from pools with waitlists; funding records reconcile; sponsor reports compile within isolation.',
        },
      ],
      architecture:
        'React/TypeScript frontend over a FastAPI/Pydantic backend with SQLAlchemy/PostgreSQL; background jobs handle reconciliation and report generation; optional payment adapter is configured, never assumed; review workflows are state machines with audit records.',
      dataModel:
        'AccessPlans → Applications (minimised fields, status history) → Reviews (decisions, rationale) → Seats (allocation, waitlist) → SponsorshipPools (sponsor isolation) → FundingRecords (pledge/pending/settled) → Appeals.',
      engineeringDecisions: [
        {
          decision: 'Funding state machine (pledge → pending → settled)',
          rationale:
            'The brief’s honest-records rule: conflating pending with settled inflates what a programme has actually funded.',
        },
        {
          decision: 'Human review with recorded rationale; no automated consequential decisions',
          rationale:
            'Scholarships change lives; allocation decisions stay human and auditable.',
        },
      ],
      testing:
        'Review-workflow state-machine tests, eligibility-criteria configuration tests, allocation and waitlist edge tests, funding-reconciliation tests (pending never renders as settled), sponsor-isolation tests (cross-sponsor access denied), and appeals-flow tests. Test applicants are synthetic.',
      securityPrivacy:
        'Applicant data is sensitive; collection is minimised, access is role-scoped, and reports aggregate within isolation boundaries.',
      walkthroughNote:
        'Illustrative concept visuals only until genuine screenshots exist.',
      limitations: [
        'Payment processing only where an adapter is configured',
        'Eligibility automation is configuration, not validated fairness',
        'Deployment status unverified',
      ],
      futureImprovements: [
        'Configured payment-adapter integrations',
        'Multilingual application flows',
      ],
    },
  },
];
