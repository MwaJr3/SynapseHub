import type { PortfolioProject } from '@/types';

export const learnpulse: PortfolioProject = {
  id: 'project-07-learnpulse',
  slug: 'learnpulse',
  name: 'LearnPulse',
  shortDescription:
    'A learning-analytics dashboard that turns course and assessment records into evidence-based insight about where learners may need support — with every metric defined.',
  longDescription:
    'LearnPulse is deliberately not a ranking tool. It ingests learning events idempotently, validates them, computes metrics whose definitions are stored with the report, and raises support flags from transparent rules that show their evidence. A teacher can dismiss or annotate a flag and record the follow-up, because the analytics exist to prompt professional judgement, not to replace it.',
  primaryCategory: 'Education Technology / Analytics / Data Processing',
  categories: ['assessment-analytics', 'teacher-tools', 'full-stack', 'python'],
  technologies: [
    'React',
    'TypeScript',
    'Tailwind CSS',
    'Python',
    'FastAPI',
    'Pydantic',
    'PostgreSQL',
    'Pandas / Polars (bounded analysis)',
    'Background aggregation',
  ],
  featureTags: [
    'Idempotent ingestion',
    'Metric definitions',
    'Transparent flags',
    'Data-quality checks',
    'Cohort privacy',
  ],
  features: [
    {
      title: 'Documented ingestion paths',
      description:
        'A defined event schema, a documented API for learning applications and a validated CSV import, all sharing one validation layer and one set of rejection reasons.',
      importance:
        'Analytics fail at the door; rejected rows have to be explainable to the person who imported them.',
    },
    {
      title: 'Idempotent event storage',
      description:
        'Events carry stable identifiers, so re-importing a corrected file or retrying a webhook updates rather than duplicates records.',
      importance:
        'Duplicate events silently inflate every participation metric in the product.',
    },
    {
      title: 'Course and class summaries',
      description:
        'Participation, assessment outcome and assignment completion views with configurable date ranges.',
      importance:
        'Most teacher questions are trend questions, and trends need comparable windows.',
    },
    {
      title: 'Metric definitions next to the numbers',
      description:
        'Every metric states how it is calculated, which events it counts and how missing data affects it; definitions are versioned with the report.',
      importance:
        'A number without a definition will be interpreted differently by every reader.',
    },
    {
      title: 'Transparent support flags',
      description:
        'Flags are raised by configurable rules — for example repeated missed assignments or repeated errors on a prerequisite skill — and each one displays the rule, the window and the records that triggered it.',
      importance:
        'An unexplained alert about a child is worse than no alert, because it invites action on no evidence.',
    },
    {
      title: 'Teacher annotations and follow-up',
      description:
        'A flag can be dismissed or annotated with a supportive action, and the outcome stays attached to the record.',
      importance: 'The value of analytics is the intervention, not the alert.',
    },
    {
      title: 'Data-quality surfaces',
      description:
        'Missing event types, duplicate records, late synchronisation, inconsistent course identifiers and incomplete assessments are reported instead of being silently smoothed away.',
      importance:
        'Knowing the data is thin changes the conclusion a teacher should draw from it.',
    },
    {
      title: 'Privacy-conscious reporting',
      description:
        'Group comparisons suppress small cohorts, individual drill-down is restricted to authorised staff, and exports carry cohort sizes and data-source timestamps.',
      importance:
        'Small-group statistics can expose an individual learner without naming them.',
    },
  ],
  visualLabel: 'Illustrative analytics and support-flag preview',
  previews: [
    {
      id: 'learnpulse-primary',
      view: 'primary',
      alt: 'Illustrative preview of a class participation and assessment overview with metric definitions beside each figure.',
      caption:
        'Class overview with metric definitions, cohort size and data-quality notes.',
      isIllustrative: true,
    },
    {
      id: 'learnpulse-detail',
      view: 'detail',
      alt: 'Illustrative preview of a support flag showing the rule, the evidence and the teacher follow-up controls.',
      caption:
        'Support flag with its rule, evidence window and recorded teacher follow-up.',
      isIllustrative: true,
    },
  ],
  architecture: [
    {
      id: 'client',
      label: 'React + TypeScript client',
      layer: 'client',
      description:
        'Dashboards, filters, drill-down, import wizard, report builder and metric definitions.',
      connectsTo: ['api'],
    },
    {
      id: 'api',
      label: 'FastAPI service',
      layer: 'api',
      description:
        'Authorised read endpoints, imports, annotations and report exports.',
      connectsTo: ['ingestion', 'metrics'],
    },
    {
      id: 'ingestion',
      label: 'Ingestion and validation',
      layer: 'domain',
      description:
        'Schema validation, de-duplication keys, late-arrival handling and row-level rejection reports.',
      connectsTo: ['event-store'],
    },
    {
      id: 'event-store',
      label: 'Event store',
      layer: 'data',
      description:
        'Append-only learning events with source, timestamp and dedupe keys.',
      connectsTo: ['aggregation'],
    },
    {
      id: 'aggregation',
      label: 'Aggregation jobs',
      layer: 'worker',
      description:
        'Scheduled, bounded aggregation into derived measures per course, class and topic.',
      connectsTo: ['database'],
    },
    {
      id: 'metrics',
      label: 'Metric and flag engine',
      layer: 'domain',
      description:
        'Versioned metric definitions and rule-based support flags with machine-readable evidence.',
      connectsTo: ['database'],
    },
    {
      id: 'database',
      label: 'PostgreSQL',
      layer: 'data',
      description:
        'Events, imports, aggregates, flag definitions, annotations, follow-ups and export history.',
    },
  ],
  caseStudy: {
    problem:
      'Teachers have more data than time. Dashboards that surface opaque risk scores invite conclusions the data cannot support, and participation counts get read as ability. Meanwhile the mundane problems — a class missing one type of event entirely, a topic where most learners repeat the same error — are exactly the ones that a well-defined metric can reveal.',
    users: [
      'Teachers looking for topics that need reteaching',
      'Programme managers reporting on a cohort',
      'Data and programme staff importing records from other systems',
      'School leaders reviewing participation trends across classes',
    ],
    constraints: [
      'Absence of events is not evidence of absence of learning; the interface must say so.',
      'Events arrive late, duplicated and inconsistently identified, so quality must be handled, not assumed.',
      'Small cohorts can identify individuals, so group reporting needs suppression rules.',
      'Analytics must not drive high-stakes decisions automatically; flags are prompts for human review.',
    ],
    workflow: [
      {
        title: 'Import events',
        description:
          'Send events through the documented API or upload a validated CSV with a preview of accepted and rejected rows.',
      },
      {
        title: 'Validate the data',
        description:
          'Duplicates, unknown course identifiers, out-of-range timestamps and incomplete assessments are reported per row.',
      },
      {
        title: 'Compute metrics',
        description:
          'Bounded aggregation jobs calculate participation, completion and assessment measures over the selected windows.',
      },
      {
        title: 'Raise transparent flags',
        description:
          'Configurable rules raise support flags, each carrying the rule, the window and the events that matched.',
      },
      {
        title: 'Teacher review',
        description:
          'The teacher dismisses or annotates the flag and records a follow-up action.',
      },
      {
        title: 'Report',
        description:
          'Exports include date range, data sources, metric definitions, cohort sizes and the export timestamp.',
      },
    ],
    engineeringDecisions: [
      {
        title: 'Idempotent ingestion by design',
        description:
          'Each event carries a stable dedupe key derived from the source system, entity and occurrence, and ingestion upserts on that key, so retries and corrected re-imports converge instead of inflating counts.',
      },
      {
        title: 'Metric definitions are stored and versioned',
        description:
          'Definitions live as data — numerator, denominator, filters and known limitations — so a report produced under an older definition remains interpretable and changes are reviewable.',
      },
      {
        title: 'Flags show their evidence',
        description:
          'A flag is generated from an explicit rule with a machine-readable match list, and the UI renders the rule text, the time window and the contributing records next to the suggested action.',
      },
      {
        title: 'Correlation is labelled as correlation',
        description:
          'Comparison views describe differences between groups without causal language, and pre/post summaries separate participation change from proficiency change.',
      },
      {
        title: 'Small-cohort protection',
        description:
          'Group views below a configurable cohort size are suppressed rather than shown in aggregate, because small-group statistics can single out a learner.',
      },
      {
        title: 'Bounded analytics work',
        description:
          'Aggregation runs in scheduled windows over bounded ranges with pandas or polars, and heavy requests are served from derived tables rather than computed on every page load.',
      },
    ],
    testing: [
      'Aggregation arithmetic against a fixture of known events, including boundary dates.',
      'Duplicate detection and idempotent re-import behaviour.',
      'CSV validation, including rejected-row reporting and partial-success imports.',
      'Date-range, course, class and topic filtering, including empty selections.',
      'Small-cohort suppression and drill-down permission checks.',
      'Flag rule evaluation and the evidence attached to each raised flag.',
      'Export contents: definitions, cohort sizes and source timestamps.',
    ],
    limitations: [
      'Metrics describe recorded events only. Learners whose activity was never logged are invisible, and the interface states this rather than treating silence as disengagement.',
      'No predictive risk scoring and no causal inference: the product does not forecast failure or claim an intervention worked.',
      'Topic-level misconceptions depend on assessment metadata being present in the imported events.',
      'Data quality is bounded by the upstream systems; inconsistent identifiers must be corrected at the source.',
      'Suppression thresholds are configuration, not a statistical guarantee.',
    ],
    futureImprovements: [
      'Scheduled import connectors for the learning applications in this portfolio, so manual CSV exports become optional.',
      'Configurable report templates for programme reporting across several classes.',
      'Intervention outcome tracking that records what was tried and what followed, without implying causation.',
      'A documented metric catalogue page for every derived measure in the product.',
    ],
  },
  featured: false,
  status: 'completed',
  displayOrder: 7,
  relatedSlugs: ['classconnect', 'pathwise', 'eduaccess'],
  demoRequirements:
    'Runs on synthetic event fixtures generated locally. No third-party analytics service or credentials are involved.',
};
