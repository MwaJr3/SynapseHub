export type GoalDomain =
  | 'Academics'
  | 'Projects'
  | 'Health'
  | 'Relationships'
  | 'Learning'
  | 'Finance'
  | 'Meaning'
  | 'Personal development'
  | 'Other';

export type PriorityTier = 1 | 2 | 3;
export type ProjectStatus = 'core' | 'support' | 'experiment' | 'parked';
export type DecisionType = 'A' | 'B' | 'C';
export type SystemSignal = 'stable' | 'attention' | 'intervene' | 'unknown';
export type ActionStatus = 'planned' | 'complete' | 'skipped';
export type CognitiveDemand = 'deep' | 'focused' | 'routine' | 'recovery';

export interface IdentityProfile {
  visionStatement: string;
  identityStatement: string;
  missionStatement: string;
  coreValues: string[];
  nonNegotiables: string[];
  neverAgain: string[];
  desiredTraits: string[];
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
  parentGoalId: string;
  baseline: string;
  target: string;
  measurementMethod: string;
  startDate: string;
  deadline: string;
  definitionOfDone: string;
  reviewDate: string;
}

export interface Project {
  id: string;
  name: string;
  purpose: string;
  audience: string;
  mvp: string;
  currentStage: string;
  nextMilestone: string;
  nextAction: string;
  deadline: string;
  hoursBudget: number;
  actualHours: number;
  status: ProjectStatus;
  shipped: boolean;
  stopCondition: string;
  definitionOfDone: string;
  excludedFromV1: string;
  repositoryUrl: string;
  deploymentUrl: string;
  evidence: string;
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
  strongestCounterargument: string;
  expectedOutcome: string;
  actualOutcome: string;
  lesson: string;
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
  recoveryQuality: number;
  stress: number;
  primaryConstraint: string;
  priority: string;
  notes: string;
}

export interface ActionItem {
  id: string;
  cycleStart: string;
  week: number;
  title: string;
  domain: GoalDomain;
  tier: PriorityTier;
  goalId: string;
  projectId: string;
  scheduledFor: string;
  estimateHours: number;
  cognitiveDemand: CognitiveDemand;
  nextAction: string;
  status: ActionStatus;
  completedAt: string;
}

export interface WeeklyPlan {
  id: string;
  cycleStart: string;
  week: number;
  availableHours: number;
  fixedCommitmentHours: number;
  recoveryHours: number;
  relationshipAction: string;
  reflectionPractice: string;
  explicitTradeoff: string;
  createdAt: string;
}

export interface MeaningEntry {
  id: string;
  date: string;
  activity: string;
  goalId: string;
  value: string;
  visionConnection: string;
  expectedContribution: string;
  reflection: string;
}

export interface BlockerPattern {
  id: string;
  blocker: string;
  category: string;
  trigger: string;
  earlyWarningSigns: string;
  defaultBehaviour: string;
  consequence: string;
  intervention: string;
  recoveryAction: string;
}

export interface BlockerLog {
  id: string;
  date: string;
  blockerId: string;
  actionId: string;
  intensity: number;
  trigger: string;
  behaviour: string;
  intervention: string;
  interventionCompleted: boolean;
  result: string;
  resolved: boolean;
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
  followUpDate: string;
}

export interface WeeklyReview {
  id: string;
  /** Cycle start makes a week-one review unambiguous across restarts. */
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

export interface PersonalDoctrine {
  id: string;
  title: string;
  statement: string;
  practicalImplication: string;
  limitation: string;
  relatedValue: string;
  status: 'active' | 'reviewing' | 'archived';
}

export interface LearningPath {
  id: string;
  skill: string;
  currentLevel: string;
  targetCapability: string;
  nextAction: string;
  evidence: string;
  relatedProjectId: string;
  reviewDate: string;
}

export interface RelationshipRecord {
  id: string;
  displayName: string;
  category: string;
  sharedContext: string;
  lastContact: string;
  nextContact: string;
  mutualValue: string;
  notes: string;
}

export interface FinancialEntry {
  id: string;
  date: string;
  kind: 'income' | 'expense' | 'saving';
  amount: number;
  currency: string;
  category: string;
  note: string;
}

export interface CycleRetrospective {
  intended: string;
  achieved: string;
  leverage: string;
  recurringBlockers: string;
  stop: string;
  nextEmphasis: string;
}

export interface CycleArchive {
  id: string;
  name: string;
  theme: string;
  cycleStart: string;
  cycleEnd: string;
  archivedAt: string;
  retrospective: CycleRetrospective;
  goals: Goal[];
  projects: Project[];
  actions: ActionItem[];
  reviews: WeeklyReview[];
  meanings: MeaningEntry[];
  blockers: BlockerLog[];
  energy: EnergyLog[];
}

export interface PersonalSystemData {
  version: 2;
  cycleStart: string;
  cycleName: string;
  cycleTheme: string;
  identity: IdentityProfile;
  goals: Goal[];
  projects: Project[];
  decisions: Decision[];
  energyLogs: EnergyLog[];
  actionItems: ActionItem[];
  weeklyPlans: WeeklyPlan[];
  meaningEntries: MeaningEntry[];
  blockerPatterns: BlockerPattern[];
  blockerLogs: BlockerLog[];
  failures: FailureLog[];
  weeklyReviews: WeeklyReview[];
  doctrines: PersonalDoctrine[];
  learningPaths: LearningPath[];
  relationships: RelationshipRecord[];
  financialEntries: FinancialEntry[];
  cycleArchives: CycleArchive[];
  updatedAt: string;
}

export interface SystemHealthItem {
  id: string;
  label: string;
  detail: string;
  signal: SystemSignal;
}

export interface OverallSystemSignal {
  label: 'No active plan' | 'Stable' | 'Attention needed' | 'Intervention needed';
  signal: SystemSignal;
  detail: string;
}
