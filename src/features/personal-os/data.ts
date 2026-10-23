import type { IdentityProfile, PersonalSystemData } from './types';

export const SYSTEM_STORAGE_KEY = 'synapsehub.personal-operating-system.v1';
export const SYSTEM_CORRUPT_BACKUP_PREFIX = `${SYSTEM_STORAGE_KEY}.corrupt`;

export const goalDomains = [
  'Academics',
  'Projects',
  'Health',
  'Relationships',
  'Learning',
  'Finance',
  'Meaning',
  'Personal development',
  'Other',
] as const;

export const today = (): string => new Date().toISOString().slice(0, 10);

export function currentMonday(reference = new Date()): string {
  const start = new Date(reference);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  return start.toISOString().slice(0, 10);
}

export const defaultIdentity: IdentityProfile = {
  visionStatement: '',
  identityStatement: '',
  missionStatement: '',
  coreValues: [],
  nonNegotiables: [],
  neverAgain: [],
  desiredTraits: [],
  currentIdentityFocus: '',
  standards: {
    minimum: '',
    standard: '',
    exceptional: '',
  },
};

/**
 * A deliberately empty first-run workspace. The application uses instructional
 * empty states instead of inserting pretend goals, projects, or private notes.
 */
export function createStarterSystem(): PersonalSystemData {
  return {
    version: 3,
    cycleStart: currentMonday(),
    cycleName: 'My first 90-day cycle',
    cycleTheme: '',
    identity: structuredClone(defaultIdentity),
    goals: [],
    projects: [],
    decisions: [],
    energyLogs: [],
    actionItems: [],
    scheduleBlocks: [],
    weeklyPlans: [],
    meaningEntries: [],
    blockerPatterns: [],
    blockerLogs: [],
    failures: [],
    weeklyReviews: [],
    doctrines: [],
    learningPaths: [],
    relationships: [],
    financialEntries: [],
    cycleArchives: [],
    history: [],
    updatedAt: new Date().toISOString(),
  };
}
