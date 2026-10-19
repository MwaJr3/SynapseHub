import { useCallback, useEffect, useState } from 'react';
import { createStarterSystem, SYSTEM_STORAGE_KEY } from './data';
import type {
  EnergyLog,
  PersonalSystemData,
  SystemHealthItem,
  SystemSignal,
} from './types';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export function isPersonalSystemData(value: unknown): value is PersonalSystemData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PersonalSystemData>;
  return (
    candidate.version === 1 &&
    typeof candidate.cycleStart === 'string' &&
    Array.isArray(candidate.goals) &&
    Array.isArray(candidate.projects) &&
    Array.isArray(candidate.decisions) &&
    Array.isArray(candidate.energyLogs) &&
    Array.isArray(candidate.blockerPatterns) &&
    Array.isArray(candidate.failures) &&
    Array.isArray(candidate.weeklyReviews) &&
    Boolean(candidate.identity)
  );
}

export function loadPersonalSystem(): PersonalSystemData {
  if (typeof window === 'undefined') return createStarterSystem();

  try {
    const raw = window.localStorage.getItem(SYSTEM_STORAGE_KEY);
    if (!raw) return createStarterSystem();
    const parsed: unknown = JSON.parse(raw);
    return isPersonalSystemData(parsed) ? parsed : createStarterSystem();
  } catch {
    return createStarterSystem();
  }
}

export function currentCycleWeek(cycleStart: string, referenceDate = new Date()): number {
  const start = new Date(`${cycleStart}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 1;
  const elapsed = Math.floor((referenceDate.getTime() - start.getTime()) / MS_PER_WEEK);
  return Math.min(12, Math.max(1, elapsed + 1));
}

export function cycleProgress(cycleStart: string, referenceDate = new Date()): number {
  const week = currentCycleWeek(cycleStart, referenceDate);
  return Math.round((week / 12) * 100);
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function energyScore(logs: EnergyLog[]): number | null {
  const recent = [...logs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
    .map((log) => (log.sleepQuality + log.physicalEnergy + log.cognitiveEnergy + (6 - log.emotionalLoad)) / 4);
  return average(recent);
}

function signalFromEnergy(score: number | null): SystemSignal {
  if (score === null) return 'attention';
  if (score < 2.5) return 'intervene';
  if (score < 3.5) return 'attention';
  return 'stable';
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
  const energy = energyScore(data.energyLogs);

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
      signal: activeGoals.length ? 'stable' : 'intervene',
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
      id: 'decisions',
      label: 'Decisions',
      detail: unmadeDecisions.length
        ? `${unmadeDecisions.length} decision${unmadeDecisions.length === 1 ? '' : 's'} passed its deadline without a choice.`
        : 'No overdue unresolved decisions.',
      signal: unmadeDecisions.length ? 'intervene' : 'stable',
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

export function usePersonalSystem() {
  const [data, setData] = useState<PersonalSystemData>(loadPersonalSystem);

  useEffect(() => {
    try {
      window.localStorage.setItem(SYSTEM_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // The app remains usable even in private or storage-restricted browser contexts.
    }
  }, [data]);

  const update = useCallback((updater: (previous: PersonalSystemData) => PersonalSystemData) => {
    setData((previous) => ({
      ...updater(previous),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const replace = useCallback((next: PersonalSystemData) => {
    setData({ ...next, updatedAt: new Date().toISOString() });
  }, []);

  const reset = useCallback(() => setData(createStarterSystem()), []);

  return { data, update, replace, reset };
}
