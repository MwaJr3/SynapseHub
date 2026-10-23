import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { SYSTEM_STORAGE_KEY } from '@/features/personal-os/data';
import { renderWithProviders } from '@/test/render-app';

describe('personal operating system workflow', () => {
  beforeEach(() => {
    window.localStorage.removeItem(SYSTEM_STORAGE_KEY);
  });

  it('starts with an honest empty state instead of synthetic personal records', async () => {
    renderWithProviders(<App />, '/system');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /the system turns self-knowledge into a weekly operating rhythm/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('No active plan')).toBeInTheDocument();
  });

  it('persists a realistic weekly capacity before adding daily actions', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, '/system');
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('tab', { name: /plan & execute/i }));
    await user.type(screen.getByLabelText('Available hours'), '30');
    await user.type(screen.getByLabelText('Fixed commitments'), '12');
    await user.type(screen.getByLabelText('Recovery hours'), '6');
    await user.click(screen.getByRole('button', { name: /save weekly capacity/i }));

    expect(await screen.findByText('Plan fits stated capacity')).toBeInTheDocument();
    expect(window.localStorage.getItem(SYSTEM_STORAGE_KEY)).toContain('weeklyPlans');
  });

  it('stores a local time block without claiming external calendar sync', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, '/system');
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('tab', { name: /schedule/i }));
    expect(screen.getByText(/local schedule, not a live external calendar connection/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Title'), 'Protected implementation time');
    await user.click(screen.getByRole('button', { name: /reserve block/i }));

    expect(await screen.findByText('Protected implementation time')).toBeInTheDocument();
    expect(window.localStorage.getItem(SYSTEM_STORAGE_KEY)).toContain('scheduleBlocks');
  });

  it('archives a completed cycle through the week-twelve review flow', async () => {
    const user = userEvent.setup();
    const current = new Date();
    current.setDate(current.getDate() - 77);
    window.localStorage.setItem(SYSTEM_STORAGE_KEY, JSON.stringify({
      version: 3,
      cycleStart: current.toISOString().slice(0, 10),
      cycleName: 'Finishing cycle',
      cycleTheme: 'Ship',
      identity: { visionStatement: '', identityStatement: '', missionStatement: '', coreValues: [], nonNegotiables: [], neverAgain: [], desiredTraits: [], currentIdentityFocus: '', standards: { minimum: '', standard: '', exceptional: '' } },
      goals: [], projects: [], decisions: [], energyLogs: [], actionItems: [], scheduleBlocks: [], weeklyPlans: [], meaningEntries: [], blockerPatterns: [], blockerLogs: [], failures: [], weeklyReviews: [], doctrines: [], learningPaths: [], relationships: [], financialEntries: [], cycleArchives: [], history: [], updatedAt: current.toISOString(),
    }));
    renderWithProviders(<App />, '/system');
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('tab', { name: /review/i }));
    expect(screen.getByText(/week 12 is active/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText('What did you intend?'), 'Ship a usable release');
    await user.type(screen.getByLabelText('What did you actually achieve?'), 'Released the first version');
    await user.clear(screen.getByLabelText('Next cycle name'));
    await user.type(screen.getByLabelText('Next cycle name'), 'Refine the release');
    await user.click(screen.getByRole('button', { name: /archive cycle/i }));

    expect(await screen.findByText('Refine the release')).toBeInTheDocument();
    const saved = window.localStorage.getItem(SYSTEM_STORAGE_KEY);
    expect(saved).toContain('cycleArchives');
    expect(saved).toContain('Released the first version');
  });
});
