// @vitest-environment jsdom
/**
 * The data controls, rendered for real.
 *
 * These tests exist because of what the screen can get wrong without breaking:
 *
 * * claiming a download happened when the request failed;
 * * offering a destructive button that is disabled and silent (a keyboard user
 *   never learns what is missing);
 * * accepting a mistyped email as confirmation;
 * * reporting success before the server says so.
 *
 * Each is asserted against the rendered DOM, and the last section runs axe over
 * the same markup so a regression in labels or roles fails the build rather than
 * being noticed in a screenshot that nobody takes.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccountExport, DeletionPreview } from './api';
import { api, ApiError } from './api';
import { DataControls } from './data';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return {
    ...actual,
    api: {
      exportAccount: vi.fn(),
      deletionPreview: vi.fn(),
      deleteAccount: vi.fn(),
    },
  };
});

const preview: DeletionPreview = {
  email: 'learner@example.test',
  tables: {
    users: 1,
    session_tokens: 1,
    assessments: 2,
    reference_notes: 4,
    retrieval_attempts: 31,
    quest_progress: 1,
    consent_grants: 1,
  },
  rows: 41,
  kept: { tables: ['lessons', 'questions'], reason: 'shared curriculum, not your data' },
  statement:
    'Deleting your account removes these rows and the account itself. It cannot be undone, and a copy cannot be restored afterwards — download an export first if you might want one.',
};

const bundle: AccountExport = {
  format: 'tessera.account-export',
  version: 1,
  generated_at: '2026-10-27T21:00:00+00:00',
  account: { email: 'learner@example.test', display_name: 'Learner', created_at: '2026-01-01T00:00:00+00:00' },
  manifest: { users: 1, assessments: 2, reference_notes: 4 },
  rows: 7,
  data: { users: [], assessments: [], reference_notes: [] },
  excluded: [{ table: 'session_tokens', columns: [], reason: 'a live session token is a working key' }],
  not_yours: { tables: ['lessons'], reason: 'shared curriculum' },
};

let downloads: { name: string; body: string }[] = [];

beforeEach(() => {
  downloads = [];
  vi.mocked(api.deletionPreview).mockResolvedValue(preview);
  // jsdom has neither API; both are exercised through what the component does with
  // them rather than by opening a browser.
  URL.createObjectURL = vi.fn(() => 'blob:tessera');
  URL.revokeObjectURL = vi.fn();
  HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement) {
    downloads.push({ name: this.download, body: '' });
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function mount() {
  const onDeleted = vi.fn();
  render(<DataControls onDeleted={onDeleted} />);
  await waitFor(() => expect(screen.getByText(/records would be removed/i)).toBeTruthy());
  return { onDeleted };
}

describe('export', () => {
  it('counts what the server actually sent, and says what is left out', async () => {
    vi.mocked(api.exportAccount).mockResolvedValue(bundle);
    await mount();

    await userEvent.click(screen.getByRole('button', { name: /download my data/i }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/downloaded 7 records/i));
    expect(screen.getByRole('status').textContent).toMatch(/password and session keys are not in the file/i);
    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.name).toBe('tessera-export-2026-10-27.json');
    expect(api.exportAccount).toHaveBeenCalledTimes(1);
  });

  it('reports a failed export as a failure, not as a download', async () => {
    vi.mocked(api.exportAccount).mockRejectedValue(new ApiError('storage unavailable', 500));
    await mount();

    await userEvent.click(screen.getByRole('button', { name: /download my data/i }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('storage unavailable'));
    expect(screen.getByRole('status').textContent).toBe('');
    expect(downloads).toHaveLength(0);
  });
});

describe('delete', () => {
  it('shows the server counts and the curriculum it will keep', async () => {
    await mount();
    expect(screen.getByText('41')).toBeTruthy();
    expect(screen.getByText(/retrieval answers: 31/i)).toBeTruthy();
    expect(screen.getByText(/shared curriculum/i)).toBeTruthy();
  });

  it('does not put the destructive button in front of the learner first', async () => {
    await mount();
    expect(screen.queryByRole('button', { name: /delete my account permanently/i })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /i want to delete my account/i }));
    const destructive = screen.getByRole('button', { name: /delete my account permanently/i }) as HTMLButtonElement;
    expect(destructive.disabled).toBe(true);
    // The reason a disabled control cannot be used is written down and linked.
    const describedBy = destructive.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toMatch(/both fields above are required/i);
  });

  it('enables deletion only when the email matches and a password is typed', async () => {
    await mount();
    await userEvent.click(screen.getByRole('button', { name: /i want to delete my account/i }));

    await userEvent.type(screen.getByLabelText(/your password/i), 'correct horse battery');
    expect((screen.getByRole('button', { name: /delete my account permanently/i }) as HTMLButtonElement).disabled).toBe(true);

    await userEvent.type(screen.getByLabelText(/to confirm/i), 'learner@example.test');
    expect((screen.getByRole('button', { name: /delete my account permanently/i }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText(/this cannot be undone/i)).toBeTruthy();
  });

  it('will not accept a different email as confirmation', async () => {
    await mount();
    await userEvent.click(screen.getByRole('button', { name: /i want to delete my account/i }));
    await userEvent.type(screen.getByLabelText(/your password/i), 'correct horse battery');
    await userEvent.type(screen.getByLabelText(/to confirm/i), 'someone@else.test');

    expect((screen.getByRole('button', { name: /delete my account permanently/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('reports the server refusal and keeps the account on screen', async () => {
    vi.mocked(api.deleteAccount).mockRejectedValue(
      new ApiError('that password is not correct; nothing was deleted', 403),
    );
    const { onDeleted } = await mount();
    await userEvent.click(screen.getByRole('button', { name: /i want to delete my account/i }));
    await userEvent.type(screen.getByLabelText(/your password/i), 'wrong password');
    await userEvent.type(screen.getByLabelText(/to confirm/i), 'learner@example.test');
    await userEvent.click(screen.getByRole('button', { name: /delete my account permanently/i }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/nothing was deleted/i));
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('hands the server message to the app only after success', async () => {
    vi.mocked(api.deleteAccount).mockResolvedValue({
      deleted: true,
      rows: { users: 1 },
      total: 1,
      message: 'Your account and everything recorded under it have been erased. No copy was kept.',
    });
    const { onDeleted } = await mount();
    await userEvent.click(screen.getByRole('button', { name: /i want to delete my account/i }));
    await userEvent.type(screen.getByLabelText(/your password/i), 'correct horse battery');
    await userEvent.type(screen.getByLabelText(/to confirm/i), 'learner@example.test');
    await userEvent.click(screen.getByRole('button', { name: /delete my account permanently/i }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(onDeleted).toHaveBeenCalledWith(expect.stringContaining('No copy was kept'));
    expect(api.deleteAccount).toHaveBeenCalledWith({
      password: 'correct horse battery',
      confirm_email: 'learner@example.test',
    });
  });
});

describe('accessibility', () => {
  it('never points aria-describedby at an element that is not rendered', async () => {
    // A reference to a missing id is silently ignored by assistive technology, so
    // the description a disabled control relies on would simply vanish.
    await mount();
    for (const element of Array.from(document.querySelectorAll('[aria-describedby]'))) {
      for (const id of (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)) {
        expect(document.getElementById(id), `aria-describedby="${id}" has no target`).toBeTruthy();
      }
    }

    await userEvent.click(screen.getByRole('button', { name: /i want to delete my account/i }));
    expect(document.getElementById('delete-hint')).toBeTruthy();
  });

  it('has no axe violations with the delete form open', async () => {
    await mount();
    await userEvent.click(screen.getByRole('button', { name: /i want to delete my account/i }));

    const results = await axe.run(document.body, {
      // Contrast needs a rendered layout with real fonts; jsdom cannot compute it.
      // The colour pairs are checked statically by the repository UX engine, and
      // the note in the docs says which half is which.
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
  });
});
