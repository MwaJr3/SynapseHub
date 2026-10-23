import { useCallback, useEffect, useState } from 'react';
import {
  createStarterSystem,
  SYSTEM_CORRUPT_BACKUP_PREFIX,
  SYSTEM_STORAGE_KEY,
} from './data';
import type {
  ActionItem,
  AuditEvent,
  CycleArchive,
  CycleRetrospective,
  EnergyLog,
  Goal,
  OverallSystemSignal,
  PersonalSystemData,
  Project,
  SystemHealthItem,
  SystemSignal,
  WeeklyPlan,
} from './types';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const CYCLE_LENGTH_DAYS = 84;

type LegacyRecord = Record<string, unknown>;
type V2Data = Omit<PersonalSystemData, 'version' | 'scheduleBlocks' | 'history'> & { version: 2 };

interface LoadResult {
  data: PersonalSystemData;
  persistenceIssue: string | null;
  recoveryPayload: string | null;
}

const isRecord = (value: unknown): value is LegacyRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const asNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

function normaliseGoal(goal: unknown): Goal {
  const source = isRecord(goal) ? goal : {};
  return {
    id: asString(source.id),
    domain: asString(source.domain) as Goal['domain'],
    title: asString(source.title),
    outcome: asString(source.outcome),
    proof: asString(source.proof),
    tier: source.tier === 1 || source.tier === 2 || source.tier === 3 ? source.tier : 3,
    status:
      source.status === 'complete' || source.status === 'paused' ? source.status : 'active',
    parentGoalId: asString(source.parentGoalId),
    baseline: asString(source.baseline),
    target: asString(source.target),
    measurementMethod: asString(source.measurementMethod),
    startDate: asString(source.startDate),
    deadline: asString(source.deadline),
    definitionOfDone: asString(source.definitionOfDone),
    reviewDate: asString(source.reviewDate),
  };
}

function normaliseProject(project: unknown): Project {
  const source = isRecord(project) ? project : {};
  const status = source.status;
  return {
    id: asString(source.id),
    name: asString(source.name),
    purpose: asString(source.purpose),
    audience: asString(source.audience),
    mvp: asString(source.mvp),
    currentStage: asString(source.currentStage),
    nextMilestone: asString(source.nextMilestone),
    nextAction: asString(source.nextAction),
    deadline: asString(source.deadline),
    hoursBudget: asNumber(source.hoursBudget),
    actualHours: asNumber(source.actualHours),
    status:
      status === 'core' || status === 'support' || status === 'experiment' || status === 'parked'
        ? status
        : 'experiment',
    shipped: source.shipped === true,
    stopCondition: asString(source.stopCondition),
    definitionOfDone: asString(source.definitionOfDone),
    excludedFromV1: asString(source.excludedFromV1),
    repositoryUrl: asString(source.repositoryUrl),
    deploymentUrl: asString(source.deploymentUrl),
    evidence: asString(source.evidence),
  };
}

/**
 * Version 1 was the first browser-only release. Version 2 adds cycle archives,
 * planning records, meaning entries, and growth modules. The migration keeps
 * every v1 field and adds empty, explicit defaults for new properties.
 */
