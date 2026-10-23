import { describe, expect, it } from 'vitest';
import { monthlyTrend, quarterlyTrend } from './analytics';
import { scheduleToIcs } from './calendar';
import { createStarterSystem } from './data';
import { createScopedExport } from './exports';

describe('Personal OS sharing, calendar, and evidence helpers', () => {
  it('keeps a scoped planning export distinct from the restorable workspace', () => {
    const data = createStarterSystem();
    data.identity.currentIdentityFocus = 'Private name';
    data.identity.visionStatement = 'Private direction';
    const shared = createScopedExport(data, 'planning', true);

    expect(shared).toMatchObject({ format: 'personal-os-export-v1', scope: 'planning', redacted: true });
    expect(JSON.stringify(shared)).not.toContain('Private name');
    expect(JSON.stringify(shared)).not.toContain('Private direction');
    expect(shared.payload).not.toHaveProperty('identity');
  });

  it('writes local schedule blocks as a standard ICS calendar payload', () => {
    const content = scheduleToIcs([{ id: 'block', title: 'Focus, build', date: '2026-10-23', startTime: '09:30', endTime: '11:00', domain: 'Projects', actionId: '', location: '', notes: '' }]);

    expect(content).toContain('BEGIN:VCALENDAR');
    expect(content).toContain('DTSTART:20261023T093000');
    expect(content).toContain('SUMMARY:Focus\\, build');
    expect(content).toContain('END:VCALENDAR');
  });

  it('aggregates recorded observations into monthly and quarterly evidence points', () => {
    const data = createStarterSystem();
    data.actionItems = [
      { id: 'a1', cycleStart: data.cycleStart, week: 1, title: 'Completed', domain: 'Projects', tier: 1, goalId: '', projectId: '', scheduledFor: '2026-10-01', estimateHours: 2, cognitiveDemand: 'focused', nextAction: '', status: 'complete', completedAt: '2026-10-01' },
      { id: 'a2', cycleStart: data.cycleStart, week: 1, title: 'Planned', domain: 'Projects', tier: 1, goalId: '', projectId: '', scheduledFor: '2026-11-01', estimateHours: 3, cognitiveDemand: 'focused', nextAction: '', status: 'planned', completedAt: '' },
    ];
    data.energyLogs = [{ id: 'energy', date: '2026-10-02', sleepQuality: 4, physicalEnergy: 4, cognitiveEnergy: 3, emotionalLoad: 2, recoveryQuality: 3, stress: 3, primaryConstraint: '', priority: '', notes: '' }];

    expect(monthlyTrend(data)).toEqual(expect.arrayContaining([expect.objectContaining({ period: '2026-10', completedActions: 1, plannedHours: 2 })]));
    expect(quarterlyTrend(data)).toEqual(expect.arrayContaining([expect.objectContaining({ period: '2026 Q4', completedActions: 1, plannedHours: 5 })]));
  });
});
