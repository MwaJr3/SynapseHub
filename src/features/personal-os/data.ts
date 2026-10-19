import type {
  BlockerPattern,
  Goal,
  IdentityProfile,
  PersonalSystemData,
  Project,
} from './types';

export const SYSTEM_STORAGE_KEY = 'synapsehub.personal-operating-system.v1';

export const goalDomains = [
  'Academics',
  'Projects',
  'Health',
  'Relationships',
  'Learning',
  'Finance',
  'Meaning',
] as const;

export const today = (): string => new Date().toISOString().slice(0, 10);

function currentMonday(): string {
  const now = new Date();
  const day = now.getDay() || 7;
  now.setDate(now.getDate() - day + 1);
  return now.toISOString().slice(0, 10);
}

export const defaultIdentity: IdentityProfile = {
  visionStatement:
    'Build a life of meaningful competence: use disciplined learning, thoughtful work, and strong relationships to create useful things and expand personal freedom.',
  identityStatement:
    'I am becoming a calm, capable builder who turns insight into useful work, protects recovery, and stays connected to people who matter.',
  coreValues: ['Truth', 'Mastery', 'Responsibility', 'Freedom', 'Meaning'],
  nonNegotiables: [
    'Protect sleep before borrowing tomorrow’s focus.',
    'Keep academic and core obligations visible.',
    'Review the system once each week.',
  ],
  neverAgain: [
    'Calling endless research progress.',
    'Starting a new core project without pausing another commitment.',
  ],
  currentIdentityFocus: 'Reliable execution: finish the small, visible next step.',
  standards: {
    minimum: 'Choose one priority, complete one focused block, and record the next action.',
    standard: 'Complete the planned work, share or test one useful output, and protect recovery.',
    exceptional: 'Improve the system only after the standard has been met consistently.',
  },
};

export const starterGoals: Goal[] = [
  {
    id: 'goal-academic-rhythm',
    domain: 'Academics',
    title: 'Create a dependable academic rhythm',
    outcome: 'Use protected study blocks and close each week with a clear view of the next deadline.',
    proof: 'Four focused academic sessions are recorded each week for four consecutive weeks.',
    tier: 1,
    status: 'active',
  },
  {
    id: 'goal-core-project',
    domain: 'Projects',
    title: 'Ship one meaningful project',
    outcome: 'Move one clearly scoped project from MVP definition to a shareable first version.',
    proof: 'A real person can see, use, or give feedback on the first version.',
    tier: 2,
    status: 'active',
  },
  {
    id: 'goal-energy',
    domain: 'Health',
    title: 'Stabilise energy',
    outcome: 'Treat sleep, movement, and recovery as production infrastructure.',
    proof: 'Log energy for seven days and complete three movement sessions weekly.',
    tier: 1,
    status: 'active',
  },
];

export const starterProjects: Project[] = [
  {
    id: 'project-core',
    name: 'Core project',
    purpose: 'A deliberately small project that creates evidence of capability.',
    audience: 'One real person who could use or critique it.',
    mvp: 'One outcome, one audience, one useful workflow, one shareable link or artefact.',
    currentStage: 'Define v0.1',
    nextMilestone: 'Write the five-line MVP and schedule the first shipping block.',
    deadline: '',
    hoursBudget: 24,
    status: 'core',
    shipped: false,
    stopCondition: 'Pause if it no longer serves a current 90-day objective after a weekly review.',
  },
];

export const starterBlockerPatterns: BlockerPattern[] = [
  {
    id: 'blocker-analysis',
    blocker: 'Analysis paralysis',
    trigger: 'An ambiguous project with several plausible directions.',
    earlyWarningSigns: 'More tabs, more notes, repeated planning, no visible action.',
    defaultBehaviour: 'Expand research instead of choosing a testable next step.',
    consequence: 'The project stays private and uncertainty grows.',
    intervention: 'Use the 3-minute Se Activation Timer and take one physical, irreversible action.',
    recoveryAction: 'Write the next action in one sentence, then do it before reopening research.',
  },
  {
    id: 'blocker-withdrawal',
    blocker: 'Useful-contact avoidance',
    trigger: 'A task requires asking for critique, help, or a follow-up.',
    earlyWarningSigns: 'Drafting a message repeatedly or deciding to wait until the work is perfect.',
    defaultBehaviour: 'Work alone longer than the task requires.',
    consequence: 'Feedback arrives late and relationships never compound.',
    intervention: 'Use a bounded ask: define the question, the person, and a 15-minute scope.',
    recoveryAction: 'Send one concise message or arrange one short conversation.',
  },
];

export function createStarterSystem(): PersonalSystemData {
  return {
    version: 1,
    cycleStart: currentMonday(),
    identity: structuredClone(defaultIdentity),
    goals: structuredClone(starterGoals),
    projects: structuredClone(starterProjects),
    decisions: [],
    energyLogs: [],
    blockerPatterns: structuredClone(starterBlockerPatterns),
    failures: [],
    weeklyReviews: [],
    updatedAt: new Date().toISOString(),
  };
}
