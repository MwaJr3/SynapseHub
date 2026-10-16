import type { JourneyTheme } from '@/types';

/**
 * The portfolio grouped by technical theme rather than by date.
 *
 * These are conceptual groupings: no chronology is implied, and if genuine
 * project dates are configured the library can be sorted chronologically
 * without changing this data.
 */
export const journeyThemes: JourneyTheme[] = [
  {
    id: 'learning-access-foundations',
    title: 'Learning Access Foundations',
    description:
      'The starting premise of the portfolio: learning has to survive a bad connection, and sometimes there is no connection at all. These two projects carry the offline-first idea from a browser-based course platform to a message on a basic phone.',
    slugs: ['learnbridge', 'reachlearn'],
    focusPoints: [
      'Offline-first delivery as a per-item promise rather than a marketing claim',
      'Progress preservation: local queues, idempotent uploads and explicit sync states',
      'Channel constraints: storage limits in a browser, message segmentation on a phone',
      'Consent, quiet hours and opt-out as first-class parts of low-connectivity delivery',
    ],
  },
  {
    id: 'personalized-learning-assessment',
    title: 'Personalized Learning and Assessment',
    description:
      'Access is only half of the problem; the other half is knowing what a learner needs next and being honest about the uncertainty. This pair pairs grounded AI support with evidence-based assessment.',
    slugs: ['tutorspring', 'pathwise'],
    focusPoints: [
      'Retrieval over approved material, with citations the learner can open',
      'Uncertainty stated as "not yet assessed" instead of a low score',
      'Rule-based mastery estimates that are transparent about not being psychometric models',
      'Human oversight: teacher review queues, overrides and recorded reasons',
    ],
  },
  {
    id: 'teaching-classroom-workflows',
    title: 'Teaching and Classroom Workflows',
    description:
      'Software only helps if it fits the working week of a teacher. These projects cover the lesson itself — scheduled or asynchronous — and the material that has to be written, reviewed and published before it can be taught.',
    slugs: ['classconnect', 'teachcraft'],
    focusPoints: [
      'Session lifecycle, membership-based room authorisation and attendance from events',
      'A real-time provider behind an adapter, with an honest unavailable state',
      'Structured authoring, review workflows and immutable published versions',
      'Asynchronous fallback so a missed session is not a lost lesson',
    ],
  },
  {
    id: 'shared-resources-contextual-access',
    title: 'Shared Resources and Contextual Access',
    description:
      'Learning material and the money to access it are both shared resources. These projects treat licensing, attribution, localisation and subsidised seats as workflows with rules, records and review.',
    slugs: ['openlearn-commons', 'eduaccess'],
    focusPoints: [
      'Provenance and licence metadata that distinguish open licensing from public reachability',
      'Adaptation and translation review that keeps a contribution attached to its source',
      'Access plans, funded seats, eligibility windows and human-reviewed decisions',
      'Auditability: reasons, reviewers, allocation invariants and financial state honesty',
    ],
  },
  {
    id: 'evidence-and-improvement',
    title: 'Evidence and Improvement',
    description:
      'Finally, the portfolio turns back on itself: what can be measured, what the definitions actually mean, and where data is too thin to support a conclusion.',
    slugs: ['learnpulse'],
    focusPoints: [
      'Idempotent ingestion and row-level validation of imported learning events',
      'Metric definitions stored and versioned next to the numbers they produce',
      'Support flags that display their rule and evidence, and can be dismissed',
      'Small-cohort suppression and reporting that separates participation from proficiency',
    ],
  },
];
