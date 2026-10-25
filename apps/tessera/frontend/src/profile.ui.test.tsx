// @vitest-environment jsdom
/**
 * The Profile screen, rendered for real.
 *
 * The point of these tests is the thing a logic test cannot see: that a supplied
 * zero and an absent score do not look the same on screen, and that a blank field
 * in the form is never sent as 0.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Assessment, Instrument, ProfileResponse } from './api';
import { api } from './api';
import { ProfilePage } from './profile';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return {
    ...actual,
    api: {
      profile: vi.fn(),
      loadBaseline: vi.fn(),
      addAssessment: vi.fn(),
      archiveAssessment: vi.fn(),
      saveProfileContext: vi.fn(),
    },
  };
});

const DIMENSIONS: Instrument = {
  id: 'icanstudy-dimensions',
  label: 'iCanStudy learning dimensions',
  value_kind: 'number',
  scale_min: 0,
  scale_max: 100,
  note: 'Five dimensions the diagnostic scores separately.',
  axes: [
    { axis: 'dimension', name: 'retrieval', label: 'Retrieval' },
    { axis: 'dimension', name: 'self_management', label: 'Self-management' },
  ],
};

const PROCESS_REFERENCE = {
  axis: 'process',
  name: 'reference',
  value: 0,
  value_label: '',
  note: 'Reported 0%.',
  scale_min: 0,
  scale_max: 100,
  instrument: 'icanstudy-processes',
  instrument_label: 'iCanStudy learning processes',
  reported_by: 'provider-report',
  administered_on: '2026-10-15',
  assessment_id: 'a1',
};

function payload(overrides: Partial<ProfileResponse> = {}): ProfileResponse {
  return {
    learner: { email: 'owner@example.test', display_name: 'Owner' },
    context: '',
    updated_at: null,
    axes: [
      { axis: 'dimension', name: 'retrieval', label: 'Retrieval', missing: true, score: null },
      { axis: 'dimension', name: 'self_management', label: 'Self-management', missing: true, score: null },
      { axis: 'process', name: 'reference', label: 'Reference', missing: false, score: PROCESS_REFERENCE },
    ],
    missing: ['Retrieval', 'Self-management'],
    assessments: [],
    instruments: [DIMENSIONS],
    caveats: ['A score that was never supplied stays missing. It is never treated as zero.'],
    ...overrides,
  };
}

const ASSESSMENT: Assessment = {
  id: 'a1',
  instrument: 'icanstudy-processes',
  instrument_label: 'iCanStudy learning processes',
  label: 'iCanStudy learning processes — supplied baseline',
  reported_by: 'provider-report',
  source_url: '',
  source_note: 'Transcribed from the supplied report.',
  administered_on: '2026-10-15',
  scale_min: 0,
  scale_max: 100,
  archived: false,
  archive_reason: '',
  created_at: '2026-10-25T09:00:00+00:00',
  scores: [{ axis: 'process', name: 'reference', value: 0, value_label: '', note: '' }],
};

beforeEach(() => {
  vi.mocked(api.profile).mockResolvedValue(payload());
  vi.mocked(api.loadBaseline).mockResolvedValue({ created: [], skipped: [] });
  vi.mocked(api.saveProfileContext).mockResolvedValue({ context: '', updated_at: '' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function renderProfile(data: ProfileResponse) {
  vi.mocked(api.profile).mockResolvedValue(data);
  render(<ProfilePage />);
  await screen.findByRole('heading', { name: 'The ten axes' });
}

describe('ProfilePage', () => {
  it('shows a supplied zero as a score and an absent one as missing', async () => {
    await renderProfile(payload({ assessments: [ASSESSMENT] }));

    const rows = screen.getAllByRole('listitem');
    const reference = rows.find((row) => within(row).queryByText('Reference'));
    expect(reference).toBeDefined();
    expect(within(reference!).getByText('0 / 100')).toBeTruthy();

    const selfManagement = rows.find((row) => within(row).queryByText('Self-management'));
    expect(within(selfManagement!).getByText('no score')).toBeTruthy();
    // The zero must not have leaked into the missing axis, or vice versa.
    expect(within(selfManagement!).queryByText('0 / 100')).toBeNull();
  });

  it('states what is missing rather than leaving a blank cell', async () => {
    await renderProfile(payload());
    expect(screen.getByText(/Not supplied:/)).toBeTruthy();
    expect(screen.getByText(/2 without a score/)).toBeTruthy();
  });

  it('carries the caveats with the numbers', async () => {
    await renderProfile(payload());
    expect(screen.getByText(/never treated as zero/)).toBeTruthy();
  });

  it('offers the supplied baseline only when nothing is recorded', async () => {
    vi.mocked(api.loadBaseline).mockResolvedValue({ created: [ASSESSMENT], skipped: [] });
    await renderProfile(payload());
    expect(screen.getByText('No assessments recorded yet')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /Load the baseline I supplied/ }));
    await waitFor(() => expect(api.loadBaseline).toHaveBeenCalledTimes(1));
    // The reload after loading re-reads the profile, which is the source of truth.
    await waitFor(() => expect(api.profile).toHaveBeenCalledTimes(2));
  });

  it('reports a failed load instead of an empty profile', async () => {
    vi.mocked(api.profile).mockRejectedValue(new Error('boom'));
    render(<ProfilePage />);
    expect(await screen.findByText('Something went wrong')).toBeTruthy();
  });

  it('sends only the fields that were filled in, and never a blank as zero', async () => {
    vi.mocked(api.addAssessment).mockResolvedValue({ ...ASSESSMENT, label: 'Recorded' });
    await renderProfile(payload());

    await userEvent.type(screen.getByLabelText('Retrieval'), '61');
    await userEvent.click(screen.getByRole('button', { name: 'Record assessment' }));

    await waitFor(() => expect(api.addAssessment).toHaveBeenCalledTimes(1));
    const body = vi.mocked(api.addAssessment).mock.calls[0]![0];
    expect(body.instrument).toBe('icanstudy-dimensions');
    expect(body.scores).toEqual([{ axis: 'dimension', name: 'retrieval', value: 61, value_label: '', note: '' }]);
  });

  it('refuses to submit an empty form with a readable reason', async () => {
    await renderProfile(payload());
    await userEvent.click(screen.getByRole('button', { name: 'Record assessment' }));
    expect(screen.getByRole('alert').textContent).toContain('at least one score');
    expect(api.addAssessment).not.toHaveBeenCalled();
  });

  it('bounds the number inputs so the browser blocks an out-of-scale value', async () => {
    await renderProfile(payload());
    const input = screen.getByLabelText('Retrieval') as HTMLInputElement;
    // The server rejects out-of-scale values too (tests/test_profile.py), but the
    // form should not need a round trip to catch the obvious case.
    expect(input.min).toBe('0');
    expect(input.max).toBe('100');
  });

  it('shows the server’s message when a write is rejected', async () => {
    const { ApiError } = await import('./api');
    // A rule the browser cannot know about: the client must not swallow it.
    vi.mocked(api.addAssessment).mockRejectedValue(
      new ApiError("Retrieval is outside this instrument's scale of 0–100", 422),
    );
    await renderProfile(payload());

    await userEvent.type(screen.getByLabelText('Retrieval'), '61');
    await userEvent.click(screen.getByRole('button', { name: 'Record assessment' }));

    expect((await screen.findByRole('alert')).textContent).toContain('outside this instrument');
  });

  it('retires an assessment with a reason and keeps it in the history', async () => {
    vi.mocked(api.archiveAssessment).mockResolvedValue({
      ...ASSESSMENT,
      archived: true,
      archive_reason: 'entered twice',
    });
    await renderProfile(payload({ assessments: [ASSESSMENT], missing: ['Retrieval', 'Self-management'] }));

    await userEvent.click(screen.getByRole('button', { name: /Retire this assessment/ }));
    await userEvent.type(screen.getByLabelText(/Why is this being retired/), 'entered twice');
    await userEvent.click(screen.getByRole('button', { name: /Retire this assessment/ }));

    await waitFor(() => expect(api.archiveAssessment).toHaveBeenCalledWith('a1', 'entered twice'));
  });
});