export function migrateV1ToV2(value: unknown): V2Data | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.identity)) return null;
  const { scheduleBlocks: _scheduleBlocks, history: _history, ...starter } = createStarterSystem();
  const identity = value.identity;
  const standards = isRecord(identity.standards) ? identity.standards : {};
  const cycleStart = asString(value.cycleStart) || starter.cycleStart;

  return {
    ...starter,
    version: 2,
    cycleStart,
    cycleName: asString(value.cycleName) || '90-day cycle',
    cycleTheme: asString(value.cycleTheme),
    identity: {
      visionStatement: asString(identity.visionStatement),
      identityStatement: asString(identity.identityStatement),
      missionStatement: asString(identity.missionStatement),
      coreValues: asArray<string>(identity.coreValues),
      nonNegotiables: asArray<string>(identity.nonNegotiables),
      neverAgain: asArray<string>(identity.neverAgain),
      desiredTraits: asArray<string>(identity.desiredTraits),
      currentIdentityFocus: asString(identity.currentIdentityFocus),
      standards: {
        minimum: asString(standards.minimum),
        standard: asString(standards.standard),
        exceptional: asString(standards.exceptional),
      },
    },
    goals: asArray(value.goals).map(normaliseGoal),
    projects: asArray(value.projects).map(normaliseProject),
    decisions: asArray(value.decisions),
    energyLogs: asArray(value.energyLogs).map((item) => {
      const log = isRecord(item) ? item : {};
      return {
        id: asString(log.id),
        date: asString(log.date),
        sleepQuality: asNumber(log.sleepQuality),
        physicalEnergy: asNumber(log.physicalEnergy),
        cognitiveEnergy: asNumber(log.cognitiveEnergy),
        emotionalLoad: asNumber(log.emotionalLoad),
        recoveryQuality: asNumber(log.recoveryQuality),
        stress: asNumber(log.stress),
        primaryConstraint: asString(log.primaryConstraint),
        priority: asString(log.priority),
        notes: asString(log.notes),
      };
    }),
    blockerPatterns: asArray(value.blockerPatterns),
    failures: asArray(value.failures).map((item) => {
      const failure = isRecord(item) ? item : {};
      return {
        id: asString(failure.id),
        date: asString(failure.date),
        domain: asString(failure.domain) as Goal['domain'],
        intendedOutcome: asString(failure.intendedOutcome),
        actualOutcome: asString(failure.actualOutcome),
        systemicCause: asString(failure.systemicCause),
        lesson: asString(failure.lesson),
        systemChange: asString(failure.systemChange),
        followUpDate: asString(failure.followUpDate),
      };
    }),
    weeklyReviews: asArray(value.weeklyReviews).map((item) => {
      const review = isRecord(item) ? item : {};
      return {
        id: asString(review.id),
        cycleStart: asString(review.cycleStart) || cycleStart,
        week: asNumber(review.week),
        createdAt: asString(review.createdAt),
        moved: asString(review.moved),
        friction: asString(review.friction),
        adjustment: asString(review.adjustment),
        meaningAnchor: asString(review.meaningAnchor),
        relationshipAction: asString(review.relationshipAction),
        calibrationQuestion: asString(review.calibrationQuestion),
      };
    }),
    updatedAt: asString(value.updatedAt) || new Date().toISOString(),
  };
}

/** Validates the top-level format before user data is restored into the app. */
export function isPersonalSystemData(value: unknown): value is PersonalSystemData {
  if (!isRecord(value) || value.version !== 3 || !isRecord(value.identity)) return false;
  const requiredArrays = [
    'goals', 'projects', 'decisions', 'energyLogs', 'actionItems', 'scheduleBlocks', 'weeklyPlans',
    'meaningEntries', 'blockerPatterns', 'blockerLogs', 'failures', 'weeklyReviews',
    'doctrines', 'learningPaths', 'relationships', 'financialEntries', 'cycleArchives', 'history',
  ];
  return (
    typeof value.cycleStart === 'string' &&
    typeof value.cycleName === 'string' &&
    requiredArrays.every((key) => Array.isArray(value[key]))
  );
}

/** Adds scheduling and audit history without modifying existing v2 records. */
export function migrateV2ToV3(value: unknown): PersonalSystemData | null {
  if (!isRecord(value) || value.version !== 2 || !isRecord(value.identity)) return null;
  const requiredV2Arrays = [
    'goals', 'projects', 'decisions', 'energyLogs', 'actionItems', 'weeklyPlans',
    'meaningEntries', 'blockerPatterns', 'blockerLogs', 'failures', 'weeklyReviews',
    'doctrines', 'learningPaths', 'relationships', 'financialEntries', 'cycleArchives',
  ];
  if (!requiredV2Arrays.every((key) => Array.isArray(value[key]))) return null;

  const source = value as unknown as V2Data;
  return {
    ...source,
    version: 3,
    scheduleBlocks: [],
    history: [],
  };
}

