import type { OperationsModule } from '@/types';

/**
 * The operations layer: seven modules adapted from a public seven-part
 * dashboard-concept series ("what dashboards should a product show"), rebuilt
 * for education-technology programmes under this portfolio's honesty rules.
 *
 * The source series displays SaaS vanity figures — uptime percentages, MRR,
 * churn, waitlist totals, active-user counts. None of those figures appear
 * here or anywhere on this site. Each module instead carries explicit states,
 * metric *definitions* (how a value would be computed, from which records),
 * and an integrity rule that tests enforce. The console is a specification
 * for honest operations reporting, not a demo of numbers.
 */

export const operationsModules: OperationsModule[] = [
  {
    id: 'service-status',
    order: 1,
    title: 'Service status & incident transparency',
    purpose:
      'Tell users the truth about the services they depend on — while an incident is happening and after it ends.',
    adaptedFrom:
      'Dashboard concept 1/07 — “Public Status Page” (uptime bars and incident history).',
    context:
      'For learning platforms the services are the ones learners and teachers actually touch: the course app, sync, media delivery, sign-in and the API. The uptime bar is replaced by an honest status history: what broke, when it was noticed, when it was fixed.',
    states: [
      {
        id: 'operational',
        label: 'Operational',
        meaning:
          'Every listed service is serving its documented functions within its documented limits.',
      },
      {
        id: 'degraded',
        label: 'Degraded',
        meaning:
          'The service works, but a named function or capacity is reduced. The specific degradation is described, not hidden behind a colour.',
      },
      {
        id: 'partial-outage',
        label: 'Partial outage',
        meaning:
          'A defined subset of functions, regions or accounts is unavailable.',
      },
      {
        id: 'major-outage',
        label: 'Major outage',
        meaning:
          'The service’s core function is unavailable to most users.',
      },
      {
        id: 'maintenance',
        label: 'Maintenance',
        meaning:
          'A planned work window. Scope and expected window are announced; unplanned work is an incident, not maintenance.',
      },
      {
        id: 'monitoring',
        label: 'Monitoring',
        meaning:
          'A fix is deployed and the service is under observation before the incident is closed.',
      },
    ],
    metrics: [
      {
        id: 'incident-timeline',
        name: 'Incident timeline',
        definition:
          'Wall-clock timestamps for four milestones: declared, acknowledged, mitigated, resolved. Published verbatim as a timeline; the sequence never reorders.',
        unit: 'ISO 8601 timestamps',
        source: 'The incident entry’s recorded milestones.',
      },
      {
        id: 'affected-services',
        name: 'Affected services',
        definition:
          'The number of listed services explicitly marked affected on the incident entry, alongside their names.',
        unit: 'count (with names)',
        source: 'The incident entry’s service list.',
      },
      {
        id: 'incident-frequency',
        name: 'Declared incidents per window',
        definition:
          'Count of declared incidents in a stated window, always published with the window boundaries and the incident list — never as a bare rate implying availability.',
        unit: 'count per stated window',
        source: 'The incident log.',
      },
    ],
    integrityRule:
      'Every status change points to a timestamped incident entry, and incident timelines are published only from recorded timestamps. No availability percentage is published without its probe definitions, measurement window and raw probe log; when those do not exist, the timeline itself is the honest answer.',
  },
  {
    id: 'release-changelog',
    order: 2,
    title: 'Content & release changelog',
    purpose:
      'Show what actually shipped, when — and correct the record in public when something changes.',
    adaptedFrom: 'Dashboard concept 2/07 — “Live Changelog”.',
    context:
      'For learning programmes the “releases” are course content drops, offline content packs, app builds and this site’s own deployments. The changelog proves shipping without overclaiming what a release achieved.',
    states: [
      {
        id: 'draft',
        label: 'Draft',
        meaning: 'The entry is being written; nothing is claimed to have shipped.',
      },
      {
        id: 'scheduled',
        label: 'Scheduled',
        meaning:
          'The change is planned for a stated window. Scheduling is not shipping.',
      },
      {
        id: 'published',
        label: 'Published',
        meaning:
          'The change has shipped and the entry describes it in user-visible terms.',
      },
      {
        id: 'corrected',
        label: 'Corrected',
        meaning:
          'A published entry was wrong or incomplete; a new dated correction entry records what was wrong and what is true.',
      },
      {
        id: 'reverted',
        label: 'Reverted',
        meaning:
          'The change was withdrawn after release; the reversal is itself a dated entry with a reason.',
      },
    ],
    metrics: [
      {
        id: 'entries-per-release',
        name: 'Entries per release',
        definition:
          'Count of changelog entries attached to one release identifier. Counts describe documentation coverage, not impact.',
        unit: 'count',
        source: 'The changelog’s release records.',
      },
      {
        id: 'correction-latency',
        name: 'Correction latency',
        definition:
          'Wall-clock time from a release’s publication to its correction entry, published only alongside the corrected entry.',
        unit: 'wall-clock duration',
        source: 'Publication timestamps of the original and correction entries.',
      },
      {
        id: 'reversal-count',
        name: 'Reverted releases',
        definition:
          'Count of releases whose status is “reverted” in a stated window, each with its recorded reason.',
        unit: 'count (with reasons)',
        source: 'The changelog’s reversal entries.',
      },
    ],
    integrityRule:
      'A changelog entry exists only for a change that shipped. Corrections append as new dated entries instead of silently editing history, and “SCHEDULED” never appears in lists of what has shipped.',
  },
  {
    id: 'learning-analytics',
    order: 3,
    title: 'Learning analytics with defined metrics',
    purpose:
      'Measure learning activity only through metrics whose definitions are fixed, versioned and shown next to any value.',
    adaptedFrom:
      'Dashboard concept 3/07 — “Metrics & Analytics” (active users, signups, conversion rate, session length).',
    context:
      'The SaaS vanity set is replaced by learning-behaviour metrics. Each metric carries its formula and lifecycle state; nothing is reported as a learning outcome that is only a usage proxy. No usage or user figures are invented for demonstration — the definitions below are the deliverable.',
    states: [
      {
        id: 'proposed',
        label: 'Proposed',
        meaning: 'Someone has suggested the metric; it is not yet defined.',
      },
      {
        id: 'defined',
        label: 'Defined',
        meaning:
          'Formula, unit, window and exclusions are written down and versioned.',
      },
      {
        id: 'instrumented',
        label: 'Instrumented',
        meaning:
          'The events the definition needs are actually being recorded.',
      },
      {
        id: 'reporting',
        label: 'Reporting',
        meaning:
          'Values are published beside the definition version that produced them.',
      },
      {
        id: 'deprecated',
        label: 'Deprecated',
        meaning:
          'The metric is no longer published; the reason and the last definition version remain visible.',
      },
    ],
    metrics: [
      {
        id: 'attempt-rate',
        name: 'Attempt rate',
        definition:
          'Learners who attempted at least one activity in a window, divided by learners with access in that window. Access is defined by the programme’s eligibility records.',
        unit: 'ratio 0–1',
        source: 'Activity attempts and eligibility records.',
      },
      {
        id: 'completion-rate',
        name: 'Completion rate',
        definition:
          'Activities marked complete in a window, divided by activities started in that window. Retries of the same activity count once; abandoned attempts remain in the denominator.',
        unit: 'ratio 0–1',
        source: 'Activity start and completion events.',
      },
      {
        id: 'mastery-estimate',
        name: 'Mastery estimate',
        definition:
          'Per-skill estimate produced by a named, versioned scoring algorithm from evidence items. Published as an estimate with its algorithm version — never as a grade.',
        unit: 'estimate (algorithm-versioned)',
        source: 'Evidence items and the scoring algorithm’s published specification.',
      },
      {
        id: 'hint-usage',
        name: 'Hint usage',
        definition:
          'Hints opened divided by attempts in a window, with the hint policy version. A rise is ambiguous by design: it can mean struggle or engagement.',
        unit: 'ratio 0–1',
        source: 'Hint-open events and attempt events.',
      },
      {
        id: 'time-on-task',
        name: 'Time on task',
        definition:
          'Sum of active interaction intervals per task, excluding idle gaps beyond a configured idle threshold. The threshold is published with every value.',
        unit: 'wall-clock duration',
        source: 'Interaction events with the configured idle threshold.',
      },
    ],
    integrityRule:
      'A metric reaches REPORTING only after its definition is versioned, and every published value carries that version. Proxy metrics are labelled proxies and never presented as learning outcomes; no user, usage or outcome figures are invented to make a dashboard look complete.',
  },
  {
    id: 'access-queue',
    order: 4,
    title: 'Access demand & eligibility queue',
    purpose:
      'Make demand for subsidised access visible as a fair queue with published eligibility rules — not as a growth trophy.',
    adaptedFrom:
      'Dashboard concept 4/07 — “Waitlist Counter” (waitlist size, weekly growth, referral rate, launch countdown).',
    context:
      'Programmes that subsidise data or learning access receive far more requests than they can fund. The waitlist counter becomes a queue with explicit eligibility states, so “demand” means real requests against real policy — and no waitlist total, growth rate or user count is ever displayed as demonstration content.',
    states: [
      {
        id: 'received',
        label: 'Received',
        meaning: 'A request exists in the ledger and awaits review.',
      },
      {
        id: 'eligibility-check',
        label: 'Eligibility check',
        meaning:
          'The request is being checked against the versioned eligibility policy.',
      },
      {
        id: 'eligible',
        label: 'Eligible',
        meaning:
          'The request satisfies the policy in force at decision time; the decision records the policy version.',
      },
      {
        id: 'offered-access',
        label: 'Offered access',
        meaning: 'A funded place is offered and awaiting acceptance.',
      },
      {
        id: 'in-use',
        label: 'In use',
        meaning: 'The place is accepted and the access is active.',
      },
      {
        id: 'deferred',
        label: 'Deferred',
        meaning:
          'Not funded in this round. A deferral is not a rejection; the reason category is recorded.',
      },
      {
        id: 'declined',
        label: 'Declined',
        meaning: 'The request was declined with a recorded reason, appealable where policy allows.',
      },
      {
        id: 'withdrawn',
        label: 'Withdrawn',
        meaning: 'The requester withdrew the request.',
      },
    ],
    metrics: [
      {
        id: 'queue-depth',
        name: 'Queue depth',
        definition:
          'Count of requests in “received” or “eligibility check” at a stated observation time. Published only from the request ledger, with the observation timestamp.',
        unit: 'count at a timestamp',
        source: 'The access-request ledger.',
      },
      {
        id: 'decision-time',
        name: 'Decision time',
        definition:
          'Wall-clock time from request receipt to the recorded eligibility decision, summarised as a median with its window and sample count.',
        unit: 'wall-clock duration',
        source: 'Receipt and decision timestamps in the ledger.',
      },
      {
        id: 'eligibility-coverage',
        name: 'Eligibility coverage',
        definition:
          'Fraction of requests in a window that carry a recorded eligibility decision, including the policy version used.',
        unit: 'ratio 0–1',
        source: 'The access-request ledger’s decision records.',
      },
      {
        id: 'deferral-breakdown',
        name: 'Deferral reason breakdown',
        definition:
          'Counts of deferrals by recorded reason category in a window. Categories come from policy, never free text.',
        unit: 'count per reason category',
        source: 'Deferral decision records.',
      },
    ],
    integrityRule:
      'Queue figures are published only from the request ledger, each with its observation time and policy version. No waitlist totals, growth curves or user counts appear as demonstration content — where there is no ledger, the console shows definitions, not numbers.',
  },
  {
    id: 'access-funding',
    order: 5,
    title: 'Access funding & reconciliation',
    purpose:
      'Prove that access funding moves from commitment to receipts, with every figure traceable to a record.',
    adaptedFrom:
      'Dashboard concept 5/07 — “Revenue Dashboard” (MRR, churn rate, subscriber counts per plan).',
    context:
      'Subscription-revenue dashboards are replaced by funding reconciliation: grants, bursaries and sponsored data commitments moving through disbursement to matched receipts. The honesty substitution is deliberate — money figures here would need a ledger, so none are shown.',
    states: [
      {
        id: 'committed',
        label: 'Committed',
        meaning: 'A funding source has committed an amount to a programme round.',
      },
      {
        id: 'disbursed',
        label: 'Disbursed',
        meaning: 'Funds or access credits have been sent to beneficiaries or partners.',
      },
      {
        id: 'receipted',
        label: 'Receipted',
        meaning: 'A receipt or usage confirmation exists for the disbursement.',
      },
      {
        id: 'reconciled',
        label: 'Reconciled',
        meaning: 'Disbursement and receipt records are matched and closed for the period.',
      },
      {
        id: 'disputed',
        label: 'Disputed',
        meaning: 'A mismatch is under investigation; both records remain visible.',
      },
      {
        id: 'written-off',
        label: 'Written off',
        meaning:
          'A documented decision closes an unreconcilable difference; the reason is published.',
      },
    ],
    metrics: [
      {
        id: 'reconciliation-coverage',
        name: 'Reconciliation coverage',
        definition:
          'Reconciled disbursements divided by total disbursed in a stated window — reported by record count and, where a ledger exists, by ledger amount, each traceable to entry identifiers.',
        unit: 'ratio 0–1 (with ledger references)',
        source: 'Disbursement and receipt ledger entries.',
      },
      {
        id: 'reconciliation-lag',
        name: 'Disbursement-to-reconciliation lag',
        definition:
          'Wall-clock time from disbursement record to matching reconciliation record, summarised as a median with window and sample count.',
        unit: 'wall-clock duration',
        source: 'Ledger timestamps.',
      },
      {
        id: 'open-items',
        name: 'Open unreconciled items',
        definition:
          'Count of disbursed-but-unreconciled records at a stated observation time, listed individually rather than summarised away.',
        unit: 'count at a timestamp',
        source: 'The ledger’s open items.',
      },
    ],
    integrityRule:
      'Every funding figure links to ledger entries and receipts; no MRR, revenue, churn or subscriber figures appear anywhere in this portfolio. A summary number is published only with its ledger window and entry count — without a ledger, this module ships definitions alone.',
  },
  {
    id: 'provider-health',
    order: 6,
    title: 'API & provider-adapter health',
    purpose:
      'Watch the external services the products depend on, and say plainly which dependency is failing and what the fallback is doing.',
    adaptedFrom:
      'Dashboard concept 6/07 — “Backend Health Monitor” (uptime percentage, average response time, error rate, server fleet).',
    context:
      'Learning products depend on adapters: authentication, storage, SMS and email gateways, model APIs, maps, payment processors. The health monitor reports observed probe results per adapter — not an aggregate comfort percentage — and keeps an explicit state for periods that were never measured.',
    states: [
      {
        id: 'healthy',
        label: 'Healthy',
        meaning: 'Recent probes passed within their documented expectations.',
      },
      {
        id: 'degraded',
        label: 'Degraded',
        meaning:
          'Probes pass with elevated failures or latency beyond the adapter’s published tolerance.',
      },
      {
        id: 'circuit-open',
        label: 'Circuit open',
        meaning:
          'The adapter’s circuit breaker is open; calls are failing fast to protect the product.',
      },
      {
        id: 'fallback-active',
        label: 'Fallback active',
        meaning:
          'A documented fallback path is serving traffic; the console names the fallback and what it costs in capability.',
      },
      {
        id: 'outage',
        label: 'Outage',
        meaning: 'The dependency is failing; the product’s degraded behaviour is described.',
      },
      {
        id: 'unknown',
        label: 'Unknown',
        meaning:
          'No probes ran in the window. Unknown is shown as unknown — never back-filled or inferred.',
      },
      {
        id: 'retired',
        label: 'Retired',
        meaning: 'The adapter is decommissioned; its history stays readable.',
      },
    ],
    metrics: [
      {
        id: 'probe-series',
        name: 'Probe result series',
        definition:
          'Success or failure of scheduled synthetic probes per adapter, published as timestamped results with the probe definition attached.',
        unit: 'timestamped pass/fail series',
        source: 'Scheduled probe runs.',
      },
      {
        id: 'fallback-activations',
        name: 'Fallback activations',
        definition:
          'Count of fallback activations per adapter in a stated window, each with its trigger event reference.',
        unit: 'count (with triggers)',
        source: 'Adapter fallback logs.',
      },
      {
        id: 'error-classes',
        name: 'Error classification counts',
        definition:
          'Failures grouped by recorded error class (timeout, auth, rate-limit, provider error, client error) per window — counts, not percentages without denominators.',
        unit: 'counts per error class',
        source: 'Adapter error logs with class labels.',
      },
    ],
    integrityRule:
      'Adapter status reflects recorded probe results only. No response-time or error-rate percentage is published without its probe definition, window and sample count, and windows without probes show “Unknown” instead of a guessed value.',
  },
  {
    id: 'performance-budgets',
    order: 7,
    title: 'Low-bandwidth performance budgets',
    purpose:
      'Keep the experience usable on slow connections by enforcing published budgets instead of chasing scores.',
    adaptedFrom:
      'Dashboard concept 7/07 — “Frontend Performance” (Lighthouse score, largest contentful paint, layout shift, load times).',
    context:
      'Budgets are the honest form of a performance dashboard: a named budget, a named measurement and a pass or fail. The reference thresholds below are the published Core Web Vitals guidance (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at the 75th percentile) — published budgets, not measurements of this or any site.',
    states: [
      {
        id: 'within-budget',
        label: 'Within budget',
        meaning: 'The latest named measurement is inside every applicable budget.',
      },
      {
        id: 'over-budget',
        label: 'Over budget',
        meaning: 'A named measurement exceeds a stated budget; the route and budget are named.',
      },
      {
        id: 'not-measured',
        label: 'Not measured',
        meaning:
          'No named measurement exists. Shown as not measured — never as passing.',
      },
      {
        id: 'under-revision',
        label: 'Budget under revision',
        meaning:
          'The budget itself is being renegotiated; the old budget stays visible until the new one is approved.',
      },
      {
        id: 'exempted',
        label: 'Exempted',
        meaning:
          'A documented, time-limited exemption exists, with an expiry date and a reason.',
      },
    ],
    metrics: [
      {
        id: 'page-weight',
        name: 'Page weight (transfer)',
        definition:
          'Compressed transfer size of a route’s initial load, measured from a named lab run or field collection window.',
        unit: 'bytes',
        source: 'Named lab runs or field collection.',
      },
      {
        id: 'request-count',
        name: 'Request count',
        definition:
          'Number of network requests for a route’s initial load in a named run, compared against a published request budget.',
        unit: 'count',
        source: 'Named lab runs.',
      },
      {
        id: 'web-vitals-budget',
        name: 'Web-vitals budget check',
        definition:
          'LCP, INP and CLS at the 75th percentile compared against the published thresholds (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1). Published with the measurement source and window every time.',
        unit: 'seconds / milliseconds / unitless score',
        source: 'Field data or named lab runs; thresholds are published guidance.',
      },
      {
        id: 'budget-violations',
        name: 'Budget violations',
        definition:
          'Count of routes over any budget in a stated window, each listed with the budget it violates.',
        unit: 'count (with routes)',
        source: 'Budget-check run results.',
      },
    ],
    integrityRule:
      'A budget status appears only alongside a named measurement run (lab run identifier or field window) with its date; routes without a run show “Not measured”. Performance scores are never quoted without their run, and the Core Web Vitals thresholds are labelled as published budgets — not as results of this site.',
  },
];

/** The series the seven modules are openly adapted from. */
export const operationsProvenance = {
  source:
    'A public seven-part dashboard-concept series (“what should a product’s dashboards show”): status page, changelog, analytics, waitlist counter, revenue dashboard, backend health and frontend performance.',
  adaptation:
    'Each concept is mapped onto education-technology programme operations. The series’ SaaS demonstration figures (uptime percentages, MRR, churn, waitlist totals, active-user and signup counts) are deliberately not reproduced anywhere: this layer ships explicit states, metric definitions and integrity rules instead of invented values.',
};
