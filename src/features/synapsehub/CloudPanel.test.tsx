import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { CloudPanel } from './CloudPanel';
import SynapseHubPage from './SynapseHubPage';
import { emptyWorkspace, STORAGE_KEY } from './workspace';
import { MemoryRouter } from 'react-router-dom';

const methods = vi.hoisted(() => ({
  getSession: vi.fn(async () => ({
    data: { session: { access_token: 'user-token' } },
  })),
  signInWithPassword: vi.fn(async () => ({ error: null })),
  signUp: vi.fn(async () => ({ error: null })),
  resetPasswordForEmail: vi.fn(async () => ({ error: null })),
  signOut: vi.fn(async () => ({ error: null })),
  updateUser: vi.fn(async () => ({ error: null })),
}));
vi.mock('./auth', () => ({ auth: { auth: methods } }));
const session = {
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'test@example.org',
  },
  access_token: 'user-token',
} as Session;
const renderPanel = () => {
  const onLoad = vi.fn();
  render(
    <CloudPanel
      session={session}
      workspace={emptyWorkspace()}
      onLoad={onLoad}
      recovery={false}
      onRecovered={() => {}}
    />,
  );
  return onLoad;
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
describe('authenticated cloud workflows', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  it('requires a cloud version before push and preserves state on conflict', async () => {
    const user = userEvent.setup();
    const fetcher = vi
      .mocked(fetch)
      .mockResolvedValueOnce(json({ revision: 2, workspace: emptyWorkspace() }))
      .mockResolvedValueOnce(json({ detail: 'Cloud workspace changed.' }, 409));
    const onLoad = renderPanel();
    expect(
      screen.getByRole('button', { name: 'Push local copy' }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole('button', { name: 'Check cloud version' }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Push local copy' }),
      ).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: 'Push local copy' }));
    expect(
      await screen.findByText('Cloud workspace changed.'),
    ).toBeInTheDocument();
    const init = fetcher.mock.calls[1]![1]!;
    expect(JSON.parse(init.body as string).expected_revision).toBe(2);
    expect(init.headers).toMatchObject({ Authorization: 'Bearer user-token' });
    expect(onLoad).not.toHaveBeenCalled();
  });
  it('downloads only after confirmation, and validates the payload', async () => {
    const user = userEvent.setup();
    const onLoad = renderPanel();
    vi.mocked(fetch).mockResolvedValueOnce(
      json({ revision: 4, workspace: emptyWorkspace() }),
    );
    await user.click(screen.getByRole('button', { name: 'Pull cloud copy' }));
    await waitFor(() => expect(onLoad).toHaveBeenCalledWith(emptyWorkspace()));
    vi.mocked(fetch).mockResolvedValueOnce(
      json({ revision: 5, workspace: { version: 9 } }),
    );
    await user.click(screen.getByRole('button', { name: 'Pull cloud copy' }));
    await screen.findByText(/Unsupported workspace format/);
    expect(onLoad).toHaveBeenCalledTimes(1);
  });
  it('enforces source choice and explicit inference consent in the request', async () => {
    const user = userEvent.setup();
    const id = '22222222-2222-4222-8222-222222222222';
    vi.mocked(fetch)
      .mockResolvedValueOnce(json([{ id, title: 'Lecture PDF', pages: 2 }]))
      .mockResolvedValueOnce(
        json({
          mode: 'generated',
          evidence: [],
          claims: [],
          message: 'No matching evidence in selected sources.',
        }),
      );
    renderPanel();
    await user.click(screen.getByRole('button', { name: 'Refresh library' }));
    await user.click(
      await screen.findByRole('checkbox', { name: /Lecture PDF/ }),
    );
    await user.type(screen.getByLabelText('Research question'), 'Voltage');
    expect(
      screen.getByRole('button', { name: 'Generate cited answer' }),
    ).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /Allow sending/ }));
    await user.click(
      screen.getByRole('button', { name: 'Generate cited answer' }),
    );
    await screen.findByText('No matching evidence in selected sources.');
    const init = vi.mocked(fetch).mock.calls[1]![1]!;
    expect(JSON.parse(init.body as string)).toEqual({
      question: 'Voltage',
      source_ids: [id],
      generate: true,
      consent: true,
    });
  });
  it('uses the established auth adapter and communicates email verification', async () => {
    const user = userEvent.setup();
    render(
      <CloudPanel
        session={null}
        workspace={emptyWorkspace()}
        onLoad={() => {}}
        recovery={false}
        onRecovered={() => {}}
      />,
    );
    await user.type(screen.getByLabelText('Email'), 'test@example.org');
    await user.type(screen.getByLabelText('Password'), 'not-a-real-password');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(
      await screen.findByText(/Check your email to confirm/),
    ).toBeInTheDocument();
    expect(methods.signUp).toHaveBeenCalled();
  });
  it('keeps account records separate from guest browser data', async () => {
    const guest = JSON.stringify(emptyWorkspace());
    localStorage.setItem(STORAGE_KEY, guest);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SynapseHubPage session={session} />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: /quick capture/i }));
    await user.type(screen.getByLabelText('Title'), 'Account-only task');
    await user.click(screen.getByRole('button', { name: 'Save task' }));
    expect(localStorage.getItem(STORAGE_KEY)).toBe(guest);
    expect(localStorage.getItem(`${STORAGE_KEY}.${session.user.id}`)).toContain(
      'Account-only task',
    );
  });
  it('selects cloud explicitly and requires fresh consent after switching providers', async () => {
    const user = userEvent.setup();
    const id = '22222222-2222-4222-8222-222222222222';
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        json([{ id, title: 'Cloud selection fixture', pages: 1 }]),
      )
      .mockResolvedValueOnce(
        json({
          mode: 'generated',
          evidence: [],
          claims: [],
          message: 'No matching evidence in selected sources.',
        }),
      );
    renderPanel();
    await user.click(screen.getByRole('button', { name: 'Refresh library' }));
    await user.click(
      await screen.findByRole('checkbox', { name: /Cloud selection fixture/ }),
    );
    await user.type(screen.getByLabelText('Research question'), 'Voltage');
    await user.click(screen.getByRole('checkbox', { name: /Allow sending/ }));
    await user.selectOptions(
      screen.getByLabelText('Inference provider'),
      'cloud',
    );
    expect(
      screen.getByRole('checkbox', { name: /Allow sending/ }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: 'Generate cited answer' }),
    ).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /Allow sending/ }));
    await user.click(
      screen.getByRole('button', { name: 'Generate cited answer' }),
    );
    await screen.findByText('No matching evidence in selected sources.');
    const init = vi.mocked(fetch).mock.calls[1]![1]!;
    expect(JSON.parse(init.body as string)).toMatchObject({
      provider: 'cloud',
      generate: true,
      consent: true,
    });
  });
});