/** Accepts the current archive format and safely upgrades previous formats. */
export function hydratePersonalSystem(value: unknown): PersonalSystemData | null {
  if (isPersonalSystemData(value)) return value;
  const fromV2 = migrateV2ToV3(value);
  if (fromV2) return fromV2;
  const fromV1 = migrateV1ToV2(value);
  return fromV1 ? migrateV2ToV3(fromV1) : null;
}

function preserveCorruptPayload(raw: string): void {
  try {
    window.localStorage.setItem(`${SYSTEM_CORRUPT_BACKUP_PREFIX}.${Date.now()}`, raw);
  } catch {
    // Storage may be unavailable; never overwrite the original payload in that case.
  }
}

export function loadPersonalSystemResult(): LoadResult {
  if (typeof window === 'undefined') {
    return { data: createStarterSystem(), persistenceIssue: null, recoveryPayload: null };
  }

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(SYSTEM_STORAGE_KEY);
    if (!raw) return { data: createStarterSystem(), persistenceIssue: null, recoveryPayload: null };
    const hydrated = hydratePersonalSystem(JSON.parse(raw) as unknown);
    if (hydrated) return { data: hydrated, persistenceIssue: null, recoveryPayload: null };
    preserveCorruptPayload(raw);
  } catch {
    if (raw) preserveCorruptPayload(raw);
  }

  return {
    data: createStarterSystem(),
    persistenceIssue:
      'Saved Personal OS data could not be validated. The original browser payload was preserved under a separate recovery key and will not be overwritten unless you explicitly reset or restore the workspace.',
    recoveryPayload: raw,
  };
}

/** Backwards-compatible data loader for code that only needs the restored value. */
export function loadPersonalSystem(): PersonalSystemData {
  return loadPersonalSystemResult().data;
}

