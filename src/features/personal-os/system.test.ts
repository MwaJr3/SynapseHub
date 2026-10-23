import { describe, expect, it } from 'vitest';
import { createStarterSystem, SYSTEM_CORRUPT_BACKUP_PREFIX, SYSTEM_STORAGE_KEY } from './data';
import {
  computeOverallSignal,
  createCycleArchive,
  currentCycleWeek,
  energyScore,
  flexibleWeeklyHours,
  hydratePersonalSystem,
  loadPersonalSystemResult,
  systemHealth,
  weeklyPlannedHours,
} from './system';

describe('personal operating system calculations', () => {
  it('maps a 12-week cycle to a 1–12 week range', () => {
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
          recoveryQuality: 3,
          stress: 3,
          primaryConstraint: '',
          priority: '',
          notes: '',
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
        strongestCounterargument: '',
        expectedOutcome: '',
        actualOutcome: '',
        lesson: '',
        reviewDate: '',
        createdAt: '2026-10-19T10:00:00.000Z',
      },
    ];

    const health = systemHealth(data, new Date('2026-10-26T12:00:00Z'));
    const decisions = health.find((item) => item.id === 'decisions');

    expect(decisions).toMatchObject({ signal: 'intervene' });
  });

  it('does not generate a positive signal before a vision or goal exists', () => {
    const signal = computeOverallSignal(createStarterSystem(), new Date('2026-10-19T12:00:00Z'));

    expect(signal).toMatchObject({ label: 'No active plan', signal: 'unknown' });
  });

  it('compares action estimates against explicitly declared flexible capacity', () => {
    const data = createStarterSystem();
    data.cycleStart = '2026-10-19';
    data.weeklyPlans = [{
      id: 'week-1', cycleStart: data.cycleStart, week: 1, availableHours: 30,
      fixedCommitmentHours: 12, recoveryHours: 6, relationshipAction: '', reflectionPractice: '', explicitTradeoff: '', createdAt: '',
    }];
    data.actionItems = [{
      id: 'action-1', cycleStart: data.cycleStart, week: 1, title: 'Overfill the week', domain: 'Projects', tier: 2,
      goalId: '', projectId: '', scheduledFor: '2026-10-19', estimateHours: 13, cognitiveDemand: 'focused', nextAction: '', status: 'planned', completedAt: '',
    }];

    expect(flexibleWeeklyHours(data.weeklyPlans[0]!)).toBe(12);
    expect(weeklyPlannedHours(data, new Date('2026-10-19T12:00:00Z'))).toBe(13);
    expect(computeOverallSignal(data, new Date('2026-10-19T12:00:00Z'))).toMatchObject({
      label: 'Intervention needed',
      signal: 'intervene',
    });
  });

  it('migrates a version-one archive without throwing away existing records', () => {
    const v1 = {
      version: 1,
      cycleStart: '2026-10-19',
      identity: {
        visionStatement: 'Build useful things.', identityStatement: 'I ship.', coreValues: ['Mastery'],
        nonNegotiables: [], neverAgain: [], currentIdentityFocus: 'Finish', standards: { minimum: '', standard: '', exceptional: '' },
      },
      goals: [{ id: 'goal', domain: 'Projects', title: 'Ship', outcome: '', proof: '', tier: 2, status: 'active' }],
      projects: [], decisions: [], energyLogs: [], blockerPatterns: [], failures: [], weeklyReviews: [], updatedAt: '2026-10-19T00:00:00.000Z',
    };

    const migrated = hydratePersonalSystem(v1);

    expect(migrated).toMatchObject({ version: 3, cycleStart: '2026-10-19' });
    expect(migrated?.identity.visionStatement).toBe('Build useful things.');
    expect(migrated?.goals[0]).toMatchObject({ title: 'Ship', tier: 2, definitionOfDone: '' });
    expect(migrated?.actionItems).toEqual([]);
  });

  it('upgrades a valid version-two backup with empty schedule and history collections', () => {
    const current = createStarterSystem();
    const { scheduleBlocks: _scheduleBlocks, history: _history, ...v2 } = current;
    const migrated = hydratePersonalSystem({ ...v2, version: 2 });

    expect(migrated).toMatchObject({ version: 3, scheduleBlocks: [], history: [] });
  });

  it('preserves an invalid stored payload instead of silently overwriting it', () => {
    window.localStorage.setItem(SYSTEM_STORAGE_KEY, '{not-json');

    const restored = loadPersonalSystemResult();
    const recoveryKeys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
      .filter((key): key is string => Boolean(key?.startsWith(SYSTEM_CORRUPT_BACKUP_PREFIX)));

    expect(restored.persistenceIssue).toMatch(/could not be validated/i);
    expect(restored.recoveryPayload).toBe('{not-json');
    expect(recoveryKeys).toHaveLength(1);
    expect(window.localStorage.getItem(recoveryKeys[0]!)).toBe('{not-json');

    window.localStorage.removeItem(SYSTEM_STORAGE_KEY);
    recoveryKeys.forEach((key) => window.localStorage.removeItem(key));
  });

  it('creates an independent archival snapshot before a future cycle can change current records', () => {
    const data = createStarterSystem();
    data.goals = [{
      id: 'goal', domain: 'Projects', title: 'Ship', outcome: '', proof: '', tier: 2, status: 'active', parentGoalId: '', baseline: '', target: '', measurementMethod: '', startDate: '', deadline: '', definitionOfDone: '', reviewDate: '',
    }];

    const archive = createCycleArchive(data, {
      intended: 'Ship', achieved: 'A first version', leverage: '', recurringBlockers: '', stop: '', nextEmphasis: '',
    }, 'archive-1', '2026-12-31T12:00:00.000Z');
    data.goals[0]!.title = 'Changed later';

    expect(archive.goals[0]?.title).toBe('Ship');
    expect(archive.retrospective.achieved).toBe('A first version');
  });
});
