import type { PortfolioProject } from '@/types';

export const classconnect: PortfolioProject = {
  id: 'project-02-classconnect',
  slug: 'classconnect',
  name: 'ClassConnect',
  shortDescription:
    'A low-bandwidth virtual classroom for scheduling sessions, sharing materials, tracking attendance and following up asynchronously when a learner could not stay connected.',
  longDescription:
    'ClassConnect separates the classroom from the video call. Scheduling, materials, attendance and follow-up live in the application; live audio and video are delegated to a configurable WebRTC provider behind an adapter. When that provider is not configured or not reachable, the application says so and keeps the asynchronous lesson workflow usable instead of simulating a call.',
  primaryCategory:
    'Education Technology / Virtual Classroom / Real-Time Applications',
  categories: [
    'virtual-classrooms',
    'mobile-low-bandwidth',
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
    'LiveKit (configurable WebRTC provider)',
    'Server-sent events',
  ],
  featureTags: [
    'Session scheduling',
    'Provider adapter',
    'Low-bandwidth mode',
    'Attendance',
    'Async follow-up',
  ],
  features: [
    {
      title: 'Classes, enrolment and schedules',
      description:
        'Teachers create a class, enrol learners, publish session objectives and schedule sessions with rescheduling and cancellation handled explicitly.',
      importance:
        'Schedules change constantly in real classrooms; the system has to model that rather than lose it.',
    },
    {
      title: 'Short-lived room authorisation',
      description:
        'The backend checks class membership and issues a short-lived room token for the configured WebRTC provider. Provider secrets never leave the server.',
      importance:
        'A classroom link is access to minors in some deployments; membership must be checked server-side.',
    },
    {
      title: 'Low-bandwidth participation',
      description:
        'A participation profile can disable video, lower media quality and prioritise audio and text chat where the provider supports it.',
      importance:
        'On a thin connection, audio plus text is the difference between attending and not attending.',
    },
    {
      title: 'Chat, question queue and polls',
      description:
        'Text chat, a hand-raise/question queue and short polls run in the application, so participation still works when media does not.',
      importance:
        'Interaction is the learning activity; it should not depend on the video track succeeding.',
    },
    {
      title: 'Attendance and session status',
      description:
        'Sessions move through scheduled, starting, live, ended, cancelled and failed states, and attendance is recorded from join events rather than asserted by the teacher.',
      importance:
        'Programmes need attendance evidence, and learners need to see whether a session actually took place.',
    },
    {
      title: 'Materials and post-class summary',
      description:
        'Lesson outlines and approved files are shared before class, and the teacher writes a summary with follow-up work afterwards.',
      importance:
        'Most learners who miss a session need the material and the summary, not a recording.',
    },
    {
      title: 'Asynchronous follow-up space',
      description:
        'Questions, assignments and teacher responses remain available after the session, with the same membership rules as the class itself.',
      importance:
        'A learner who dropped out mid-session must have a path back into the lesson.',
    },
    {
      title: 'Honest unavailability states',
      description:
        'Recordings are disabled by default and gated on consent and retention settings; if the provider is unconfigured the live stage is replaced by an explicit notice, not a fake call.',
      importance:
        'Fabricated success states in a classroom tool hide the problem from the teacher who could fix it.',
    },
  ],
  visualLabel: 'Illustrative session-schedule and live-room state preview',
  previews: [
    {
      id: 'classconnect-primary',
      view: 'primary',
      alt: 'Illustrative preview of a weekly session schedule with session states and participant counts.',
      caption:
        'Session schedule with states, materials and low-bandwidth indicators.',
      isIllustrative: true,
    },
    {
      id: 'classconnect-detail',
      view: 'detail',
      alt: 'Illustrative preview of a live room showing audio participants, chat and a question queue with the video track disabled.',
      caption:
        'Low-bandwidth live stage: audio, text chat and the question queue with video off.',
      isIllustrative: true,
    },
  ],
  architecture: [
    {
      id: 'client',
      label: 'React + TypeScript client',
      layer: 'client',
      description:
        'Educator dashboard, schedule, session lobby and live stage.',
      connectsTo: ['api', 'realtime'],
    },
    {
      id: 'realtime',
      label: 'WebRTC provider adapter',
      layer: 'integration',
      description:
        'LiveKit (or another configured provider) behind a narrow adapter interface.',
      connectsTo: ['token-service'],
    },
    {
      id: 'token-service',
      label: 'Room token service',
      layer: 'domain',
      description:
        'Verifies class membership and issues short-lived, scoped room tokens.',
      connectsTo: ['api'],
    },
    {
      id: 'api',
      label: 'FastAPI service',
      layer: 'api',
      description:
        'Classes, enrolments, sessions, attendance, messages, polls and assignments.',
      connectsTo: ['domain'],
    },
    {
      id: 'domain',
      label: 'Session lifecycle logic',
      layer: 'domain',
      description:
        'State transitions, scheduling conflicts, attendance rules and moderation permissions.',
      connectsTo: ['database'],
    },
    {
      id: 'redis',
      label: 'Redis',
      layer: 'data',
      description:
        'Presence, ephemeral participant state and the event fan-out for server-sent updates.',
      connectsTo: ['api'],
    },
    {
      id: 'database',
      label: 'PostgreSQL',
      layer: 'data',
      description:
        'Classes, sessions, attendance, polls, assignments, notes and consent records.',
    },
    {
      id: 'storage',
      label: 'Object storage',
      layer: 'integration',
      description:
        'Shared materials and optional, consented recordings with retention limits.',
    },
  ],
  caseStudy: {
    problem:
      'Remote lessons are unreliable when the platform is a video call first: a learner with a weak connection joins, cannot see or hear, and leaves with nothing. Teachers also lose the classroom bookkeeping — who attended, what was covered, what happens next — because it lives outside the call.',
    users: [
      'Teachers running remote or blended lessons on limited bandwidth',
      'Learners attending from phones and thin connections',
      'School and programme administrators tracking attendance and participation',
      'Support staff helping a participant rejoin a session',
    ],
    constraints: [
      'Live media quality is bounded by the learner\u2019s connection and the chosen provider, not by the application.',
      'Recordings require consent, retention limits and access control, and are therefore off by default.',
      'Class membership must be enforced server-side because a room link is effectively an entry token.',
      'Sessions must stay useful when the provider is unconfigured, down or blocked by a network.',
    ],
    workflow: [
      {
        title: 'Create the class',
        description:
          'The teacher creates a class, publishes learning objectives and enrols participants.',
      },
      {
        title: 'Schedule and share',
        description:
          'Sessions are scheduled in the learner\u2019s local time zone with materials attached in advance.',
      },
      {
        title: 'Join with an authorising token',
        description:
          'The client requests a short-lived room token after the server verifies membership.',
      },
      {
        title: 'Participate at the available bandwidth',
        description:
          'Audio, text chat, question queue and polls remain available with video disabled.',
      },
      {
        title: 'Record attendance',
        description:
          'Join and leave events maintain attendance and the session state machine advances to ended or failed.',
      },
      {
        title: 'Follow up asynchronously',
        description:
          'The teacher posts a summary, assignments and answers to questions from learners who missed the session.',
      },
    ],
    engineeringDecisions: [
      {
        title: 'The provider sits behind an adapter',
        description:
          'Room creation, token issuance and participant events are expressed in the application\u2019s own vocabulary, so swapping LiveKit for another WebRTC service does not reach into scheduling, attendance or the UI beyond one module.',
      },
      {
        title: 'Short-lived, scoped tokens only',
        description:
          'Tokens are issued per session and per participant after a membership check, carry a limited lifetime, and are never persisted in the browser beyond the session they serve.',
      },
      {
        title: 'Session lifecycle as an explicit state machine',
        description:
          'Scheduled, starting, live, ended, cancelled and failed are modelled transitions with allowed predecessors, which is what makes "the session failed" a first-class outcome rather than a gap in the data.',
      },
      {
        title: 'Asynchronous fallback is part of the design',
        description:
          'Materials, summaries, questions and assignments belong to the class, not to the call, so the workflow degrades to asynchronous instead of collapsing when live media is unavailable.',
      },
      {
        title: 'Recording is opt-in and consent-bound',
        description:
          'Recording requires an explicit setting, recorded consent and a retention window, and the interface distinguishes "not recorded" from "recording failed".',
      },
      {
        title: 'Attendance comes from events, not assertions',
        description:
          'Attendance is derived from observed join and leave events with timestamps, so the record is defensible and cannot be edited silently by a client.',
      },
    ],
    testing: [
      'Enrolment and class membership checks on every session endpoint.',
      'Room-token authorisation: an enrolled learner receives a token, a non-member does not.',
      'Session lifecycle transitions, including rejection of invalid state changes.',
      'Scheduling conflicts and rescheduling behaviour, including time-zone handling.',
      'Posting permissions for chat, polls and moderator actions.',
      'Provider-unavailable behaviour: the live stage reports unavailability and asynchronous workflows continue to function.',
    ],
    limitations: [
      'No end-to-end encryption claim: media confidentiality depends on the configured provider and its transport settings.',
      'Recording availability, retention and access control depend on the provider and on consent configuration.',
      'Low-bandwidth mode can only degrade what the provider exposes; it cannot guarantee audio quality on a failing connection.',
      'Live captions and multi-language support are not implemented.',
      'Notification delivery for rescheduling depends on a configured channel (email or SMS) provided by the deployment.',
    ],
    futureImprovements: [
      'Session transcripts with an opt-in consent model.',
      'A dial-in or USSD attendance path for learners without a browser session.',
      'Bandwidth probing that selects a participation profile automatically.',
      'Shared whiteboard and document annotation for low-bandwidth teaching.',
    ],
  },
  featured: false,
  status: 'completed',
  displayOrder: 2,
  relatedSlugs: ['learnbridge', 'teachcraft', 'learnpulse'],
  demoRequirements:
    'The classroom shell, scheduling, attendance and follow-up work without external services. Live audio and video require a configured WebRTC provider and its keys as server-side environment variables.',
};
