import type { PersonalSystemData } from './types';

export type ExportScope = 'full' | 'current-cycle' | 'planning' | 'review';

export interface ScopedExport {
  format: 'personal-os-export-v1';
  scope: ExportScope;
  redacted: boolean;
  exportedAt: string;
  payload: unknown;
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(source)) {
    if (['notes', 'reflection', 'visionStatement', 'identityStatement', 'missionStatement', 'displayName', 'mutualValue'].includes(key)) {
      result[key] = '[redacted]';
    } else {
      result[key] = redact(item);
    }
  }
  return result;
}

function currentCyclePayload(data: PersonalSystemData) {
  return {
    version: data.version,
    cycleStart: data.cycleStart,
    cycleName: data.cycleName,
    cycleTheme: data.cycleTheme,
    goals: data.goals,
    projects: data.projects,
    decisions: data.decisions,
    actionItems: data.actionItems.filter((item) => item.cycleStart === data.cycleStart),
    scheduleBlocks: data.scheduleBlocks,
    weeklyPlans: data.weeklyPlans.filter((item) => item.cycleStart === data.cycleStart),
    meaningEntries: data.meaningEntries,
    blockerPatterns: data.blockerPatterns,
    blockerLogs: data.blockerLogs,
    weeklyReviews: data.weeklyReviews.filter((item) => item.cycleStart === data.cycleStart),
    updatedAt: data.updatedAt,
  };
}

/**
 * Builds a shareable view without mutating the local workspace. Scoped exports
 * are intentionally not importable: only a full, validated workspace can
 * replace current data.
 */
export function createScopedExport(
  data: PersonalSystemData,
  scope: ExportScope,
  redacted: boolean,
): ScopedExport {
  let payload: unknown;
  switch (scope) {
    case 'full':
      payload = data;
      break;
    case 'current-cycle':
      payload = currentCyclePayload(data);
      break;
    case 'planning':
      payload = {
        cycleStart: data.cycleStart,
        cycleName: data.cycleName,
        cycleTheme: data.cycleTheme,
        goals: data.goals,
        projects: data.projects,
        actionItems: data.actionItems.filter((item) => item.cycleStart === data.cycleStart),
        scheduleBlocks: data.scheduleBlocks,
        weeklyPlans: data.weeklyPlans.filter((item) => item.cycleStart === data.cycleStart),
      };
      break;
    case 'review':
      payload = {
        cycleStart: data.cycleStart,
        weeklyReviews: data.weeklyReviews.filter((item) => item.cycleStart === data.cycleStart),
        energyLogs: data.energyLogs,
        blockerLogs: data.blockerLogs,
        failures: data.failures,
        meaningEntries: data.meaningEntries,
      };
      break;
  }
  return {
    format: 'personal-os-export-v1',
    scope,
    redacted,
    exportedAt: new Date().toISOString(),
    payload: redacted ? redact(payload) : structuredClone(payload),
  };
}
