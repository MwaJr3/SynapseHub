import { describe, expect, it } from 'vitest';
import { createStarterSystem } from './data';
import { currentCycleWeek, energyScore, systemHealth } from './system';

describe('personal operating system calculations', () => {
  it('maps a 90-day cycle to a 1–12 week range', () => {
    expect(currentCycleWeek('2026-10-19', new Date('2026-10-19T12:00:00Z'))).toBe(1);
    expect(currentCycleWeek('2026-10-19', new Date('2026-11-09T12:00:00Z'))).toBe(4);
    expect(currentCycleWeek('2026-10-19', new Date('2027-02-20T12:00:00Z'))).toBe(12);
    expect(currentCycleWeek('not-a-date', new Date('2026-10-19T12:00:00Z'))).toBe(1);
  });

  it('calculates capacity from the latest seven energy check-ins', () => {
    expect(energyScore([])).toBeNull();
    expect(
      energyScore([
        {
          id: 'recent',
          date: '2026-10-19',
          sleepQuality: 5,
          physicalEnergy: 4,
          cognitiveEnergy: 3,
          emotionalLoad: 2,
          primaryConstraint: '',
          priority: '',
        },
      ]),
    ).toBe(4);
  });

  it('raises an intervention signal for overdue unresolved decisions', () => {
    const data = createStarterSystem();
    data.cycleStart = '2026-10-19';
    data.decisions = [
      {
        id: 'decision-1',
        title: 'Choose a project direction',
        context: '',
        options: ['A', 'B'],
        type: 'B',
        deadline: '2026-10-20',
        chosenOption: '',
        confidence: null,
        expectedUpside: '',
        majorRisk: '',
        opportunityCost: '',
        reviewDate: '',
        createdAt: '2026-10-19T10:00:00.000Z',
      },
    ];

    const health = systemHealth(data, new Date('2026-10-26T12:00:00Z'));
    const decisions = health.find((item) => item.id === 'decisions');

    expect(decisions).toMatchObject({ signal: 'intervene' });
  });
});
