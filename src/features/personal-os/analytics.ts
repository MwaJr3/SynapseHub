import type { PersonalSystemData } from './types';

export interface TrendPoint {
  period: string;
  completedActions: number;
  plannedHours: number;
  averageEnergy: number | null;
  blockerCount: number;
  blockerIntensity: number | null;
  reviewCount: number;
}

function monthKey(value: string): string {
  return /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : 'Undated';
}

function quarterKey(value: string): string {
  const month = monthKey(value);
  if (month === 'Undated') return month;
  const monthNumber = Number(month.slice(5, 7));
  return `${month.slice(0, 4)} Q${Math.ceil(monthNumber / 3)}`;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function makeTrend(data: PersonalSystemData, keyFor: (date: string) => string): TrendPoint[] {
  const keys = new Set<string>();
  data.actionItems.forEach((item) => keys.add(keyFor(item.scheduledFor)));
  data.energyLogs.forEach((item) => keys.add(keyFor(item.date)));
  data.blockerLogs.forEach((item) => keys.add(keyFor(item.date)));
  data.weeklyReviews.forEach((item) => keys.add(keyFor(item.createdAt)));

  return [...keys].sort().map((period) => {
    const actionItems = data.actionItems.filter((item) => keyFor(item.scheduledFor) === period);
    const energies = data.energyLogs
      .filter((item) => keyFor(item.date) === period)
      .map((item) => (item.sleepQuality + item.physicalEnergy + item.cognitiveEnergy + (6 - item.emotionalLoad)) / 4);
    const blockers = data.blockerLogs.filter((item) => keyFor(item.date) === period);
    return {
      period,
      completedActions: actionItems.filter((item) => item.status === 'complete').length,
      plannedHours: actionItems.filter((item) => item.status !== 'skipped').reduce((sum, item) => sum + item.estimateHours, 0),
      averageEnergy: average(energies),
      blockerCount: blockers.length,
      blockerIntensity: average(blockers.map((item) => item.intensity)),
      reviewCount: data.weeklyReviews.filter((item) => keyFor(item.createdAt) === period).length,
    };
  });
}

export function monthlyTrend(data: PersonalSystemData): TrendPoint[] {
  return makeTrend(data, monthKey);
}

export function quarterlyTrend(data: PersonalSystemData): TrendPoint[] {
  return makeTrend(data, quarterKey);
}

export function analyticsEvidenceNote(points: TrendPoint[]): string {
  const dated = points.filter((point) => point.period !== 'Undated');
  if (!dated.length) return 'No dated records yet. Add actions, energy check-ins, or reviews to create an observation window.';
  if (dated.length < 2) return `Only ${dated.length} period is available. This is a snapshot, not a trend.`;
  return `${dated.length} periods are shown. Patterns are observations only; they do not establish what caused a change.`;
}
