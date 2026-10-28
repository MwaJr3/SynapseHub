// @vitest-environment jsdom
/**
 * The quest screen, rendered for real.
 *
 * What these tests protect, and why each would fail on a plausible mistake:
 *
 * * **A quest cannot be completed by a click.** If the "Mark complete" button were
 *   enabled while the evidence was short, the screen would contradict the server,
 *   and the learner would meet a 409 for a button the interface invited.
 * * **The disabled button says why.** `aria-describedby` is asserted, not just the
 *   `disabled` attribute, because a reason that is only visible is not announced.
 * * **A retry reuses the idempotency key.** The obvious "just call it again" would
 *   mint a second key and turn a timeout into a second award.
 * * **A pause refuses the claim without punishing it.** The message must say the
 *   work still counts, because "you have done enough today" and "you failed" are
 *   not the same sentence.
 * * **The ledger explains itself.** Each award shows the factors, so "why 37?" is
 *   answerable on screen.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Guardrails, Quest, XpEntry } from './api';
import { api, ApiError } from './api';
import { QuestsPage } from './quests';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return {
    ...actual,
    api: {
      quests: vi.fn(),
      xp: vi.fn(),
      xpLedger: vi.fn(),
      acceptQuest: vi.fn(),
      completeQuest: vi.fn(),
      claimQuest: vi.fn(),
    },
  };
});

function guardrails(overrides: Partial<Guardrails> = {}): Guardrails {
  return {
    minutes_today: 18,
    minutes_limit: 120,
    xp_today: 45,
    xp_cap: 400,
    paused: false,
    capped: false,
    message: '',
    absence_penalty: false,
    ...overrides,
  };
}

function quest(overrides: Partial<Quest> = {}): Quest {
  return {
    slug: 'exception-drill',
    title: 'Exception drill',
    summary: 'Three retrieval prompts on exceptions, without re-reading first.',
    kind: 'retrieval',
    difficulty: 2,
    base_xp: 35,
    state: 'available',
    evidence: { have: 0, need: 3 },
    concept_ids: ['py.exceptions'],
    season_id: 's004',
    completed_at: null,
    claimed_at: null,
    ...overrides,
  };
}

function entry(overrides: Partial<XpEntry> = {}): XpEntry {
  return {
    id: 'xp-1',
    season_id: 's004',
    quest_id: 'quest-exception',
    xp: 42,
    kind: 'quest',
    base_xp: 35,
    factors: { difficulty: 1.15, challenge: 1.25, strategic: 1, evidence: 0.9 },
    reason: 'base 35 × difficulty 1.150 × challenge 1.250 × strategic 1.000 × evidence 0.900 = 45',
    created_at: '2026-10-27T09:00:00+00:00',
    ...overrides,
  };
}

type Options = {
  quests?: Quest[];
  guardrails?: Guardrails;
  ledger?: XpEntry[];
  total?: number;
  seasonXp?: number;
};

function wire(options: Options = {}) {
  vi.mocked(api.quests).mockResolvedValue({
    season: {
      id: 's004',
      name: 'Season 4',
      theme: 'Retrieval over recognition',
      starts_at: '2026-10-19T00:00:00+00:00',
      ends_at: '2027-01-11T00:00:00+00:00',
    },
    quests: options.quests ?? [quest()],
    guardrails: options.guardrails ?? guardrails(),
  });
  vi.mocked(api.xp).mockResolvedValue({
    total: options.total ?? 120,
    season_xp: options.seasonXp ?? 60,
    season_id: 's004',
    today: options.guardrails ?? guardrails(),
    recent: [],
  });
  vi.mocked(api.xpLedger).mockResolvedValue({ entries: options.ledger ?? [], count: (options.ledger ?? []).length });
}

beforeEach(() => {
  vi.mocked(api.quests).mockReset();
  vi.mocked(api.xp).mockReset();
  vi.mocked(api.xpLedger).mockReset();
  vi.mocked(api.acceptQuest).mockReset();
  vi.mocked(api.completeQuest).mockReset();
  vi.mocked(api.claimQuest).mockReset();
  wire();
});

afterEach(cleanup);

describe('loading, empty and failure states', () => {
  it('says it is loading before the board arrives', () => {
    vi.mocked(api.quests).mockImplementation(() => new Promise(() => {}));
    render(<QuestsPage />);
    expect(screen.getByRole('status').textContent).toContain('Loading quests');
  });

  it('shows the reason a load failed and offers a retry that works', async () => {
    vi.mocked(api.quests).mockRejectedValueOnce(new ApiError('The server is resting.', 503));
    render(<QuestsPage />);
    expect((await screen.findByRole('alert')).textContent).toContain('The server is resting.');

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Exception drill' })).toBeTruthy();
  });

  it('explains an empty catalogue without implying missing work', async () => {
    wire({ quests: [] });
    render(<QuestsPage />);
    expect(await screen.findByText('No quests are published yet')).toBeTruthy();
    expect(screen.getByText(/Nothing is missing from your record/)).toBeTruthy();
  });
});

describe('the four states of a quest', () => {
  it('offers to take an unstarted quest and posts the accept', async () => {
    vi.mocked(api.acceptQuest).mockResolvedValue({ slug: 'exception-drill', state: 'accepted' });
    render(<QuestsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Take the quest Exception drill' }));
    await waitFor(() => expect(api.acceptQuest).toHaveBeenCalledWith('exception-drill'));
  });

  it('refuses to mark a quest complete while the evidence is short, and says how short', async () => {
    wire({ quests: [quest({ state: 'accepted', evidence: { have: 1, need: 3 } })] });
    render(<QuestsPage />);
    const button = await screen.findByRole('button', { name: 'Mark Exception drill complete' });
    expect((button as HTMLButtonElement).disabled).toBe(true);

    const described = button.getAttribute('aria-describedby');
    expect(described).toBeTruthy();
    const reason = document.getElementById(described as string);
    expect(reason).not.toBeNull();
    expect(reason?.textContent).toContain('1 of 3 pieces of evidence recorded');
    expect(reason?.textContent).toContain('all 3 are in');
  });

  it('lets a completed quest be claimed and reports the award with its reason', async () => {
    wire({ quests: [quest({ state: 'completed', evidence: { have: 3, need: 3 } })] });
    vi.mocked(api.claimQuest).mockResolvedValue({
      entry: entry({ xp: 42 }),
      created: true,
      guardrails: guardrails(),
    });
    render(<QuestsPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Claim XP for Exception drill' }));
    expect(await screen.findByText('+42 XP')).toBeTruthy();
    expect(screen.getByText(/Why: base 35/)).toBeTruthy();
    const call = vi.mocked(api.claimQuest).mock.calls[0];
    expect(call).toBeTruthy();
    expect(call?.[0]).toBe('exception-drill');
    expect((call?.[1] ?? '').length).toBeGreaterThanOrEqual(8);
  });

  it('shows a claimed quest as claimed and does not offer a second claim', async () => {
    wire({
      quests: [
        quest({
          state: 'claimed',
          evidence: { have: 3, need: 3 },
          claimed_at: '2026-10-27T09:00:00+00:00',
        }),
      ],
    });
    render(<QuestsPage />);
    const card = (await screen.findByRole('heading', { name: 'Exception drill' })).closest('li') as HTMLElement;
    expect(within(card).getByText(/This quest comes back next season/)).toBeTruthy();
    expect(within(card).queryByRole('button', { name: /Claim XP/ })).toBeNull();
  });
});

describe('the guardrails', () => {
  it('states that absence carries no penalty', async () => {
    render(<QuestsPage />);
    expect(await screen.findByText(/no streak to break/)).toBeTruthy();
  });

  it('pauses the claim after a long day without taking anything away', async () => {
    const resting = guardrails({
      paused: true,
      minutes_today: 122,
      message: '122 minutes recorded today, and the day\'s limit is 120. Come back tomorrow; nothing is lost and nothing is taken away.',
    });
    wire({ quests: [quest({ state: 'completed', evidence: { have: 3, need: 3 } })], guardrails: resting });
    render(<QuestsPage />);

    const button = await screen.findByRole('button', { name: 'Claim XP for Exception drill' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    // The reason is attached to the control, so it is announced with it and does not
    // depend on noticing a colour.
    const described = button.getAttribute('aria-describedby');
    expect(described).toBeTruthy();
    expect(document.getElementById(described as string)?.textContent).toContain(
      'nothing is lost and nothing is taken away',
    );
    // The pause is shown before it is hit, not only after a refused click.
    expect(screen.getByText(/122 of 120 minutes/)).toBeTruthy();
  });
});

describe('the claim is idempotent from the browser', () => {
  it('reuses the same key when a failed claim is retried', async () => {
    wire({ quests: [quest({ state: 'completed', evidence: { have: 3, need: 3 } })] });
    vi.mocked(api.claimQuest)
      .mockRejectedValueOnce(new ApiError('The network dropped.', 502))
      .mockResolvedValueOnce({ entry: entry({ xp: 42 }), created: true, guardrails: guardrails() });
    render(<QuestsPage />);

    const button = await screen.findByRole('button', { name: 'Claim XP for Exception drill' });
    await userEvent.click(button);
    expect((await screen.findByRole('alert')).textContent).toContain('The network dropped.');

    await userEvent.click(screen.getByRole('button', { name: 'Claim XP for Exception drill' }));
    await waitFor(() => expect(api.claimQuest).toHaveBeenCalledTimes(2));

    const firstKey = vi.mocked(api.claimQuest).mock.calls[0]?.[1];
    const secondKey = vi.mocked(api.claimQuest).mock.calls[1]?.[1];
    expect(firstKey).toBeTruthy();
    expect(secondKey).toBe(firstKey);
  });

  it('reports a replay as already awarded rather than a fresh win', async () => {
    wire({ quests: [quest({ state: 'completed', evidence: { have: 3, need: 3 } })] });
    vi.mocked(api.claimQuest).mockResolvedValue({ entry: entry({ xp: 42 }), created: false, guardrails: guardrails() });
    render(<QuestsPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Claim XP for Exception drill' }));
    expect(await screen.findByText('Already awarded 42 XP')).toBeTruthy();
  });

  it('surfaces a refusal in words instead of failing silently', async () => {
    wire({ quests: [quest({ state: 'completed', evidence: { have: 3, need: 3 } })] });
    vi.mocked(api.claimQuest).mockRejectedValue(
      new ApiError('This quest has already been claimed this season.', 409),
    );
    render(<QuestsPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Claim XP for Exception drill' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('That did not go through');
    expect(alert.textContent).toContain('already been claimed this season');
  });
});

describe('the ledger', () => {
  it('records the factors behind each award', async () => {
    wire({ ledger: [entry({ xp: 42 })] });
    render(<QuestsPage />);
    expect(await screen.findByText('+42 XP')).toBeTruthy();
    expect(screen.getByText(/base 35 × difficulty 1.150/)).toBeTruthy();
  });

  it('shows a capped award as zero rather than hiding it', async () => {
    wire({
      ledger: [entry({ xp: 0, reason: 'daily cap reached; 45 XP not awarded' })],
    });
    render(<QuestsPage />);
    expect(await screen.findByText('0 XP (cap reached)')).toBeTruthy();
    expect(screen.getByText(/daily cap reached; 45 XP not awarded/)).toBeTruthy();
  });
});
