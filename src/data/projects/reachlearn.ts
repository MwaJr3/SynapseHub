import type { PortfolioProject } from '@/types';

export const reachlearn: PortfolioProject = {
  id: 'project-08-reachlearn',
  slug: 'reachlearn',
  name: 'ReachLearn',
  shortDescription:
    'A channel-neutral microlearning gateway that delivers short lessons and questions over SMS, USSD and IVR so learners on basic phones can study without mobile data.',
  longDescription:
    'ReachLearn authors one lesson and renders it per channel: a segmented SMS message, a USSD menu within depth limits, or an IVR script with keypad answers. A learner state machine keeps progress consistent across channels, consent and opt-out are enforced before delivery, and the development simulator is labelled as a simulator so no demo is ever mistaken for a carrier delivery receipt.',
  primaryCategory: 'Education Technology / Mobile Learning / Low Connectivity',
  categories: [
    'mobile-low-bandwidth',
    'offline-first',
    'teacher-tools',
    'full-stack',
    'python',
  ],
  technologies: [
    'React',
    'TypeScript',
    'Tailwind CSS',
    'Python',
    'FastAPI',
    'PostgreSQL',
    'SQLAlchemy',
    'Redis',
    'Celery (job queue)',
    'Configurable SMS / USSD / IVR provider adapters',
  ],
  featureTags: [
    'SMS / USSD / IVR',
    'Learner state machine',
    'Consent & opt-out',
    'Idempotent callbacks',
    'Simulator',
  ],
  features: [
    {
      title: 'Short lesson authoring',
      description:
        'Educators write concise lessons, multiple-choice questions, revision prompts and learning sequences sized for text and audio delivery.',
      importance:
        'Authoring for a 160-character message is a different craft from authoring a lesson page.',
    },
    {
      title: 'Channel-neutral content model',
      description:
        'One content record renders to a web preview, SMS message, USSD menu or IVR script, with validation for message length, segmentation and menu depth per channel.',
      importance:
        'Content maintained per channel drifts within a term and cannot be reported on coherently.',
    },
    {
      title: 'Explicit consent and opt-out',
      description:
        'Enrolment records consent before outbound messages begin, and STOP/unsubscribe handling plus preference management work per configured channel and jurisdiction.',
      importance:
        'Messaging learners without recorded consent is both a legal and an ethical failure.',
    },
    {
      title: 'Learner state machine',
      description:
        'The learner\u2019s current lesson, accepted responses, completed modules, retry counts and next scheduled activity are held as an explicit state machine shared across channels.',
      importance:
        'A learner who answers by SMS and later dials USSD must resume exactly where they left off.',
    },
    {
      title: 'Scheduling with quiet hours and caps',
      description:
        'Nudges, reminders and review questions are scheduled with opt-in controls, quiet hours, frequency caps and time-zone awareness.',
      importance:
        'Message fatigue is how a learning programme loses its learners permanently.',
    },
    {
      title: 'Provider adapters and honest statuses',
      description:
        'SMS, USSD and IVR providers sit behind adapters; delivery states distinguish queued, sent, delivered, failed and unknown, and nothing is reported as delivered without a provider result.',
      importance:
        'A learning programme that believes undelivered messages arrived will misjudge everything downstream.',
    },
    {
      title: 'Idempotent, signature-verified callbacks',
      description:
        'Inbound provider callbacks validate signatures and de-duplicate by message identifier, and retries are limited to operations the provider documents as safe.',
      importance:
        'Retried callbacks cause duplicate lesson advances and double-counted answers.',
    },
    {
      title: 'Labelled local simulator',
      description:
        'A simulator renders channel previews and drives the state machine for development and demos, and is labelled in the interface as a simulator rather than a live channel.',
      importance:
        'Simulator output that looks like a delivery receipt is a fabricated success state.',
    },
  ],
  visualLabel: 'Illustrative SMS/USSD lesson and delivery-state preview',
  previews: [
    {
      id: 'reachlearn-primary',
      view: 'primary',
      alt: 'Illustrative preview of a phone showing a segmented SMS lesson with a multiple-choice reply prompt.',
      caption:
        'Channel preview: a lesson rendered as segmented SMS with a reply prompt.',
      isIllustrative: true,
    },
    {
      id: 'reachlearn-detail',
      view: 'detail',
      alt: 'Illustrative preview of a delivery queue showing queued, sent, delivered, failed and simulator-labelled states.',
      caption:
        'Delivery queue with explicit states and simulator-labelled entries.',
      isIllustrative: true,
    },
  ],
  architecture: [
    {
      id: 'web',
      label: 'React + TypeScript console',
      layer: 'client',
      description:
        'Content studio, channel previews, cohort manager, delivery queue and reports.',
      connectsTo: ['api'],
    },
    {
      id: 'api',
      label: 'FastAPI service',
      layer: 'api',
      description:
        'Authoring, enrolment, learner session endpoints and provider callback receivers.',
      connectsTo: ['domain'],
    },
    {
      id: 'domain',
      label: 'Learner state machine',
      layer: 'domain',
      description:
        'Progress, response acceptance, retries, consent state and next-activity decisions.',
      connectsTo: ['database', 'queue'],
    },
    {
      id: 'renderers',
      label: 'Channel renderers',
      layer: 'domain',
      description:
        'SMS segmentation, USSD menu construction and IVR script generation, each with validation limits.',
      connectsTo: ['adapters'],
    },
    {
      id: 'adapters',
      label: 'Provider adapters',
      layer: 'integration',
      description:
        'SMS, USSD and IVR providers behind one interface, including the labelled local simulator.',
      connectsTo: ['queue'],
    },
    {
      id: 'queue',
      label: 'Job queue and scheduler',
      layer: 'worker',
      description:
        'Rate-limited delivery, quiet hours, reminders, retries and status reconciliation.',
      connectsTo: ['redis'],
    },
    {
      id: 'redis',
      label: 'Redis',
      layer: 'data',
      description:
        'Queue broker, in-flight message state and callback de-duplication keys.',
      connectsTo: ['database'],
    },
    {
      id: 'database',
      label: 'PostgreSQL',
      layer: 'data',
      description:
        'Lessons, channel variants, cohorts, consent, deliveries, responses, progress and audit events.',
    },
  ],
  caseStudy: {
    problem:
      'A large share of learners reach the internet through a basic phone, where data is expensive and a browser-based course is not an option. Those learners are excluded twice: first by cost, then by a course design that assumes a smartphone, a stable connection and a data bundle. SMS, USSD and voice channels already reach them, but they need lesson structure, progress and reporting to be useful for learning rather than for notification.',
    users: [
      'Learners with basic phones in low-connectivity areas',
      'Adult learners studying in short increments',
      'Teachers and facilitators running cohort programmes',
      'Programme administrators reporting on participation',
    ],
    constraints: [
      'Message length, menu depth and audio duration are hard limits imposed by the channel, not by the product.',
      'Delivery is asynchronous and unreliable; receipts vary by provider and region.',
      'Consent, opt-out, quiet hours and message frequency are obligations, not features.',
      'Phone numbers are personal data, and logs must not become a second uncontrolled copy.',
    ],
    workflow: [
      {
        title: 'Author for every channel',
        description:
          'Write the lesson once, then check the SMS, USSD and IVR renderings against channel limits.',
      },
      {
        title: 'Enrol with consent',
        description:
          'The learner enrols and consents explicitly; preferences and quiet hours are recorded at that point.',
      },
      {
        title: 'Deliver an activity',
        description:
          'The scheduler sends a lesson, question or reminder within frequency caps and quiet hours.',
      },
      {
        title: 'Receive the response',
        description:
          'An SMS reply, USSD selection or IVR keypress advances the learner state machine.',
      },
      {
        title: 'Schedule the next activity',
        description:
          'Progress determines the next lesson or a spaced review prompt on a later day.',
      },
      {
        title: 'Report on delivery and completion',
        description:
          'Teacher reports distinguish delivered, failed and unknown outcomes, and cohort completion is exportable.',
      },
    ],
    engineeringDecisions: [
      {
        title: 'One content model, per-channel renderers',
        description:
          'Lesson content is stored once in a channel-neutral structure; each channel renders it through a validating renderer that rejects content exceeding message segmentation or menu-depth limits.',
      },
      {
        title: 'A single learner state machine across channels',
        description:
          'Progress is not stored per channel. SMS, USSD, IVR and the optional web view drive the same state machine, so a learner can switch device mid-course without losing their place.',
      },
      {
        title: 'Consent is enforced before delivery',
        description:
          'Delivery jobs check consent and subscription state at send time, and opt-out processing is immediate — a queued message for an unsubscribed learner is cancelled rather than sent.',
      },
      {
        title: 'Idempotent callback handling',
        description:
          'Callbacks are verified against the provider signature and de-duplicated on the provider message identifier in Redis, which is what makes a retried webhook harmless.',
      },
      {
        title: 'Honest delivery semantics',
        description:
          'Statuses mirror provider vocabulary and stay "unknown" when the provider gives no result. Only a confirmed provider receipt is ever shown as delivered, and simulator output is labelled separately from live channels.',
      },
      {
        title: 'Data minimisation for phone numbers',
        description:
          'Numbers are stored only where delivery requires them, redacted in logs where feasible, and not exposed in reports, which show cohort-level outcomes instead.',
      },
    ],
    testing: [
      'Learner state transitions, including out-of-order and repeated responses.',
      'Opt-out and consent enforcement, including cancelling queued messages after unsubscribe.',
      'Callback signature validation and idempotency under repeated delivery.',
      'Scheduling correctness: time zones, quiet hours and frequency caps.',
      'Message segmentation and USSD menu depth validation at authoring time.',
      'Permissions for cohort management and report access.',
      'Provider failure handling, including retry limits and status reconciliation.',
    ],
    limitations: [
      'SMS and USSD sessions are slow and terse; the interaction design budget is a few words per screen and it shows.',
      'Delivery receipts are unavailable or delayed with some providers, so statuses remain unknown for a share of messages.',
      'IVR quality depends on the telephony provider and the learner\u2019s network coverage.',
      'Real outbound messaging has a per-message cost that the deployment must budget for; the simulator exists precisely so this is not assumed.',
      'Learning content is text-first: complex diagrams and long-form reading cannot be delivered through these channels.',
    ],
    futureImprovements: [
      'Offline-capable facilitator mode so a class can complete activities with a single connected device.',
      'More African language prompts recorded with native speakers for IVR delivery.',
      'Adaptive pacing that varies message frequency by response pattern and explicit learner preference.',
      'Integration hooks so course completion data can flow into an LMS or analytics pipeline.',
    ],
  },
  featured: true,
  status: 'completed',
  displayOrder: 8,
  relatedSlugs: ['learnbridge', 'openlearn-commons', 'eduaccess'],
  demoRequirements:
    'The studio, channel previews, state machine and delivery queue run against the labelled local simulator with no external account. Live SMS, USSD or IVR delivery requires a configured provider and its server-side credentials.',
};