export function currentCycleWeek(cycleStart: string, referenceDate = new Date()): number {
  const start = new Date(`${cycleStart}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 1;
  const elapsed = Math.floor((referenceDate.getTime() - start.getTime()) / MS_PER_WEEK);
  return Math.min(12, Math.max(1, elapsed + 1));
}

export function cycleEndDate(cycleStart: string): string {
  const start = new Date(`${cycleStart}T00:00:00`);
  if (Number.isNaN(start.getTime())) return '';
  start.setUTCDate(start.getUTCDate() + CYCLE_LENGTH_DAYS - 1);
  return start.toISOString().slice(0, 10);
}

export function cycleProgress(cycleStart: string, referenceDate = new Date()): number {
  const start = new Date(`${cycleStart}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 0;
  const elapsedDays = Math.floor((referenceDate.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.min(100, Math.max(0, Math.round(((elapsedDays + 1) / CYCLE_LENGTH_DAYS) * 100)));
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function energyScore(logs: EnergyLog[]): number | null {
  const recent = [...logs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
    .map((log) => (
      log.sleepQuality + log.physicalEnergy + log.cognitiveEnergy + (6 - log.emotionalLoad)
    ) / 4);
  return average(recent);
}

function signalFromEnergy(score: number | null): SystemSignal {
  if (score === null) return 'unknown';
  if (score < 2.5) return 'intervene';
  if (score < 3.5) return 'attention';
  return 'stable';
}

export function currentWeeklyPlan(data: PersonalSystemData, referenceDate = new Date()): WeeklyPlan | undefined {
  const week = currentCycleWeek(data.cycleStart, referenceDate);
  return data.weeklyPlans.find((plan) => plan.cycleStart === data.cycleStart && plan.week === week);
}

export function weeklyPlannedHours(data: PersonalSystemData, referenceDate = new Date()): number {
  const week = currentCycleWeek(data.cycleStart, referenceDate);
  return data.actionItems
    .filter((action) => action.cycleStart === data.cycleStart && action.week === week && action.status !== 'skipped')
    .reduce((total, action) => total + action.estimateHours, 0);
}

export function flexibleWeeklyHours(plan: WeeklyPlan | undefined): number | null {
  if (!plan) return null;
  return Math.max(0, plan.availableHours - plan.fixedCommitmentHours - plan.recoveryHours);
}

export function todayActions(data: PersonalSystemData, referenceDate = new Date()): ActionItem[] {
  const date = referenceDate.toISOString().slice(0, 10);
  return data.actionItems
    .filter((action) => action.scheduledFor === date && action.status === 'planned')
    .sort((a, b) => a.tier - b.tier || a.cognitiveDemand.localeCompare(b.cognitiveDemand));
}

export function systemHealth(data: PersonalSystemData, referenceDate = new Date()): SystemHealthItem[] {
  const week = currentCycleWeek(data.cycleStart, referenceDate);
  const todayString = referenceDate.toISOString().slice(0, 10);
  const unmadeDecisions = data.decisions.filter(
    (decision) => !decision.chosenOption && decision.deadline && decision.deadline < todayString,
  );
  const activeGoals = data.goals.filter((goal) => goal.status === 'active');
  const hasCoreProject = data.projects.some((project) => project.status === 'core');
  const reviewMatchesCurrentWeek = data.weeklyReviews.some(
    (review) => review.cycleStart === data.cycleStart && review.week === week,
  );
  const currentPlan = currentWeeklyPlan(data, referenceDate);
  const capacity = flexibleWeeklyHours(currentPlan);
  const plannedHours = weeklyPlannedHours(data, referenceDate);
  const unresolvedBlockers = data.blockerLogs.filter((blocker) => !blocker.resolved);
  const energy = energyScore(data.energyLogs);
  const hasPurpose = Boolean(data.identity.visionStatement.trim() || data.identity.currentIdentityFocus.trim());

  return [
    {
      id: 'energy',
      label: 'Energy',
      detail:
        energy === null
          ? 'No recent check-in. Log today’s capacity before planning heavy work.'
          : `Recent capacity is ${energy.toFixed(1)} / 5. Match work to the energy you actually have.`,
      signal: signalFromEnergy(energy),
    },
    {
      id: 'direction',
      label: 'Direction',
      detail: activeGoals.length
        ? `${activeGoals.length} active goal${activeGoals.length === 1 ? '' : 's'} are visible across the cycle.`
        : 'No active goals. Choose a small, concrete outcome before adding tasks.',
      signal: activeGoals.length ? 'stable' : 'unknown',
    },
    {
      id: 'execution',
      label: 'Weekly capacity',
      detail:
        capacity === null
          ? 'No weekly capacity has been set. Add available, fixed, and recovery hours before filling the week.'
          : plannedHours > capacity
            ? `${plannedHours.toFixed(1)} planned hours exceed ${capacity.toFixed(1)} flexible hours.`
            : `${plannedHours.toFixed(1)} of ${capacity.toFixed(1)} flexible hours have been deliberately allocated.`,
      signal: capacity === null ? 'unknown' : plannedHours > capacity ? 'intervene' : 'stable',
    },
    {
      id: 'project',
      label: 'Project',
      detail: hasCoreProject
        ? 'A core project is defined. Protect one shipping block this week.'
        : 'No core project is selected. Keep experiments parked until one project is defined.',
      signal: hasCoreProject ? 'stable' : 'attention',
    },
    {
      id: 'blockers',
      label: 'Blockers',
      detail: unresolvedBlockers.length
        ? `${unresolvedBlockers.length} recorded blocker${unresolvedBlockers.length === 1 ? '' : 's'} still need a result or recovery action.`
        : 'No unresolved blocker records.',
      signal: unresolvedBlockers.length ? 'attention' : 'stable',
    },
    {
      id: 'decisions',
      label: 'Decisions',
      detail: unmadeDecisions.length
        ? `${unmadeDecisions.length} decision${unmadeDecisions.length === 1 ? '' : 's'} passed its deadline without a choice.`
        : 'No overdue unresolved decisions.',
      signal: unmadeDecisions.length ? 'intervene' : 'stable',
    },
    {
      id: 'purpose',
      label: 'Purpose',
      detail: hasPurpose
        ? 'Vision or identity focus is available to ground planning and reflection.'
        : 'Add a short vision or current identity focus; it can be revised later.',
      signal: hasPurpose ? 'stable' : 'unknown',
    },
    {
      id: 'review',
      label: 'Review',
      detail: reviewMatchesCurrentWeek
        ? 'This week has a reflection and adjustment recorded.'
        : 'Complete the guided review before the week closes.',
      signal: reviewMatchesCurrentWeek ? 'stable' : 'attention',
    },
  ];
}

export function computeOverallSignal(data: PersonalSystemData, referenceDate = new Date()): OverallSystemSignal {
  const health = systemHealth(data, referenceDate);
  if (
    !data.identity.visionStatement.trim() &&
    data.goals.length === 0 &&
    data.actionItems.length === 0 &&
    data.projects.length === 0
  ) {
    return {
      label: 'No active plan',
      signal: 'unknown',
      detail: 'Start with a short vision and one concrete 90-day outcome. The system will stay intentionally quiet until it has evidence to assess.',
    };
  }
  const intervention = health.find((item) => item.signal === 'intervene');
  if (intervention) {
    return { label: 'Intervention needed', signal: 'intervene', detail: `${intervention.label}: ${intervention.detail}` };
  }
  const attention = health.find((item) => item.signal === 'attention');
  if (attention) {
    return { label: 'Attention needed', signal: 'attention', detail: `${attention.label}: ${attention.detail}` };
  }
  const unknown = health.find((item) => item.signal === 'unknown');
  if (unknown) {
    return { label: 'Attention needed', signal: 'unknown', detail: `${unknown.label}: ${unknown.detail}` };
  }
  return {
    label: 'Stable',
    signal: 'stable',
    detail: 'The recorded foundations are within the limits you set. Continue with the next visible action, not more system design.',
  };
}

export function createCycleArchive(
  data: PersonalSystemData,
  retrospective: CycleRetrospective,
  id: string,
  archivedAt = new Date().toISOString(),
): CycleArchive {
  return {
    id,
    name: data.cycleName,
    theme: data.cycleTheme,
    cycleStart: data.cycleStart,
    cycleEnd: cycleEndDate(data.cycleStart),
    archivedAt,
    retrospective,
    goals: structuredClone(data.goals),
    projects: structuredClone(data.projects),
    actions: structuredClone(data.actionItems.filter((item) => item.cycleStart === data.cycleStart)),
    reviews: structuredClone(data.weeklyReviews.filter((item) => item.cycleStart === data.cycleStart)),
    meanings: structuredClone(data.meaningEntries),
    blockers: structuredClone(data.blockerLogs),
    energy: structuredClone(data.energyLogs),
  };
}

const AUDITED_COLLECTIONS = [
  'goals', 'projects', 'decisions', 'energyLogs', 'actionItems', 'scheduleBlocks',
  'weeklyPlans', 'meaningEntries', 'blockerPatterns', 'blockerLogs', 'failures',
  'weeklyReviews', 'doctrines', 'learningPaths', 'relationships', 'financialEntries',
  'cycleArchives',
] as const;

function recordLabel(collection: string, record: unknown): string {
  if (!isRecord(record)) return collection;
  return asString(record.title) || asString(record.name) || asString(record.skill)
    || asString(record.displayName) || asString(record.blocker) || collection;
}

function createAuditEvents(
  previous: PersonalSystemData,
  next: PersonalSystemData,
  restored = false,
): AuditEvent[] {
  const at = new Date().toISOString();
  const events: AuditEvent[] = [];
  for (const collection of AUDITED_COLLECTIONS) {
    const before = previous[collection] as Array<{ id: string }>;
    const after = next[collection] as Array<{ id: string }>;
    const beforeById = new Map(before.map((record) => [record.id, record]));
    const afterById = new Map(after.map((record) => [record.id, record]));
    for (const [id, record] of afterById) {
      const old = beforeById.get(id);
      if (!old || JSON.stringify(old) !== JSON.stringify(record)) {
        events.push({
          id: `history-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
          at,
          collection,
          recordId: id,
          action: restored ? 'restored' : old ? 'updated' : 'created',
          label: recordLabel(collection, record),
          before: old ? structuredClone(old) : null,
          after: structuredClone(record),
        });
      }
    }
    for (const [id, record] of beforeById) {
      if (!afterById.has(id)) {
        events.push({
          id: `history-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
          at,
          collection,
          recordId: id,
          action: restored ? 'restored' : 'deleted',
          label: recordLabel(collection, record),
          before: structuredClone(record),
          after: null,
        });
      }
    }
  }
  if (JSON.stringify(previous.identity) !== JSON.stringify(next.identity)) {
    events.push({
      id: `history-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
      at,
      collection: 'identity',
      recordId: 'identity',
      action: restored ? 'restored' : 'updated',
      label: 'Identity and values',
      before: structuredClone(previous.identity),
      after: structuredClone(next.identity),
    });
  }
  return events;
}

export function restoreAuditEvent(data: PersonalSystemData, event: AuditEvent): PersonalSystemData {
  if (event.collection === 'identity' && isRecord(event.before)) {
    return { ...data, identity: structuredClone(event.before) as unknown as PersonalSystemData['identity'] };
  }
  if (!AUDITED_COLLECTIONS.includes(event.collection as (typeof AUDITED_COLLECTIONS)[number])) {
    return data;
  }
  const collection = event.collection as (typeof AUDITED_COLLECTIONS)[number];
  const records = data[collection] as Array<{ id: string }>;
  const withoutCurrent = records.filter((record) => record.id !== event.recordId);
  const restored = event.before && isRecord(event.before)
    ? [structuredClone(event.before) as { id: string }, ...withoutCurrent]
    : withoutCurrent;
  return { ...data, [collection]: restored } as PersonalSystemData;
}

export function usePersonalSystem() {
  const [initial] = useState<LoadResult>(loadPersonalSystemResult);
  const [data, setData] = useState<PersonalSystemData>(initial.data);
  const [persistenceIssue, setPersistenceIssue] = useState<string | null>(initial.persistenceIssue);
  const [recoveryPayload, setRecoveryPayload] = useState<string | null>(initial.recoveryPayload);

  useEffect(() => {
    if (persistenceIssue) return;
    let cancelled = false;
    const save = () => {
      if (cancelled) return;
      try {
        window.localStorage.setItem(SYSTEM_STORAGE_KEY, JSON.stringify(data));
      } catch {
        if (!cancelled) setPersistenceIssue('Changes could not be saved in this browser. Export the workspace before closing this page.');
      }
    };

    // Web Locks coordinates writes between open Personal OS tabs in supporting
    // browsers. It is not an operating-system file lock or multi-device sync.
    const lockManager = navigator.locks;
    if (lockManager) {
      void lockManager.request('synapsehub.personal-os.save', { mode: 'exclusive' }, save).catch(() => save());
    } else {
      save();
    }
    return () => { cancelled = true; };
  }, [data, persistenceIssue]);

  const update = useCallback((
    updater: (previous: PersonalSystemData) => PersonalSystemData,
    options?: { restored?: boolean },
  ) => {
    setData((previous) => {
      const changed = updater(previous);
      const events = createAuditEvents(previous, changed, options?.restored);
      return {
        ...changed,
        history: [...events, ...previous.history].slice(0, 300),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const replace = useCallback((next: PersonalSystemData) => {
    setPersistenceIssue(null);
    setRecoveryPayload(null);
    setData({ ...next, updatedAt: new Date().toISOString() });
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(SYSTEM_STORAGE_KEY);
    } catch {
      // The new in-memory starter workspace is still usable for the session.
    }
    setPersistenceIssue(null);
    setRecoveryPayload(null);
    setData(createStarterSystem());
  }, []);

  return { data, update, replace, reset, persistenceIssue, recoveryPayload };
}
