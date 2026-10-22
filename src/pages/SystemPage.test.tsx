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
});
