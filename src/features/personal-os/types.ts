export type GoalDomain =
  | 'Academics'
  | 'Projects'
  | 'Health'
  | 'Relationships'
  | 'Learning'
  | 'Finance'
  | 'Meaning';

export type PriorityTier = 1 | 2 | 3;
export type ProjectStatus = 'core' | 'support' | 'experiment' | 'parked';
export type DecisionType = 'A' | 'B' | 'C';
export type SystemSignal = 'stable' | 'attention' | 'intervene';

export interface IdentityProfile {
  visionStatement: string;
  identityStatement: string;
  coreValues: string[];
  nonNegotiables: string[];
  neverAgain: string[];
  currentIdentityFocus: string;
  standards: {
    minimum: string;
    standard: string;
    exceptional: string;
  };
}

export interface Goal {
  id: string;
  domain: GoalDomain;
  title: string;
  outcome: string;
  proof: string;
  tier: PriorityTier;
  status: 'active' | 'complete' | 'paused';
}

export interface Project {
  id: string;
  name: string;
  purpose: string;
  audience: string;
  mvp: string;
  currentStage: string;
  nextMilestone: string;
  deadline: string;
  hoursBudget: number;
  status: ProjectStatus;
  shipped: boolean;
  stopCondition: string;
}

export interface Decision {
  id: string;
  title: string;
  context: string;
  options: string[];
  type: DecisionType;
  deadline: string;
  chosenOption: string;
  confidence: number | null;
  expectedUpside: string;
  majorRisk: string;
  opportunityCost: string;
  reviewDate: string;
  createdAt: string;
}

export interface EnergyLog {
  id: string;
  date: string;
  sleepQuality: number;
  physicalEnergy: number;
  cognitiveEnergy: number;
  emotionalLoad: number;
  primaryConstraint: string;
  priority: string;
}

export interface BlockerPattern {
  id: string;
  blocker: string;
  trigger: string;
  earlyWarningSigns: string;
  defaultBehaviour: string;
  consequence: string;
  intervention: string;
  recoveryAction: string;
}

export interface FailureLog {
  id: string;
  date: string;
  domain: GoalDomain;
  intendedOutcome: string;
  actualOutcome: string;
  systemicCause: string;
  lesson: string;
  systemChange: string;
}

export interface WeeklyReview {
  id: string;
  /** Cycle start that makes a week-one review unambiguous across restarts. */
  cycleStart: string;
  week: number;
  createdAt: string;
  moved: string;
  friction: string;
  adjustment: string;
  meaningAnchor: string;
  relationshipAction: string;
  calibrationQuestion: string;
}

export interface PersonalSystemData {
  version: 1;
  cycleStart: string;
  identity: IdentityProfile;
  goals: Goal[];
  projects: Project[];
  decisions: Decision[];
  energyLogs: EnergyLog[];
  blockerPatterns: BlockerPattern[];
  failures: FailureLog[];
  weeklyReviews: WeeklyReview[];
  updatedAt: string;
}

export interface SystemHealthItem {
  id: string;
  label: string;
  detail: string;
  signal: SystemSignal;
}
